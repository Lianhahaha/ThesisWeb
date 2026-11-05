import type { Paper, SearchResult } from "@/lib/types";
import { matchesQuery, passesFilters, rankResults } from "@/lib/search/rank";
import { ADAPTERS } from "@/lib/sources/registry";
import { normalizePaper } from "@/lib/sources/normalize";
import type { AdapterOptions } from "@/lib/sources/types";
import { countryTerms } from "@/lib/countries";
import { withAbortSignal } from "@/lib/server/http";
import { cacheGet, cacheSet, searchCacheKey } from "@/lib/server/redis-cache";

export interface SearchOpts extends AdapterOptions {
  /** ISO 3166-1 country name or demonym to inject into the query. e.g. "Philippines" */
  country?: string;
}

/**
 * Build a country-scoped query string.
 * Injects boolean OR terms so APIs return papers whose title/abstract mentions
 * the country, or are authored in that country.
 *
 * e.g. "supply chain" + "Philippines"
 *  → "supply chain AND (Philippines OR Filipino OR Philippine)"
 */
function buildCountryQuery(baseQuery: string, country: string): string {
  const terms = countryTerms(country);
  const clause = terms.map(t => `"${t}"`).join(" OR ");
  return `${baseQuery} AND (${clause})`;
}

/** Hard cap per source, so one slow or retrying API can't stall the whole search. */
const DEFAULT_DEADLINE_MS = 12000;

/**
 * Run one source, giving up after `ms`. Giving up also aborts the source's
 * requests and retry waits (withAbortSignal), so a source past its deadline
 * stops working instead of carrying on unseen. The race makes sure the search
 * moves on at the deadline even if an adapter is slow to notice.
 */
function withDeadline<T>(fn: () => Promise<T>, ms: number, outer?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error("source timed out")), ms);
  // The visitor left (the search page was closed or a new search started): stop too.
  const stop = () => controller.abort(new Error("search cancelled"));
  if (outer?.aborted) stop();
  outer?.addEventListener("abort", stop, { once: true });
  const timedOut = new Promise<never>((_, reject) => {
    controller.signal.addEventListener("abort", () => reject(controller.signal.reason), { once: true });
  });
  return Promise.race([withAbortSignal(controller.signal, fn), timedOut]).finally(() => {
    clearTimeout(timer);
    outer?.removeEventListener("abort", stop);
  });
}

/** One database's answer to a search. */
export interface SourceResult {
  id: string;
  status: "ok" | "error" | "empty";
  /** Checked records that pass the year and free-full-text filters. */
  papers: Paper[];
  /** Why it failed, for a source with status "error". */
  error: string;
}

/**
 * Free APIs are the bottleneck, so successful per-source answers are reused:
 * a repeated or similar search skips the network for up to six hours, even
 * while another visitor already paid for it. This is per server instance, so
 * it is a burst absorber, not a permanent database.
 */
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const CACHE_MAX = 300;
const cache = new Map<string, { at: number; result: SourceResult }>();

/**
 * Repeated failures put a source on a short cooldown instead of hitting it
 * again for every search. It is retried after five minutes and recovers on
 * the first success. This keeps a dead or rate-limited site from slowing
 * every search during finals week.
 */
const FAILURE_PAUSE_MS = 5 * 60 * 1000;
const FIRST_FAILURE_PAUSE_MS = 60 * 1000;
const failures = new Map<string, { count: number; until: number }>();

function sourceKey(id: string, q: string, opts: SearchOpts): string {
  return JSON.stringify([id, q, opts.fromYear ?? 0, opts.openAccessOnly === true, opts.perSource ?? 15]);
}

/**
 * Run every database at once, tolerating failures. `onSource` hears about
 * each one as soon as it answers, so results can be shown while slower ones
 * are still working; `signal` stops them all.
 */
export async function searchSources(
  query: string,
  opts: SearchOpts = {},
  onSource?: (result: SourceResult) => void,
  signal?: AbortSignal
): Promise<SourceResult[]> {
  // Country-scoped variants of the query, per adapter capability.
  const booleanQuery = opts.country ? buildCountryQuery(query, opts.country) : query;
  const plainQuery = opts.country ? `${query} ${opts.country}` : query;
  const wholeSearchKey = searchCacheKey([
    query,
    opts.country ?? null,
    opts.fromYear ?? 0,
    opts.openAccessOnly === true,
    opts.perSource ?? 15,
  ]);

  // A whole answer cached in Redis is shared by every server instance. The
  // per-source memory cache below still absorbs bursts on one instance.
  const cached = await cacheGet(wholeSearchKey);
  if (cached) {
    try {
      const results = JSON.parse(cached) as SourceResult[];
      if (Array.isArray(results) && results.every((r) => r && typeof r.id === "string" && Array.isArray(r.papers))) {
        for (const result of results) onSource?.(result);
        return results;
      }
    } catch {
      // Corrupt or old entry: fall through to a fresh search.
    }
  }

  const results = await Promise.all(
    Object.entries(ADAPTERS).map(async ([id, { run, boolean, deadlineMs, country }]): Promise<SourceResult> => {
      const q = country && country === opts.country ? query : boolean ? booleanQuery : plainQuery;
      const key = sourceKey(id, q, opts);

      const hit = cache.get(key);
      if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
        const result = { ...hit.result, papers: hit.result.papers };
        onSource?.(result);
        return result;
      }

      const paused = failures.get(id);
      if (paused && paused.until > Date.now()) {
        const result: SourceResult = {
          id,
          status: "error",
          papers: [],
          error: "paused after repeated failures; retrying soon",
        };
        onSource?.(result);
        return result;
      }

      let result: SourceResult;
      try {
        const raw = await withDeadline(() => run(q, opts), deadlineMs ?? DEFAULT_DEADLINE_MS, signal);
        if (!Array.isArray(raw)) throw new Error("adapter returned no list");
        // Many databases can't filter by year or free full text themselves, and
        // records that miss the topic would be dropped by the ranking anyway;
        // leaving them out here keeps the streamed answer small.
        const papers = raw
          .map((p) => normalizePaper(p, id))
          .filter((p): p is Paper => p !== null && passesFilters(p, opts) && matchesQuery(p, query));
        result = { id, status: papers.length > 0 ? "ok" : "empty", papers, error: "" };
        if (!signal?.aborted) {
          if (cache.size >= CACHE_MAX) cache.clear();
          cache.set(key, { at: Date.now(), result });
          failures.delete(id);
        }
      } catch (e) {
        const error = (e instanceof Error ? e.message : String(e)).slice(0, 120);
        // Shows up in the deployment's function logs, so a source that keeps
        // failing can be told apart from one that is only slow.
        if (!signal?.aborted) {
          console.warn(`[search] ${id} failed: ${error}`);
          const failure = failures.get(id) ?? { count: 0, until: 0 };
          failure.count += 1;
          // A first failure gets a short pause; a repeat means the source is
          // really down or rate-limited, so keep it out of the way longer.
          failure.until = Date.now() + (failure.count === 1 ? FIRST_FAILURE_PAUSE_MS : FAILURE_PAUSE_MS);
          failures.set(id, failure);
        }
        result = { id, status: "error", papers: [], error };
      }
      onSource?.(result);
      return result;
    })
  );

  if (!signal?.aborted) {
    // Errors are useful to remember for a couple of minutes (a failing source
    // stays fast), while a clean answer is good for the full six hours.
    const ttl = results.some((r) => r.status === "error") ? 120 : CACHE_TTL_MS / 1000;
    await cacheSet(wholeSearchKey, JSON.stringify(results), ttl);
  }
  return results;
}

/**
 * Run all enabled sources in parallel, tolerate individual failures,
 * dedupe + score, and return a single ranked list.
 */
export async function metaSearch(
  query: string,
  opts: SearchOpts = {}
): Promise<SearchResult> {
  const start = Date.now();
  const entries = await searchSources(query, opts);

  const status: Record<string, "ok" | "error" | "empty"> = {};
  const errors: Record<string, string> = {};
  let all: Paper[] = [];
  for (const { id, status: ok, papers, error } of entries) {
    status[id] = ok;
    if (error) errors[id] = error;
    all = all.concat(papers);
  }

  // Many databases can't filter by year or by free full text themselves, so
  // both filters are applied again to the merged list.
  const papers = rankResults(all, query, opts);
  return { papers, sources: status, errors, tookMs: Date.now() - start };
}

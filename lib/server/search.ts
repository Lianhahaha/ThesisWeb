import type { Paper, SearchResult } from "@/lib/types";
import { matchesQuery, passesFilters, rankResults } from "@/lib/search/rank";
import { ADAPTERS } from "@/lib/sources/registry";
import { normalizePaper } from "@/lib/sources/normalize";
import type { AdapterOptions } from "@/lib/sources/types";
import { countryTerms } from "@/lib/countries";
import { withAbortSignal } from "@/lib/server/http";

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

  return Promise.all(
    Object.entries(ADAPTERS).map(async ([id, { run, boolean, deadlineMs, country }]): Promise<SourceResult> => {
      let result: SourceResult;
      try {
        const q = country && country === opts.country ? query : boolean ? booleanQuery : plainQuery;
        const raw = await withDeadline(() => run(q, opts), deadlineMs ?? DEFAULT_DEADLINE_MS, signal);
        if (!Array.isArray(raw)) throw new Error("adapter returned no list");
        // Many databases can't filter by year or free full text themselves, and
        // records that miss the topic would be dropped by the ranking anyway;
        // leaving them out here keeps the streamed answer small.
        const papers = raw
          .map((p) => normalizePaper(p, id))
          .filter((p): p is Paper => p !== null && passesFilters(p, opts) && matchesQuery(p, query));
        result = { id, status: papers.length > 0 ? "ok" : "empty", papers, error: "" };
      } catch (e) {
        const error = (e instanceof Error ? e.message : String(e)).slice(0, 120);
        // Shows up in the deployment's function logs, so a source that keeps
        // failing can be told apart from one that is only slow.
        if (!signal?.aborted) console.warn(`[search] ${id} failed: ${error}`);
        result = { id, status: "error", papers: [], error };
      }
      onSource?.(result);
      return result;
    })
  );
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

import type { Paper, SearchResult } from "@/lib/types";
import { dedupePapers, scoreRelevance } from "@/lib/server/dedupe";
import { ADAPTERS } from "@/lib/sources/registry";
import { normalizePaper } from "@/lib/sources/normalize";
import type { AdapterOptions } from "@/lib/sources/types";

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
 *
 * We keep a demonym map for countries where the adjective differs from the noun.
 */
const DEMONYM_MAP: Record<string, string[]> = {
  "Philippines":    ["Philippines", "Filipino", "Philippine", "Filipina"],
  "United States":  ["United States", "American", "USA", "U.S.A", "U.S."],
  "United Kingdom": ["United Kingdom", "British", "UK", "England", "Wales", "Scotland"],
  "Australia":      ["Australia", "Australian"],
  "Canada":         ["Canada", "Canadian"],
  "Japan":          ["Japan", "Japanese"],
  "China":          ["China", "Chinese"],
  "India":          ["India", "Indian"],
  "Germany":        ["Germany", "German"],
  "France":         ["France", "French"],
  "Brazil":         ["Brazil", "Brazilian"],
  "South Korea":    ["South Korea", "Korean", "Korea"],
  "Indonesia":      ["Indonesia", "Indonesian"],
  "Malaysia":       ["Malaysia", "Malaysian"],
  "Singapore":      ["Singapore", "Singaporean"],
  "Thailand":       ["Thailand", "Thai"],
  "Vietnam":        ["Vietnam", "Vietnamese"],
  "Nigeria":        ["Nigeria", "Nigerian"],
  "South Africa":   ["South Africa", "South African"],
  "Pakistan":       ["Pakistan", "Pakistani"],
  "Bangladesh":     ["Bangladesh", "Bangladeshi"],
  "Egypt":          ["Egypt", "Egyptian"],
  "Kenya":          ["Kenya", "Kenyan"],
  "Mexico":         ["Mexico", "Mexican"],
  "Argentina":      ["Argentina", "Argentine"],
  "Netherlands":    ["Netherlands", "Dutch"],
  "Sweden":         ["Sweden", "Swedish"],
  "Norway":         ["Norway", "Norwegian"],
  "Switzerland":    ["Switzerland", "Swiss"],
  "Spain":          ["Spain", "Spanish"],
  "Italy":          ["Italy", "Italian"],
  "Poland":         ["Poland", "Polish"],
  "Turkey":         ["Turkey", "Turkish"],
  "Iran":           ["Iran", "Iranian"],
  "Saudi Arabia":   ["Saudi Arabia", "Saudi"],
  "Israel":         ["Israel", "Israeli"],
  "New Zealand":    ["New Zealand", "New Zealander"],
};

function buildCountryQuery(baseQuery: string, country: string): string {
  const terms = DEMONYM_MAP[country] ?? [country];
  const clause = terms.map(t => `"${t}"`).join(" OR ");
  return `${baseQuery} AND (${clause})`;
}

/** Hard cap per source, so one slow or retrying API can't stall the whole search. */
const DEFAULT_DEADLINE_MS = 12000;

function withDeadline<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("source timed out")), ms);
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(timer));
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

  // Country-scoped variants of the query, per adapter capability.
  const booleanQuery = opts.country ? buildCountryQuery(query, opts.country) : query;
  const plainQuery = opts.country ? `${query} ${opts.country}` : query;

  const entries = await Promise.all(
    Object.entries(ADAPTERS).map(async ([id, { run, boolean, deadlineMs, country }]) => {
      try {
        const q = country && country === opts.country ? query : boolean ? booleanQuery : plainQuery;
        const raw = await withDeadline(run(q, opts), deadlineMs ?? DEFAULT_DEADLINE_MS);
        if (!Array.isArray(raw)) throw new Error("adapter returned no list");
        const papers = raw.map((p) => normalizePaper(p, id)).filter((p): p is Paper => p !== null);
        return [id, { ok: papers.length > 0 ? ("ok" as const) : ("empty" as const), papers, error: "" }] as const;
      } catch (e) {
        const error = (e instanceof Error ? e.message : String(e)).slice(0, 120);
        // Shows up in the deployment's function logs, so a source that keeps
        // failing can be told apart from one that is only slow.
        console.warn(`[search] ${id} failed: ${error}`);
        return [id, { ok: "error" as const, papers: [] as Paper[], error }] as const;
      }
    })
  );

  const status: Record<string, "ok" | "error" | "empty"> = {};
  const errors: Record<string, string> = {};
  let all: Paper[] = [];
  for (const [name, { ok, papers, error }] of entries) {
    status[name] = ok;
    if (error) errors[name] = error;
    all = all.concat(papers);
  }

  let deduped = dedupePapers(all);

  // Many databases can't filter by year or by free full text themselves, so
  // both filters are applied again to the merged list.
  if (opts.fromYear && opts.fromYear > 0) {
    deduped = deduped.filter((p) => !p.year || p.year >= opts.fromYear!);
  }
  if (opts.openAccessOnly) {
    deduped = deduped.filter((p) => p.isOpenAccess);
  }

  // Score relevance against the *original* user query (not the country-injected one)
  const papers = scoreRelevance(deduped, query);
  return { papers, sources: status, errors, tookMs: Date.now() - start };
}

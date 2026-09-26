import type { Paper, SearchResult } from "@/lib/types";
import { searchOpenAlex } from "@/lib/sources/openalex";
import { searchCrossref } from "@/lib/sources/crossref";
import { searchSemanticScholar } from "@/lib/sources/semanticscholar";
import { searchDoaj } from "@/lib/sources/doaj";
import { searchEuropePMC } from "@/lib/sources/europepmc";
import { searchPubMed } from "@/lib/sources/pubmed";
import { searchArxiv } from "@/lib/sources/arxiv";
import { searchCore } from "@/lib/sources/core";
import { searchBase } from "@/lib/sources/base";
import { searchGoogleScholar } from "@/lib/sources/googlescholar";
import { searchEric } from "@/lib/sources/eric";
import { searchZenodo } from "@/lib/sources/zenodo";
import { searchHal } from "@/lib/sources/hal";
import { searchOpenAire } from "@/lib/sources/openaire";
import { searchInspire } from "@/lib/sources/inspire";
import { searchPlos } from "@/lib/sources/plos";
import { searchDataCite } from "@/lib/sources/datacite";
import { searchOapen } from "@/lib/sources/oapen";
import { searchFigshare } from "@/lib/sources/figshare";
import { dedupePapers, scoreRelevance } from "@/lib/dedupe";

export interface SearchOpts {
  fromYear?: number;
  perSource?: number;
  openAccessOnly?: boolean;
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

/**
 * Extract just the base query without country clause, for adapters that
 * don't support boolean AND/OR (e.g. CORE). Returns the original query
 * unchanged if no country clause is present.
 */
export function stripCountryClause(query: string): string {
  return query.replace(/\s+AND\s+\([^)]+\)/i, "").trim();
}

type SourceSearch = (query: string, opts: SearchOpts) => Promise<Paper[]>;

/**
 * Every search source. `boolean: true` means the API understands
 * `AND (a OR b)` clauses (used for country scoping); the others get the plain
 * query with the country name appended as an extra term instead.
 *
 * Keep ids in sync with lib/sources/meta.ts.
 */
const ADAPTERS: { id: string; run: SourceSearch; boolean: boolean; deadlineMs?: number }[] = [
  { id: "openalex",        run: searchOpenAlex,        boolean: true },
  { id: "crossref",        run: searchCrossref,        boolean: true },
  // Retries through 429s from its shared public pool, so it needs extra room.
  { id: "semanticscholar", run: searchSemanticScholar, boolean: true, deadlineMs: 16000 },
  { id: "doaj",            run: searchDoaj,            boolean: true },
  { id: "europepmc",       run: searchEuropePMC,       boolean: true },
  { id: "pubmed",          run: searchPubMed,          boolean: true },
  { id: "arxiv",           run: searchArxiv,           boolean: true },
  { id: "core",            run: searchCore,            boolean: true },
  { id: "base",            run: searchBase,            boolean: true },
  // Scraped and frequently blocked, so it only gets a short window.
  { id: "google_scholar",  run: searchGoogleScholar,   boolean: true, deadlineMs: 6000 },
  { id: "eric",             run: searchEric,             boolean: false },
  { id: "zenodo",           run: searchZenodo,           boolean: false },
  { id: "hal",              run: searchHal,              boolean: false },
  { id: "openaire",         run: searchOpenAire,         boolean: false },
  { id: "inspire",          run: searchInspire,          boolean: false },
  { id: "plos",             run: searchPlos,             boolean: false },
  { id: "datacite",         run: searchDataCite,         boolean: false },
  { id: "oapen",            run: searchOapen,            boolean: false },
  // Search + per-item detail fetches, so it needs more room than the default.
  { id: "figshare",         run: searchFigshare,         boolean: false, deadlineMs: 15000 },
];

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
    ADAPTERS.map(async ({ id, run, boolean, deadlineMs }) => {
      try {
        const papers = await withDeadline(run(boolean ? booleanQuery : plainQuery, opts), deadlineMs ?? DEFAULT_DEADLINE_MS);
        return [id, { ok: papers.length > 0 ? ("ok" as const) : ("empty" as const), papers }] as const;
      } catch {
        return [id, { ok: "error" as const, papers: [] as Paper[] }] as const;
      }
    })
  );

  const status: Record<string, "ok" | "error" | "empty"> = {};
  let all: Paper[] = [];
  for (const [name, { ok, papers }] of entries) {
    status[name] = ok;
    all = all.concat(papers);
  }

  let deduped = dedupePapers(all);

  // Client-side year filter safety net: APIs sometimes return out-of-range results
  if (opts.fromYear && opts.fromYear > 0) {
    deduped = deduped.filter((p) => !p.year || p.year >= opts.fromYear!);
  }

  // Score relevance against the *original* user query (not the country-injected one)
  const papers = scoreRelevance(deduped, query);
  return { papers, sources: status, tookMs: Date.now() - start };
}

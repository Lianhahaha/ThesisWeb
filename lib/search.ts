import type { Paper, SearchResult } from "@/lib/types";
import { searchOpenAlex } from "@/lib/sources/openalex";
import { searchCrossref } from "@/lib/sources/crossref";
import { searchSemanticScholar } from "@/lib/sources/semanticscholar";
import { searchDoaj } from "@/lib/sources/doaj";
import { searchEuropePMC } from "@/lib/sources/europepmc";
import { searchPubMed } from "@/lib/sources/pubmed";
import { searchArxiv } from "@/lib/sources/arxiv";
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
 * Run all enabled sources in parallel, tolerate individual failures,
 * dedupe + score, and return a single ranked list.
 */
export async function metaSearch(
  query: string,
  opts: SearchOpts = {}
): Promise<SearchResult> {
  const start = Date.now();

  // Apply country scoping to the query string before sending to all adapters
  const effectiveQuery = opts.country
    ? buildCountryQuery(query, opts.country)
    : query;

  // Each adapter receives the country-scoped query
  const sources: Record<string, Promise<Paper[]>> = {
    openalex:        searchOpenAlex(effectiveQuery, opts),
    crossref:        searchCrossref(effectiveQuery, opts),
    semanticscholar: searchSemanticScholar(effectiveQuery, opts),
    doaj:            searchDoaj(effectiveQuery, opts),
    europepmc:       searchEuropePMC(effectiveQuery, opts),
    pubmed:          searchPubMed(effectiveQuery, opts),
    arxiv:           searchArxiv(effectiveQuery, opts),
  };

  const entries = await Promise.all(
    Object.entries(sources).map(async ([name, p]) => {
      try {
        const r = await p;
        return [name, { ok: r.length > 0 ? "ok" : "empty" as const, papers: r }] as const;
      } catch {
        return [name, { ok: "error" as const, papers: [] }] as const;
      }
    })
  );

  const status: Record<string, "ok" | "error" | "empty"> = {};
  let all: Paper[] = [];
  for (const [name, { ok, papers }] of entries) {
    status[name] = ok;
    all = all.concat(papers);
  }

  // Score relevance against the *original* user query (not the country-injected one)
  const papers = scoreRelevance(dedupePapers(all), query);
  return { papers, sources: status, tookMs: Date.now() - start };
}

import type { Paper } from "@/lib/types";
import { SOURCE_META } from "@/lib/sources/meta";
import { looksLocal } from "@/lib/countries";

/**
 * Client-side views over an already-fetched result list: re-sorting and
 * narrowing by source without another round-trip to the databases.
 */

export type SortKey = "relevance" | "citations" | "newest" | "oldest";

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "relevance", label: "Best match" },
  { key: "citations", label: "Most cited" },
  { key: "newest", label: "Newest first" },
  { key: "oldest", label: "Oldest first" },
];

/** Papers without a year sort last in both date orders, never first. */
function byYear(a: Paper, b: Paper, dir: 1 | -1): number {
  if (a.year == null && b.year == null) return 0;
  if (a.year == null) return 1;
  if (b.year == null) return -1;
  return (a.year - b.year) * dir;
}

/** Returns a new array; the input (and the ranking it carries) is left untouched. */
export function sortPapers(papers: Paper[], key: SortKey): Paper[] {
  const list = papers.slice();
  switch (key) {
    case "citations":
      return list.sort(
        (a, b) => (b.citedByCount ?? 0) - (a.citedByCount ?? 0) || (b.relevance ?? 0) - (a.relevance ?? 0)
      );
    case "newest":
      return list.sort((a, b) => byYear(a, b, -1) || (b.relevance ?? 0) - (a.relevance ?? 0));
    case "oldest":
      return list.sort((a, b) => byYear(a, b, 1) || (b.relevance ?? 0) - (a.relevance ?? 0));
    default:
      return list.sort((a, b) => (b.relevance ?? 0) - (a.relevance ?? 0));
  }
}

/** Keep papers found by at least one of the selected sources. Empty set = no filter. */
export function filterBySources(papers: Paper[], selected: ReadonlySet<string>): Paper[] {
  if (selected.size === 0) return papers;
  return papers.filter((p) => p.sources.some((s) => selected.has(s)));
}

/** Record types a student can narrow to. */
export type RecordType = "journal" | "thesis" | "report" | "book" | "preprint";

export const RECORD_TYPES: { key: RecordType; label: string }[] = [
  { key: "journal", label: "Journal articles" },
  { key: "thesis", label: "Theses" },
  { key: "report", label: "Reports" },
  { key: "book", label: "Books" },
  { key: "preprint", label: "Preprints" },
];

/** Citation floors offered in the filter. */
export const MIN_CITATIONS = [0, 1, 10, 50, 100];

/**
 * What a paper is, as far as its databases and venue say. A paper can be
 * more than one (a thesis in a repository that is also a report series);
 * an index-only record with no venue hint has none, and is hidden only
 * while a type is selected.
 */
export function recordTypes(p: Paper): Set<RecordType> {
  const kinds = new Set(p.sources.map((s) => SOURCE_META[s]?.kind));
  const venue = p.venue ?? "";
  const out = new Set<RecordType>();
  if (p.preprint === true || kinds.has("preprints")) out.add("preprint");
  if (p.preprint === false || kinds.has("journals")) out.add("journal");
  if (kinds.has("theses") || /thesis|dissertation/i.test(venue)) out.add("thesis");
  if (kinds.has("reports") || /\breport|working paper|discussion paper|policy (?:note|brief)/i.test(venue)) out.add("report");
  if (kinds.has("books") || /^book/i.test(venue)) out.add("book");
  return out;
}

export interface Refinement {
  /** Keep papers of any of these types; empty = all. */
  types: ReadonlySet<RecordType>;
  /** Keep only papers from or about this country. */
  localTo: string | null;
  minCitations: number;
}

export const NO_REFINEMENT: Refinement = { types: new Set(), localTo: null, minCitations: 0 };

/** Narrow a result list by record type, country and citations. */
export function refine(papers: Paper[], r: Refinement): Paper[] {
  return papers.filter((p) => {
    if (r.types.size > 0) {
      const t = recordTypes(p);
      if (![...r.types].some((x) => t.has(x))) return false;
    }
    if (r.localTo && !looksLocal(p, r.localTo)) return false;
    if (r.minCitations > 0 && (p.citedByCount ?? 0) < r.minCitations) return false;
    return true;
  });
}

/** How many of the given papers each source contributed to (a paper can count for several). */
export function countBySource(papers: Paper[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const p of papers) for (const s of p.sources) counts[s] = (counts[s] ?? 0) + 1;
  return counts;
}

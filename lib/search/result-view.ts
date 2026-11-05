import type { Paper, WorkType } from "@/lib/types";
import { SOURCE_META } from "@/lib/sources/meta";
import { looksLocal } from "@/lib/countries";

/**
 * Client-side views over an already-fetched result list: re-sorting and
 * narrowing by source without another round-trip to the databases.
 */

export type SortKey = "relevance" | "quality" | "citations" | "newest" | "oldest";

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "relevance", label: "Best match" },
  { key: "quality", label: "Quality signals" },
  { key: "citations", label: "Most cited" },
  { key: "newest", label: "Newest first" },
  { key: "oldest", label: "Oldest first" },
];

/** How much each stated record type counts as an evidence signal. */
const TYPE_SIGNAL: Record<WorkType, number> = {
  article: 6,
  conference: 5,
  book: 4,
  chapter: 4,
  thesis: 3,
  report: 2,
  other: 1,
  preprint: -4,
};

/**
 * A transparent heuristic for "Quality signals", not a judgment of research
 * quality: peer-reviewed journal records rank above preprints, citations help,
 * and retractions or expressions of concern sink to the bottom.
 */
export function qualityScore(p: Paper): number {
  let score = TYPE_SIGNAL[p.type ?? "other"] ?? 1;
  if (p.preprint === true) score -= 4;
  if (p.retracted) score -= 100;
  if (p.concern) score -= 40;
  // Logarithmic so one highly cited outlier does not dominate the list.
  score += Math.min(6, Math.log10(1 + Math.max(0, p.citedByCount ?? 0)) * 2);
  return score;
}

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
    case "quality":
      return list.sort(
        (a, b) =>
          qualityScore(b) - qualityScore(a) ||
          (b.citedByCount ?? 0) - (a.citedByCount ?? 0) ||
          (b.relevance ?? 0) - (a.relevance ?? 0)
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

/** A record's stated type, as the filter's types; conference papers and "other" match none. */
const FROM_WORK_TYPE: Partial<Record<WorkType, RecordType>> = {
  article: "journal",
  thesis: "thesis",
  report: "report",
  book: "book",
  chapter: "book",
  preprint: "preprint",
};

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
  // What the source itself says the record is.
  const stated = p.type ? FROM_WORK_TYPE[p.type] : undefined;
  if (stated) out.add(stated);
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
  /** Hide retracted papers and expressions of concern. */
  hideRetracted: boolean;
  /** Hide records explicitly marked as preprints. */
  peerReviewedOnly: boolean;
}

export const NO_REFINEMENT: Refinement = {
  types: new Set(),
  localTo: null,
  minCitations: 0,
  hideRetracted: false,
  peerReviewedOnly: false,
};

/** True if any refinement is set. */
export const isRefined = (r: Refinement) =>
  r.types.size > 0 || r.localTo !== null || r.minCitations > 0 || r.hideRetracted || r.peerReviewedOnly;

/** A record is treated as peer-reviewed unless a source explicitly says it is a preprint. */
export function isPeerReviewed(p: Paper): boolean {
  if (p.preprint === true) return false;
  const types = recordTypes(p);
  return !(types.has("preprint") && !types.has("journal"));
}

/** Narrow a result list by record type, country, citations and integrity. */
export function refine(papers: Paper[], r: Refinement): Paper[] {
  return papers.filter((p) => {
    if (r.types.size > 0) {
      const t = recordTypes(p);
      if (![...r.types].some((x) => t.has(x))) return false;
    }
    if (r.localTo && !looksLocal(p, r.localTo)) return false;
    if (r.minCitations > 0 && (p.citedByCount ?? 0) < r.minCitations) return false;
    if (r.hideRetracted && (p.retracted === true || p.concern === true)) return false;
    if (r.peerReviewedOnly && !isPeerReviewed(p)) return false;
    return true;
  });
}

/** How many of the given papers each source contributed to (a paper can count for several). */
export function countBySource(papers: Paper[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const p of papers) for (const s of p.sources) counts[s] = (counts[s] ?? 0) + 1;
  return counts;
}

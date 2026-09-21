import type { Paper } from "@/lib/types";

/**
 * Client-side views over an already-fetched result list: re-sorting and
 * narrowing by source without another round-trip to the 18 APIs.
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

/** How many of the given papers each source contributed to (a paper can count for several). */
export function countBySource(papers: Paper[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const p of papers) for (const s of p.sources) counts[s] = (counts[s] ?? 0) + 1;
  return counts;
}

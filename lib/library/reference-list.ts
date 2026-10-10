import type { SavedPaper } from "@/lib/types";
import { SCOPE_LABELS, type Scope } from "@/lib/library/scope";

/** One part of a reference list: a heading (or none) and its papers in order. */
export interface RefGroup {
  heading: string | null;
  papers: SavedPaper[];
}

/**
 * Reference-list order: by first author's surname. Names are stored
 * "Given Family", so compare the last word. Author-less papers sort last.
 */
export function sortBySurname(papers: SavedPaper[]): SavedPaper[] {
  const surname = (p: SavedPaper) => p.authors?.[0]?.trim().split(/\s+/).pop() || "";
  return [...papers].sort((a, b) => {
    const sa = surname(a);
    const sb = surname(b);
    if (!sa || !sb) return sa ? -1 : sb ? 1 : 0;
    return sa.localeCompare(sb, undefined, { sensitivity: "base" });
  });
}

/**
 * The reference list as groups: one unheaded group, or Local then Foreign
 * when `scopeOf` is given (the usual split of a Philippine RRL). Empty groups
 * are left out.
 */
export function groupReferences(papers: SavedPaper[], scopeOf?: (p: SavedPaper) => Scope): RefGroup[] {
  const sorted = sortBySurname(papers);
  if (!scopeOf) return [{ heading: null, papers: sorted }];
  return (["local", "foreign"] as Scope[])
    .map((s) => ({ heading: SCOPE_LABELS[s], papers: sorted.filter((p) => scopeOf(p) === s) }))
    .filter((g) => g.papers.length > 0);
}

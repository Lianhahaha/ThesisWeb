import { MATRIX_KEYS, type SavedPaper } from "@/lib/types";

const isBlank = (v: unknown) => v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);

/** Both notes when they differ, so neither copy's text is lost. */
function joinNotes(kept?: string, incoming?: string): string | undefined {
  if (!kept) return incoming || undefined;
  if (!incoming || kept.includes(incoming)) return kept;
  if (incoming.includes(kept)) return incoming;
  return `${kept}\n\n${incoming}`;
}

/**
 * One record from two copies of the same saved paper, losing nothing the
 * student typed. `kept` is the copy whose edits win: the one already saved,
 * or the account's copy when papers move in from this browser. `incoming` (a
 * fresh search result, a backup, the browser copy) fills what `kept` lacks
 * and refreshes the bibliographic fields, but only with non-empty values, so
 * a missing link never erases one found earlier.
 *
 * Notes that differ are both kept; matrix cells merge cell by cell; tags are
 * the union; collection, reading status and date saved come from `kept`.
 */
export function mergeSavedPaper(kept: SavedPaper | undefined, incoming: SavedPaper): SavedPaper {
  if (!kept) return incoming;
  const fresh = Object.fromEntries(Object.entries(incoming).filter(([, v]) => !isBlank(v)));
  const matrix: SavedPaper["matrix"] = {};
  for (const key of MATRIX_KEYS) {
    const cell = kept.matrix?.[key] || incoming.matrix?.[key];
    if (cell) matrix[key] = cell;
  }
  return {
    ...kept,
    ...fresh,
    id: kept.id,
    // A shorter author list (a file that lists only the first author) never trims a fuller one.
    authors: (incoming.authors?.length ?? 0) >= (kept.authors?.length ?? 0) ? incoming.authors : kept.authors,
    notes: joinNotes(kept.notes, incoming.notes),
    matrix: Object.keys(matrix).length ? matrix : undefined,
    collection: kept.collection || incoming.collection || undefined,
    scope: kept.scope ?? incoming.scope,
    tags: Array.from(new Set([...(kept.tags ?? []), ...(incoming.tags ?? [])])),
    readingStatus: kept.readingStatus ?? incoming.readingStatus,
    savedAt: Math.min(kept.savedAt ?? Infinity, incoming.savedAt ?? Infinity),
    // A warning or a free copy found by either copy stays.
    retracted: kept.retracted || incoming.retracted || undefined,
    concern: kept.concern || incoming.concern || undefined,
    isOpenAccess: kept.isOpenAccess === true || incoming.isOpenAccess === true,
  };
}

import type { SavedPaper } from "@/lib/types";

/**
 * Library change events live apart from the store so components that only need
 * to listen (e.g. the header) don't pull Firebase into the root bundle.
 */

/** Fired after any library change so counters (e.g. the header) can refresh. */
export const LIBRARY_EVENT = "tw:library";
export interface LibraryChange {
  removed?: string;
  local?: boolean;
}

/** Fired after updatePaper, with { id, changes }, so in-memory copies can patch themselves. */
export const PAPER_UPDATED_EVENT = "tw:paper-updated";
export interface PaperUpdate {
  id: string;
  changes: Partial<SavedPaper>;
}

"use client";

import type { SearchInput } from "@/lib/search/params";
import { MAX_RESULTS } from "@/lib/search/params";

/**
 * Saved searches, kept in this browser (localStorage). A student pins a
 * search; each time they run it again, papers they have not seen in it before
 * are marked "New". Nothing runs in the background: the check happens when
 * the search is opened, so it costs no extra requests.
 *
 * Storage can be blocked (private mode, quota), so every access is guarded;
 * a failure only means the search isn't remembered.
 */

export interface SavedSearch {
  /** Identity of the search: same words and filters, same key. */
  key: string;
  input: SearchInput;
  savedAt: number;
  /** When it was last opened; papers new since then are marked. */
  checkedAt: number;
  /** Ids of papers already shown for this search. */
  seen: string[];
}

/** Fired after the list changes, so every form showing it can refresh. */
export const SAVED_SEARCHES_EVENT = "tw:saved-searches";

const KEY = "tw-saved-searches";
const MAX_SAVED = 20;
/** Seen ids kept per search: two full result sets, so papers that drop out and come back aren't "new". */
const MAX_SEEN = MAX_RESULTS * 2;

/** The same words (any case or spacing) with the same filters are the same search. */
export function savedSearchKey(input: SearchInput): string {
  const q = input.query.trim().replace(/\s+/g, " ").toLowerCase();
  return [q, input.fromYear, input.openAccessOnly ? 1 : 0, input.country ?? ""].join("|");
}

/** Ids in `current` that are not in `seen`, in result order. */
export function newIds(seen: readonly string[], current: readonly string[]): string[] {
  const known = new Set(seen);
  return current.filter((id) => !known.has(id));
}

function read(): SavedSearch[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s): s is SavedSearch =>
        !!s && typeof s.key === "string" && typeof s.input?.query === "string" && Array.isArray(s.seen)
    );
  } catch {
    return [];
  }
}

function write(list: SavedSearch[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Quota exceeded or storage blocked: saved searches are a convenience.
  }
  window.dispatchEvent(new Event(SAVED_SEARCHES_EVENT));
}

export function listSavedSearches(): SavedSearch[] {
  if (typeof window === "undefined") return [];
  return read();
}

export function isSearchSaved(input: SearchInput): boolean {
  const key = savedSearchKey(input);
  return listSavedSearches().some((s) => s.key === key);
}

/** Pin a search; the papers on screen now count as seen. */
export function saveSearch(input: SearchInput, paperIds: string[], now = Date.now()): void {
  const key = savedSearchKey(input);
  const rest = read().filter((s) => s.key !== key);
  const entry: SavedSearch = { key, input, savedAt: now, checkedAt: now, seen: paperIds.slice(0, MAX_SEEN) };
  write([entry, ...rest].slice(0, MAX_SAVED));
}

export function removeSavedSearch(key: string): void {
  write(read().filter((s) => s.key !== key));
}

/**
 * Record that a saved search was run again. Returns the papers new since the
 * last time and when that was, or null if the search isn't saved.
 */
export function checkSavedSearch(
  input: SearchInput,
  paperIds: string[],
  now = Date.now()
): { fresh: string[]; since: number } | null {
  const key = savedSearchKey(input);
  const list = read();
  const entry = list.find((s) => s.key === key);
  if (!entry) return null;
  const fresh = newIds(entry.seen, paperIds);
  const since = entry.checkedAt;
  const current = new Set(paperIds);
  entry.seen = [...paperIds, ...entry.seen.filter((id) => !current.has(id))].slice(0, MAX_SEEN);
  entry.checkedAt = now;
  write(list);
  return { fresh, since };
}

"use client";

/**
 * Recent searches, kept in this browser only (localStorage). Lets a student get
 * back to yesterday's topic in one click. Storage can be unavailable (private
 * mode, quota, blocked), so every access is guarded and failures are silent.
 */

const KEY = "tw-search-history";
const MAX = 8;

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function write(list: string[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Quota exceeded or storage disabled — history is a convenience, not essential.
  }
}

export function getSearchHistory(): string[] {
  if (typeof window === "undefined") return [];
  return read();
}

/** Record a search (most recent first, case-insensitive dedupe). Returns the new list. */
export function addSearchHistory(query: string): string[] {
  const q = query.trim().replace(/\s+/g, " ");
  if (!q) return getSearchHistory();
  const next = [q, ...read().filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, MAX);
  write(next);
  return next;
}

export function clearSearchHistory(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

"use client";

import type { Paper } from "@/lib/types";

/**
 * Ephemeral store for papers the user has just seen in search results.
 *
 * Problem this solves: the /paper/[id] page reads from IndexedDB (the saved
 * library), but a freshly-clicked search result isn't saved yet. We stash the
 * current search-result set here so the detail page can render a paper the
 * user clicked without forcing them to save it first.
 *
 * Uses sessionStorage: survives client-side navigation (which is all we need),
 * clears when the tab closes. Capped to keep memory small.
 */

const KEY = "tw-recent-papers";
const MAX = 60;

export function storeRecentPapers(papers: Paper[]): void {
  if (typeof window === "undefined" || papers.length === 0) return;
  try {
    const map: Record<string, Paper> = {};
    // Newest first — keep only the most recent MAX.
    for (const p of papers.slice(0, MAX)) map[p.id] = p;
    sessionStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    // Quota exceeded or disabled storage — non-fatal.
  }
}

/**
 * Add papers to the ephemeral store without discarding what is already there
 * (storeRecentPapers replaces it). Used when more papers are shown outside a
 * search, e.g. the related-papers list, so their detail pages still resolve.
 */
export function mergeRecentPapers(papers: Paper[]): void {
  if (typeof window === "undefined" || papers.length === 0) return;
  try {
    const raw = sessionStorage.getItem(KEY);
    const map: Record<string, Paper> = raw ? JSON.parse(raw) : {};
    // Re-insert so the papers just seen are the newest when trimming to MAX.
    for (const p of papers) {
      delete map[p.id];
      map[p.id] = p;
    }
    const keys = Object.keys(map);
    for (const k of keys.slice(0, Math.max(0, keys.length - MAX * 3))) delete map[k];
    sessionStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    // Quota exceeded, disabled storage or corrupt JSON — non-fatal.
  }
}

export function getRecentPaper(id: string): Paper | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, Paper>;
    return map[id] ?? null;
  } catch {
    return null;
  }
}

"use client";

import type { Paper } from "@/lib/types";
import { MAX_RESULTS } from "@/lib/search-params";

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
/**
 * Must cover a whole result set: any result past the cap can be listed but
 * not opened.
 */
const MAX = MAX_RESULTS;
/** Abstract length kept when the full set doesn't fit in sessionStorage (about 5 MB). */
const SHORT_ABSTRACT = 1500;

/** Write the map; if it is over the storage quota, try again with shorter abstracts. */
function write(map: Record<string, Paper>): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    const short: Record<string, Paper> = {};
    for (const [id, p] of Object.entries(map)) {
      short[id] = p.abstract && p.abstract.length > SHORT_ABSTRACT ? { ...p, abstract: p.abstract.slice(0, SHORT_ABSTRACT) + "…" } : p;
    }
    sessionStorage.setItem(KEY, JSON.stringify(short));
  }
}

export function storeRecentPapers(papers: Paper[]): void {
  if (typeof window === "undefined" || papers.length === 0) return;
  try {
    const map: Record<string, Paper> = {};
    // Newest first — keep only the most recent MAX.
    for (const p of papers.slice(0, MAX)) map[p.id] = p;
    write(map);
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
    for (const k of keys.slice(0, Math.max(0, keys.length - MAX - 100))) delete map[k];
    write(map);
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

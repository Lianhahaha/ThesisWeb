"use client";

import type { SearchResult } from "@/lib/types";
import { getRecentPaper } from "@/lib/search/recent-papers";

/**
 * The last search's results, for this tab (sessionStorage). Going back to the
 * results from a paper used to run the whole search again, 10 to 15 seconds
 * across every database; now the same search, opened again within half an
 * hour, shows at once. The papers themselves are already kept by
 * recent-papers.ts for the paper pages, so only their order and the source
 * statuses are stored here. Storage can be blocked, so every access is
 * guarded; a failure only means the search runs again.
 */

const KEY = "tw-last-search";
/** After this, a search runs again: databases add papers and fix records. */
const TTL_MS = 30 * 60 * 1000;

interface LastSearch {
  /** The search's query string (buildSearchParams), its identity. */
  qs: string;
  at: number;
  ids: string[];
  sources: SearchResult["sources"];
  errors?: SearchResult["errors"];
  tookMs: number;
  /** Papers marked "New" for a saved search, and since when. */
  fresh: string[];
  since: number | null;
}

export interface RecalledSearch {
  result: SearchResult;
  fresh: string[];
  since: number | null;
}

export function rememberSearch(qs: string, result: SearchResult, fresh: string[], since: number | null, now = Date.now()): void {
  const entry: LastSearch = {
    qs,
    at: now,
    ids: result.papers.map((p) => p.id),
    sources: result.sources,
    errors: result.errors,
    tookMs: result.tookMs,
    fresh,
    since,
  };
  try {
    sessionStorage.setItem(KEY, JSON.stringify(entry));
  } catch {
    // Storage blocked or full: the search just runs again next time.
  }
}

/** The results of this exact search if it ran in the last half hour and every paper is still at hand; otherwise null. */
export function recallSearch(qs: string, now = Date.now()): RecalledSearch | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    const entry = raw ? (JSON.parse(raw) as LastSearch) : null;
    if (!entry || entry.qs !== qs || now - entry.at > TTL_MS || !Array.isArray(entry.ids)) return null;
    const papers = entry.ids.map(getRecentPaper);
    // A paper pushed out of the store (many related papers opened since): run it again.
    if (papers.some((p) => p === null)) return null;
    return {
      result: { papers: papers as SearchResult["papers"], sources: entry.sources, errors: entry.errors, tookMs: entry.tookMs },
      fresh: entry.fresh ?? [],
      since: entry.since ?? null,
    };
  } catch {
    return null;
  }
}

/** Where "Back to search" goes: the last search's results, or the empty search page. */
export function lastSearchHref(now = Date.now()): string {
  try {
    const raw = sessionStorage.getItem(KEY);
    const entry = raw ? (JSON.parse(raw) as LastSearch) : null;
    return entry?.qs && now - entry.at <= TTL_MS ? `/search?${entry.qs}` : "/search";
  } catch {
    return "/search";
  }
}

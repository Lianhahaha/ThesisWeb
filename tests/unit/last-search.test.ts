import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { lastSearchHref, recallSearch, rememberSearch } from "@/lib/search/last-search";
import { storeRecentPapers } from "@/lib/search/recent-papers";
import type { Paper, SearchResult } from "@/lib/types";

/** sessionStorage for the node test environment. */
function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, String(v)),
    removeItem: (k) => void data.delete(k),
    clear: () => data.clear(),
    key: (i) => [...data.keys()][i] ?? null,
    get length() {
      return data.size;
    },
  };
}

const paper = (id: string): Paper => ({ id, title: `Paper ${id}`, authors: [], year: 2024, sources: ["openalex"] });
const result: SearchResult = { papers: [paper("a"), paper("b")], sources: { openalex: "ok" }, tookMs: 4200 };
const QS = "q=teacher+burnout&from=2022";

beforeEach(() => {
  vi.stubGlobal("window", globalThis);
  vi.stubGlobal("sessionStorage", memoryStorage());
});
afterEach(() => vi.unstubAllGlobals());

describe("last search", () => {
  it("gives the same search back, in order, with its New marks", () => {
    storeRecentPapers(result.papers);
    rememberSearch(QS, result, ["b"], 1000, 0);
    const recalled = recallSearch(QS, 60_000);
    expect(recalled?.result.papers.map((p) => p.id)).toEqual(["a", "b"]);
    expect(recalled).toMatchObject({ fresh: ["b"], since: 1000, result: { sources: { openalex: "ok" }, tookMs: 4200 } });
  });

  it("runs a different, stale or incomplete search again", () => {
    storeRecentPapers(result.papers);
    rememberSearch(QS, result, [], null, 0);
    expect(recallSearch("q=other", 1)).toBeNull();
    expect(recallSearch(QS, 31 * 60_000)).toBeNull();
    storeRecentPapers([paper("a")]);
    expect(recallSearch(QS, 1)).toBeNull();
  });

  it("sends Back to search to the last results while they are fresh", () => {
    expect(lastSearchHref()).toBe("/search");
    rememberSearch(QS, result, [], null, 0);
    expect(lastSearchHref(1000)).toBe(`/search?${QS}`);
    expect(lastSearchHref(31 * 60_000)).toBe("/search");
  });
});

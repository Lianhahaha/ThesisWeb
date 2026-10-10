import { beforeEach, describe, expect, it } from "vitest";
import {
  checkSavedSearch,
  isSearchSaved,
  listSavedSearches,
  newIds,
  removeSavedSearch,
  saveSearch,
  savedSearchKey,
} from "@/lib/search/saved";
import type { SearchInput } from "@/lib/search/params";

// The module runs in the browser; give it a window and localStorage.
const store = new Map<string, string>();
Object.assign(globalThis, {
  window: { dispatchEvent: () => true },
  localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  },
});

const input: SearchInput = { query: "teacher burnout", fromYear: 2022, openAccessOnly: false, country: "Philippines" };

beforeEach(() => store.clear());

describe("savedSearchKey", () => {
  it("ignores case and spacing but not filters", () => {
    expect(savedSearchKey({ ...input, query: "  Teacher   BURNOUT " })).toBe(savedSearchKey(input));
    expect(savedSearchKey({ ...input, country: null })).not.toBe(savedSearchKey(input));
  });
});

describe("newIds", () => {
  it("keeps result order", () => {
    expect(newIds(["a", "b"], ["c", "a", "d"])).toEqual(["c", "d"]);
  });
});

describe("saved searches", () => {
  it("marks only papers not seen the last time, then remembers them", () => {
    saveSearch(input, ["a", "b"], 1000);
    expect(isSearchSaved(input)).toBe(true);

    expect(checkSavedSearch(input, ["c", "a", "b"], 2000)).toEqual({ fresh: ["c"], since: 1000 });
    expect(checkSavedSearch(input, ["a", "c"], 3000)).toEqual({ fresh: [], since: 2000 });
    // "b" dropped out and came back: not new.
    expect(checkSavedSearch(input, ["b"], 4000)?.fresh).toEqual([]);
  });

  it("returns null for a search that isn't saved", () => {
    expect(checkSavedSearch(input, ["a"])).toBeNull();
  });

  it("saving the same search again replaces it; removing forgets it", () => {
    saveSearch(input, ["a"]);
    saveSearch({ ...input, query: "TEACHER burnout" }, ["a", "b"]);
    expect(listSavedSearches()).toHaveLength(1);
    removeSavedSearch(savedSearchKey(input));
    expect(listSavedSearches()).toEqual([]);
  });

  it("survives corrupt storage", () => {
    store.set("tw-saved-searches", "{not json");
    expect(listSavedSearches()).toEqual([]);
  });
});

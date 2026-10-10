import { describe, expect, it } from "vitest";
import { fromShared, MAX_SHARED, sharedPapers, toSharedPaper } from "@/lib/library/shared-copy";
import type { SavedPaper } from "@/lib/types";

const paper = (over: Partial<SavedPaper> = {}): SavedPaper => ({
  id: "doi:10.1234/a",
  title: "Teacher burnout in public schools",
  authors: ["Ana Cruz"],
  year: 2023,
  doi: "10.1234/a",
  sources: ["openalex"],
  savedAt: 1,
  tags: ["private"],
  readingStatus: "done",
  notes: "My notes",
  matrix: { method: "Survey" },
  collection: "Chapter 2",
  ...over,
});

describe("toSharedPaper", () => {
  it("keeps what a group mate needs and nothing Firestore would reject", () => {
    const s = toSharedPaper(paper(), true);
    expect(s).toMatchObject({ title: "Teacher burnout in public schools", notes: "My notes", matrix: { method: "Survey" } });
    expect(Object.values(s).some((v) => v === undefined)).toBe(false);
    // Personal fields stay private.
    expect(s).not.toHaveProperty("tags");
    expect(s).not.toHaveProperty("readingStatus");
    expect(s).not.toHaveProperty("collection");
  });

  it("leaves out notes and matrix when asked", () => {
    const s = toSharedPaper(paper(), false);
    expect(s).not.toHaveProperty("notes");
    expect(s).not.toHaveProperty("matrix");
  });
});

describe("sharedPapers", () => {
  it("refuses more than the limit, or nothing", () => {
    expect(() => sharedPapers([], true)).toThrow(/no papers/);
    expect(() => sharedPapers(Array.from({ length: MAX_SHARED + 1 }, (_, i) => paper({ id: String(i) })), true)).toThrow(/up to/);
  });

  it("drops abstracts when the copy would be too big", () => {
    const big = Array.from({ length: 150 }, (_, i) =>
      paper({ id: String(i), abstract: "x".repeat(1500), notes: "n".repeat(4000), matrix: { method: "m".repeat(1500) } })
    );
    const out = sharedPapers(big, true);
    expect(out[0]).not.toHaveProperty("abstract");
    expect(JSON.stringify(out).length).toBeLessThan(900_000);
  });
});

describe("fromShared", () => {
  it("turns a share into library records in a collection named after it, cleaning links", () => {
    const [p] = fromShared(
      { name: "Group 3 RRL", papers: [{ ...toSharedPaper(paper(), true), url: "javascript:alert(1)" }] },
      500
    );
    expect(p).toMatchObject({ collection: "Group 3 RRL", notes: "My notes", savedAt: 500, readingStatus: "to-read", tags: [], url: null });
  });

  it("skips records without a title", () => {
    expect(fromShared({ name: "x", papers: [{ ...toSharedPaper(paper(), false), title: "" }] })).toEqual([]);
  });
});

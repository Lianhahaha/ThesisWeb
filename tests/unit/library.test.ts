import { describe, expect, it } from "vitest";
import { mergeSavedPaper } from "@/lib/library/merge";
import { parseBackup } from "@/lib/library/backup";
import type { SavedPaper } from "@/lib/types";

const paper = (over: Partial<SavedPaper> = {}): SavedPaper => ({
  id: "doi:10.1/x",
  title: "Teacher burnout in public schools",
  authors: ["Ana Cruz"],
  year: 2023,
  sources: ["openalex"],
  savedAt: 2000,
  tags: [],
  readingStatus: "to-read",
  ...over,
});

describe("mergeSavedPaper", () => {
  it("returns the incoming copy when nothing is saved yet", () => {
    const p = paper();
    expect(mergeSavedPaper(undefined, p)).toBe(p);
  });

  it("keeps the account's notes and matrix when browser papers move in", () => {
    const account = paper({ notes: "Account notes", matrix: { method: "Survey", findings: "Burnout high" }, readingStatus: "done" });
    const browser = paper({ notes: "Lab PC notes", matrix: { limitations: "One school" }, savedAt: 1000 });
    expect(mergeSavedPaper(account, browser)).toMatchObject({
      notes: "Account notes\n\nLab PC notes",
      matrix: { method: "Survey", findings: "Burnout high", limitations: "One school" },
      readingStatus: "done",
      savedAt: 1000,
    });
  });

  it("does not duplicate notes that one copy already contains", () => {
    expect(mergeSavedPaper(paper({ notes: "a b c" }), paper({ notes: "a b" })).notes).toBe("a b c");
    expect(mergeSavedPaper(paper({ notes: "a b" }), paper({ notes: "a b c" })).notes).toBe("a b c");
  });

  it("refreshes bibliographic data but never erases a link or a warning with an empty value", () => {
    const saved = paper({ openAccessUrl: "https://repo.org/x.pdf", isOpenAccess: true, retracted: true, abstract: "Old" });
    const fresh = paper({ openAccessUrl: null, isOpenAccess: false, abstract: "New", citedByCount: 9 });
    expect(mergeSavedPaper(saved, fresh)).toMatchObject({
      openAccessUrl: "https://repo.org/x.pdf",
      isOpenAccess: true,
      retracted: true,
      abstract: "New",
      citedByCount: 9,
    });
  });

  it("joins tags and keeps the saved collection", () => {
    const merged = mergeSavedPaper(paper({ tags: ["a"], collection: "Local studies" }), paper({ tags: ["a", "b"], collection: "Other" }));
    expect(merged.tags).toEqual(["a", "b"]);
    expect(merged.collection).toBe("Local studies");
  });
});

describe("parseBackup", () => {
  it("keeps peer-review and warning flags", () => {
    const [p] = parseBackup({ papers: [{ id: "x", title: "T", preprint: true, concern: true }] });
    expect(p).toMatchObject({ preprint: true, concern: true });
  });

  it("keeps only the four matrix cells, as capped text", () => {
    const [p] = parseBackup([
      { id: "x", title: "T", matrix: { method: "Survey", findings: { nested: 1 }, other: "x", limitations: "y".repeat(9000) } },
    ]);
    expect(p.matrix).toEqual({ method: "Survey", limitations: "y".repeat(5000) });
    const [q] = parseBackup([{ id: "y", title: "T", matrix: ["not", "a", "map"] }]);
    expect(q.matrix).toBeUndefined();
  });

  it("drops non-http links and rejects a file that is not a backup", () => {
    const [p] = parseBackup([{ id: "x", title: "T", url: "javascript:alert(1)" }]);
    expect(p.url).toBeUndefined();
    expect(() => parseBackup({ hello: 1 })).toThrow();
  });
});

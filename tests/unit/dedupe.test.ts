import { describe, expect, it } from "vitest";
import { dedupePapers, rankResults } from "@/lib/search/rank";
import type { Paper } from "@/lib/types";

const p = (over: Partial<Paper>): Paper => ({
  id: "a",
  title: "Same title",
  authors: [],
  year: 2024,
  sources: ["s"],
  ...over,
});

describe("dedupePapers", () => {
  it("merges the same DOI from two sources", () => {
    const out = dedupePapers([p({ doi: "10.1/A", sources: ["one"] }), p({ doi: "10.1/a", sources: ["two"] })]);
    expect(out).toHaveLength(1);
    expect(out[0].sources).toEqual(["one", "two"]);
  });

  it("keeps a retraction from any source", () => {
    const out = dedupePapers([p({ doi: "10.1/a" }), p({ doi: "10.1/a", retracted: true })]);
    expect(out[0].retracted).toBe(true);
  });

  it("lets a known journal version win over a preprint copy", () => {
    expect(dedupePapers([p({ preprint: true }), p({ preprint: false })])[0].preprint).toBe(false);
    expect(dedupePapers([p({ preprint: false }), p({ preprint: true })])[0].preprint).toBe(false);
  });

  it("does not clear a preprint flag with an unknown status", () => {
    expect(dedupePapers([p({ preprint: true }), p({})])[0].preprint).toBe(true);
  });

  it("fills citation details from whichever source has them", () => {
    const out = dedupePapers([
      p({ doi: "10.1/a", type: "article", volume: "12" }),
      p({ doi: "10.1/a", type: "preprint", issue: "3", pages: "45-67", publisher: "Elsevier" }),
    ]);
    expect(out[0]).toMatchObject({ type: "article", volume: "12", issue: "3", pages: "45-67", publisher: "Elsevier" });
  });

  it("never returns two papers with the same id", () => {
    const out = dedupePapers([
      p({ id: "tit:x", title: "Same", year: 2025 }),
      p({ id: "tit:x", title: "Same", year: 2026 }),
      p({ id: "tit:x", title: "Same", year: 2026, doi: null, abstract: "different record, same key" }),
    ]);
    expect(new Set(out.map((x) => x.id)).size).toBe(out.length);
  });
});

describe("rankResults", () => {
  const records = () => [
    p({ id: "doi:10.1/a", doi: "10.1/a", title: "Teacher burnout in schools", sources: ["one"], year: 2024 }),
    p({ id: "doi:10.1/a", doi: "10.1/a", title: "Teacher burnout in schools", sources: ["two"], year: 2024, isOpenAccess: true, openAccessUrl: "https://x.org/a.pdf" }),
    p({ id: "doi:10.1/b", doi: "10.1/b", title: "Teacher burnout and pay", sources: ["one"], year: 2015 }),
  ];

  it("merges, filters and ranks without changing the records it was given", () => {
    const input = records();
    const before = JSON.stringify(input);
    const out = rankResults(input, "teacher burnout", { fromYear: 2020 });
    expect(out.map((x) => x.id)).toEqual(["doi:10.1/a"]);
    expect(out[0].sources).toEqual(["one", "two"]);
    expect(JSON.stringify(input)).toBe(before);
  });

  it("keeps only free full text when asked", () => {
    expect(rankResults(records(), "teacher burnout", { openAccessOnly: true }).map((x) => x.id)).toEqual(["doi:10.1/a"]);
  });
});

import { describe, expect, it } from "vitest";
import { dedupePapers } from "@/lib/dedupe";
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

  it("never returns two papers with the same id", () => {
    const out = dedupePapers([
      p({ id: "tit:x", title: "Same", year: 2025 }),
      p({ id: "tit:x", title: "Same", year: 2026 }),
      p({ id: "tit:x", title: "Same", year: 2026, doi: null, abstract: "different record, same key" }),
    ]);
    expect(new Set(out.map((x) => x.id)).size).toBe(out.length);
  });
});

import { describe, expect, it } from "vitest";
import { NO_REFINEMENT, recordTypes, refine } from "@/lib/search/result-view";
import type { Paper } from "@/lib/types";

const paper = (over: Partial<Paper>): Paper => ({ id: Math.random().toString(36), title: "T", authors: [], year: 2023, sources: ["openalex"], ...over });

describe("recordTypes", () => {
  it("reads types from the databases and the venue", () => {
    expect([...recordTypes(paper({ sources: ["upd"] }))]).toEqual(["thesis"]);
    expect([...recordTypes(paper({ sources: ["arxiv"] }))]).toEqual(["preprint"]);
    expect([...recordTypes(paper({ preprint: false }))]).toEqual(["journal"]);
    expect([...recordTypes(paper({ venue: "PIDS Discussion Paper Series" }))]).toEqual(["report"]);
    expect([...recordTypes(paper({ venue: "Doctoral thesis" }))]).toEqual(["thesis"]);
    expect(recordTypes(paper({})).size).toBe(0);
  });
});

describe("refine", () => {
  const thesis = paper({ sources: ["upd"], title: "Reading in Luzon schools", citedByCount: 0 });
  const article = paper({ preprint: false, title: "Burnout among teachers in Japan", citedByCount: 40 });
  const preprint = paper({ sources: ["arxiv"], title: "A model", citedByCount: 120 });
  const all = [thesis, article, preprint];

  it("passes everything without a refinement", () => {
    expect(refine(all, NO_REFINEMENT)).toEqual(all);
  });

  it("keeps any selected type", () => {
    expect(refine(all, { ...NO_REFINEMENT, types: new Set(["thesis", "journal"]) })).toEqual([thesis, article]);
  });

  it("keeps local studies only", () => {
    expect(refine(all, { ...NO_REFINEMENT, localTo: "Philippines" })).toEqual([thesis]);
  });

  it("applies a citation floor", () => {
    expect(refine(all, { ...NO_REFINEMENT, minCitations: 50 })).toEqual([preprint]);
  });
});

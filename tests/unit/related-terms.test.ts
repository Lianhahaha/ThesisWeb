import { describe, expect, it } from "vitest";
import { suggestTerms } from "@/lib/search/related-terms";
import type { Paper } from "@/lib/types";

const paper = (keywords: string[]): Paper => ({ id: Math.random().toString(36), title: "T", authors: [], year: 2024, sources: ["openalex"], keywords });

describe("suggestTerms", () => {
  it("suggests keywords that recur across results, most common first", () => {
    const papers = [paper(["job satisfaction", "stress"]), paper(["job satisfaction", "stress"]), paper(["job satisfaction"])];
    expect(suggestTerms(papers, "teacher burnout").map((t) => t.term)).toEqual(["job satisfaction", "stress"]);
  });

  it("leaves out terms the search already has, in either number", () => {
    const papers = [paper(["teachers", "Burnout", "teacher burnout", "classes"]), paper(["teachers", "Burnout", "teacher burnout", "classes"])];
    expect(suggestTerms(papers, "teacher burnout class")).toEqual([]);
  });
});

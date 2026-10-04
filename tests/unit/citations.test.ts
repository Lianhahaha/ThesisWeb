import { describe, expect, it } from "vitest";
import { citationToText, formatCitation, inTextCitation, toBibtexList } from "@/lib/citations";
import type { Paper } from "@/lib/types";

const paper = (over: Partial<Paper> = {}): Paper => ({
  id: "x",
  title: "Does homework work?",
  authors: ["John Smith", "Jane Doe"],
  year: 2023,
  venue: "Computers & Education",
  doi: "10.1/x",
  sources: [],
  ...over,
});
const text = (p: Paper, s: Parameters<typeof formatCitation>[1]) => citationToText(formatCitation(p, s));

describe("formatCitation", () => {
  it("never doubles a title's own punctuation", () => {
    for (const s of ["apa", "mla", "chicago"] as const) expect(text(paper(), s)).not.toMatch(/\?[.,]/);
  });

  it("joins venue and year only when both exist", () => {
    expect(text(paper({ year: null }), "mla")).toContain("Computers & Education.");
    expect(text(paper({ year: null }), "mla")).not.toContain(",.");
  });

  it("expands run-together initials", () => {
    expect(text(paper({ authors: ["FP Polack"] }), "apa")).toMatch(/^Polack, F\. P\./);
  });

  it("formats IEEE authors and quotes", () => {
    const t = text(paper({ title: "A study" }), "ieee");
    expect(t).toContain("J. Smith and J. Doe");
    expect(t).toContain('"A study,"');
    const many = text(
      paper({ authors: ["A One", "B Two", "C Three", "D Four", "E Five", "F Six", "G Seven"] }),
      "ieee"
    );
    expect(many).toContain("A. One et al.,");
  });

  it("lists up to ten authors in Chicago", () => {
    expect(text(paper({ authors: ["A One", "B Two", "C Three"] }), "chicago")).toMatch(
      /^One, A, B Two, and C Three\./
    );
  });
});

describe("inTextCitation", () => {
  it("uses & only for APA", () => {
    expect(inTextCitation(paper(), "apa")).toBe("(Smith & Doe, 2023)");
    expect(inTextCitation(paper(), "mla")).toBe("(Smith and Doe)");
    expect(inTextCitation(paper({ year: null }), "chicago")).toBe("(Smith and Doe n.d.)");
  });
});

describe("toBibtexList", () => {
  it("gives repeated cite keys a suffix", () => {
    const keys = toBibtexList([paper({ title: "The one" }), paper({ title: "The two" })])
      .split("\n")
      .filter((l) => l.startsWith("@"));
    expect(new Set(keys).size).toBe(2);
  });
});

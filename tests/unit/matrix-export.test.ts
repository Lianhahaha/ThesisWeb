import { describe, expect, it } from "vitest";
import { matrixCsv, matrixRows, matrixRtf, shortCitation } from "@/lib/library/matrix-export";
import type { SavedPaper } from "@/lib/types";

const paper = (over: Partial<SavedPaper> = {}): SavedPaper => ({
  id: "x",
  title: "Teacher burnout in public schools",
  authors: ["Ana Cruz"],
  year: 2023,
  sources: ["s"],
  savedAt: 1,
  tags: [],
  readingStatus: "to-read",
  ...over,
});

describe("shortCitation", () => {
  it("names one, two or many authors the APA way", () => {
    expect(shortCitation(paper())).toBe("Cruz (2023)");
    expect(shortCitation(paper({ authors: ["Ana Cruz", "José Reyes"] }))).toBe("Cruz & Reyes (2023)");
    expect(shortCitation(paper({ authors: ["A B", "C D", "E F"], year: null }))).toBe("B et al. (n.d.)");
  });
});

describe("matrixRows", () => {
  it("has a header and one row per paper, with empty cells for blank columns", () => {
    const rows = matrixRows([paper({ matrix: { method: "Survey" } })]);
    expect(rows[0]).toEqual(["No.", "Author and year", "Title", "Method", "Findings", "Limitations", "Relevance to my topic"]);
    expect(rows[1]).toEqual(["1", "Cruz (2023)", "Teacher burnout in public schools", "Survey", "", "", ""]);
  });

  it("adds Local / foreign when asked", () => {
    const rows = matrixRows([paper()], () => "local");
    expect(rows[0][3]).toBe("Local / foreign");
    expect(rows[1][3]).toBe("Local");
  });
});

describe("matrixCsv", () => {
  it("starts with a BOM, quotes commas, quotes and line breaks, and defuses formulas", () => {
    const csv = matrixCsv([["a", 'say "hi", ok', "line\nbreak", "=SUM(A1)"]]);
    expect(csv).toBe('﻿a,"say ""hi"", ok","line\nbreak",\'=SUM(A1)\r\n');
  });
});

describe("matrixRtf", () => {
  it("is a landscape document whose table fills 9 inches", () => {
    const rtf = matrixRtf(matrixRows([paper()], () => "foreign"));
    expect(rtf).toContain("\\landscape");
    expect(rtf).toContain("\\cellx12960"); // 9 in x 1440 twips
    expect(rtf.match(/\\row/g)).toHaveLength(2);
  });
});

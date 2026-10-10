import { describe, expect, it } from "vitest";
import { citationToRtf, referenceListRtf, rtfText, tableRtf } from "@/lib/library/rtf";
import { formatCitation } from "@/lib/citations";

describe("rtfText", () => {
  it("escapes RTF syntax and writes non-ASCII as unicode escapes", () => {
    expect(rtfText("a{b}\\c")).toBe("a\\{b\\}\\\\c");
    expect(rtfText("José – ñ")).toBe("Jos\\u233? \\u8211? \\u241?");
    expect(rtfText("line\nnext")).toBe("line\\line next");
  });

  it("writes characters past U+FFFF as a signed surrogate pair", () => {
    // U+1D6FC is D835 DEFC in UTF-16: 55349 - 65536 and 57084 - 65536.
    expect(rtfText("𝛼")).toBe("\\u-10187?\\u-8452?");
  });
});

describe("citationToRtf", () => {
  it("turns <i> into RTF italics and decodes entities", () => {
    expect(citationToRtf("Cruz, A. (2023). Burnout &amp; schools. <i>Asia Pacific Journal</i>.")).toBe(
      "Cruz, A. (2023). Burnout & schools. {\\i Asia Pacific Journal}."
    );
  });
});

describe("referenceListRtf", () => {
  const apa = formatCitation(
    { id: "x", title: "Teacher burnout", authors: ["Ana Cruz"], year: 2023, venue: "Asia Pacific Journal", sources: ["s"] },
    "apa"
  );

  it("makes a complete document with a title, headings and hanging, double-spaced entries", () => {
    const rtf = referenceListRtf([{ heading: "Local", entries: [apa] }]);
    expect(rtf.startsWith("{\\rtf1")).toBe(true);
    expect(rtf.endsWith("}")).toBe(true);
    expect(rtf).toContain("\\qc\\sl480\\slmult1\\b References\\b0\\par");
    expect(rtf).toContain("\\b Local\\b0\\par");
    expect(rtf).toContain("\\li720\\fi-720\\sl480\\slmult1 Cruz, A. (2023). Teacher burnout. {\\i Asia Pacific Journal}.\\par");
    // Braces balance, or Word refuses the file.
    const depth = [...rtf.replace(/\\[{}\\]/g, "")].reduce((d, c) => d + (c === "{" ? 1 : c === "}" ? -1 : 0), 0);
    expect(depth).toBe(0);
  });

  it("can single-space (IEEE)", () => {
    expect(referenceListRtf([{ heading: null, entries: [apa] }], { single: true })).toContain("\\sl240\\slmult1");
  });
});

describe("tableRtf", () => {
  it("defines cumulative cell edges and one \\cell per value", () => {
    const t = tableRtf(["Paper", "Method"], [["Cruz (2023)", "Survey"]], [2, 1.5]);
    expect(t).toContain("\\cellx2880");
    expect(t).toContain("\\cellx5040");
    expect(t.match(/\\cell\b/g)).toHaveLength(4);
    expect(t.match(/\\row/g)).toHaveLength(2);
  });
});

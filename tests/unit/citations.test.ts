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

describe("formatCitation by record type", () => {
  const article = paper({
    title: "Reading comprehension strategies",
    authors: ["Ana Cruz", "Jose Reyes"],
    venue: "Philippine Journal of Education",
    type: "article",
    volume: "12",
    issue: "3",
    pages: "45-67",
    doi: "10.1234/pje",
  });

  it("gives a journal article its volume, issue and pages in every style", () => {
    expect(formatCitation(article, "apa")).toBe(
      "Cruz, A., &amp; Reyes, J. (2023). Reading comprehension strategies. <i>Philippine Journal of Education</i>, <i>12</i>(3), 45–67. https://doi.org/10.1234/pje"
    );
    expect(text(article, "mla")).toBe(
      'Cruz, Ana, and Jose Reyes. "Reading comprehension strategies." Philippine Journal of Education, vol. 12, no. 3, 2023, pp. 45–67. https://doi.org/10.1234/pje.'
    );
    expect(text(article, "chicago")).toBe(
      'Cruz, Ana, and Jose Reyes. "Reading comprehension strategies." Philippine Journal of Education 12, no. 3 (2023): 45–67. https://doi.org/10.1234/pje.'
    );
    expect(text(article, "ieee")).toBe(
      '[1] A. Cruz and J. Reyes, "Reading comprehension strategies," Philippine Journal of Education, vol. 12, no. 3, pp. 45–67, 2023, doi: 10.1234/pje.'
    );
  });

  it("writes an article number as one", () => {
    const p = paper({ ...article, pages: "103778", issue: null });
    expect(text(p, "apa")).toContain("Philippine Journal of Education, 12, Article 103778.");
    expect(text(p, "ieee")).toContain("Art. no. 103778");
  });

  it("cites a thesis with its degree and university, and links it", () => {
    const thesis = paper({
      title: "Online learning readiness",
      authors: ["Liza Mendoza"],
      year: 2022,
      venue: "Master's thesis",
      type: "thesis",
      publisher: "West Visayas State University",
      doi: null,
      url: "https://repository.wvsu.edu.ph/handle/1/2",
    });
    expect(formatCitation(thesis, "apa")).toBe(
      "Mendoza, L. (2022). <i>Online learning readiness</i> [Master's thesis, West Visayas State University]. https://repository.wvsu.edu.ph/handle/1/2"
    );
    expect(text(thesis, "mla")).toContain("Online learning readiness. 2022. West Visayas State University, MA thesis.");
    expect(text(thesis, "chicago")).toContain('"Online learning readiness." Master\'s thesis, West Visayas State University, 2022.');
    expect(text(thesis, "ieee")).toContain('"Online learning readiness," M.S. thesis, West Visayas State University, 2022. [Online]. Available:');
  });

  it("guesses a thesis from its database when the record has no type", () => {
    const p = paper({ type: undefined, venue: "West Visayas State University", sources: ["wvsu"], publisher: null, doi: null });
    expect(text(p, "apa")).toContain("[Thesis, West Visayas State University]");
  });

  it("cites a report with its series and publisher, and an agency once", () => {
    const report = paper({ title: "Poverty and education", authors: ["Celia Reyes"], type: "report", venue: "PIDS DP 2021-08", publisher: "PIDS", doi: null, url: "https://serp-p.pids.gov.ph/x" });
    expect(text(report, "apa")).toBe("Reyes, C. (2023). Poverty and education (PIDS DP 2021-08). PIDS. https://serp-p.pids.gov.ph/x");
    const who = paper({ title: "Dengue update", authors: ["World Health Organization"], type: "report", venue: "World Health Organization", publisher: "World Health Organization", doi: null, url: "https://iris.who.int/1" });
    expect(text(who, "apa")).toBe("World Health Organization. (2023). Dengue update. https://iris.who.int/1");
    expect(text(who, "mla")).toBe("Dengue update. World Health Organization, 2023. https://iris.who.int/1.");
  });

  it("puts a chapter or proceedings paper in its book, with pages", () => {
    const chapter = paper({ title: "U-Net", authors: ["Olaf Ronneberger"], year: 2015, type: "chapter", venue: "MICCAI 2015", pages: "234-241", publisher: "Springer", doi: "10.1007/x" });
    expect(text(chapter, "apa")).toBe("Ronneberger, O. (2015). U-Net. In MICCAI 2015 (pp. 234–241). Springer. https://doi.org/10.1007/x");
    expect(text(chapter, "chicago")).toContain('"U-Net." In MICCAI 2015, 234–241. Springer, 2015.');
  });

  it("marks a preprint and names its server", () => {
    const p = paper({ title: "Attention is all you need", type: "preprint", venue: "arXiv", doi: null, url: "https://arxiv.org/abs/1706.03762" });
    expect(formatCitation(p, "apa")).toContain("<i>Attention is all you need</i> [Preprint]. arXiv. https://arxiv.org/abs/1706.03762");
  });

  it("starts with the title when there is no author", () => {
    const p = paper({ authors: [], type: "article", title: "Mental health", venue: "Asian Journal of Psychology", doi: null });
    expect(text(p, "apa")).toBe("Mental health. (2023). Asian Journal of Psychology.");
    expect(inTextCitation(p, "apa")).toBe('("Mental health," 2023)');
  });

  it("keeps organisations whole in every author list", () => {
    const p = paper({ authors: ["World Health Organization", "UNICEF"] });
    expect(text(p, "apa")).toMatch(/^World Health Organization, & UNICEF\./);
    expect(text(p, "ieee")).toContain("World Health Organization and UNICEF");
    expect(inTextCitation(p, "apa")).toBe("(World Health Organization & UNICEF, 2023)");
  });

  it("shortens 21 or more APA authors to the first 19, an ellipsis and the last", () => {
    const authors = Array.from({ length: 22 }, (_, i) => `Given Author${i + 1}`);
    const t = text(paper({ authors }), "apa");
    expect(t).toContain("Author19, G., . . . Author22, G.");
    expect(t).not.toContain("Author20");
  });

  it("leaves out the database link of an article without a DOI, but links other works", () => {
    expect(text(paper({ type: "article", doi: null, url: "https://db.example/1" }), "apa")).not.toContain("https://");
    expect(text(paper({ type: "book", doi: null, url: "https://db.example/1", publisher: "Rex" }), "apa")).toContain("https://db.example/1");
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

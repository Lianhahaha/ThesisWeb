import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expandPages, parsePubmedXml } from "@/lib/sources/adapters/pubmed";

/** One real efetch record, reference list included. */
const XML = readFileSync(fileURLToPath(new URL("../fixtures/pubmed-article.xml", import.meta.url)), "utf8");

describe("parsePubmedXml", () => {
  const [p] = parsePubmedXml(XML);

  it("reads title, authors, journal, year and the abstract", () => {
    expect(p.title).toMatch(/^Occupational burnout in women schoolteachers in Kazakhstan/);
    expect(p.authors[0]).toBe("Nurlan Smagulov");
    expect(p).toMatchObject({ venue: "Frontiers in psychology", year: 2026, volume: "17", type: "article", sources: ["pubmed"] });
    expect(p.abstract && p.abstract.length).toBeGreaterThan(200);
    expect(p.url).toBe("https://pubmed.ncbi.nlm.nih.gov/42871123/");
  });

  it("takes the article's own DOI and PMC copy, not those of papers it cites", () => {
    expect(p.doi).toBe("10.3389/fpsyg.2026.1945234");
    expect(p.openAccessUrl).toBe("https://pmc.ncbi.nlm.nih.gov/articles/PMC13658548/");
    expect(p.isOpenAccess).toBe(true);
  });

  it("keeps the author keywords", () => {
    expect(p.keywords).toContain("Kazakhstan");
    expect(p.keywords).toContain("emotional exhaustion");
  });

  it("labels the parts of a structured abstract and marks preprints", () => {
    const xml = `<PubmedArticle><MedlineCitation><PMID Version="1">1</PMID><Article><ArticleTitle>T.</ArticleTitle>
      <Abstract><AbstractText Label="BACKGROUND">Why.</AbstractText><AbstractText Label="METHODS">How.</AbstractText></Abstract>
      <PublicationTypeList><PublicationType UI="D000076942">Preprint</PublicationType></PublicationTypeList>
      <MedlinePgn>1234-45</MedlinePgn></Article></MedlineCitation></PubmedArticle>`;
    const [q] = parsePubmedXml(xml);
    expect(q).toMatchObject({ title: "T", abstract: "Background: Why. Methods: How.", preprint: true, type: "preprint", pages: "1234-1245" });
  });
});

describe("expandPages", () => {
  it("writes MEDLINE's shortened ranges out in full", () => {
    expect(expandPages("1234-45")).toBe("1234-1245");
    expect(expandPages("45-67")).toBe("45-67");
    expect(expandPages("e2331")).toBe("e2331");
    expect(expandPages(null)).toBeNull();
  });
});

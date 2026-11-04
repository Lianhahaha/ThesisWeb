import { describe, expect, it } from "vitest";
import { parseScielo } from "@/lib/sources/adapters/scielo";

const html = `
  <div class="results">
    <div id="S2960-24672026000102013-ven" class="item">
      <div class="line">
        <a href="http://ve.scielo.org/scielo.php?script=sci_arttext&amp;pid=S2960-24672026000102013" title="Environmental quality strategy">
          <strong class="title" id="title-S2960-24672026000102013">Estrategia de calidad ambiental</strong>
        </a>
      </div>
      <div class="line authors">
        <a class="author">Feria Guerrero de Infantes, Alicia del Consuelo</a>
      </div>
      <div class="line source">
        <span class="dropdown"><a data-original-title="Metrics">e-Revista Multidisciplinaria del Saber</a></span>
        <span style="margin: 0">dec</span>
        <span style="margin: 0">2026, </span>
        <small>Volume</small><span>4</span>
      </div>
      <div class="DOIResults"><a href="https://doi.org/10.61286/e-rms.v4i.332">https://doi.org/10.61286/e-rms.v4i.332</a></div>
      <div class="user-actions"></div>
      <a href="http://ve.scielo.org/scielo.php?script=sci_pdf&amp;pid=S2960-24672026000102013">PDF</a>
      <div id="S2960-24672026000102013-ven_en" class="abstract" style="display:none">
        Environmental education in early childhood is a determining factor.
      </div>
    </div>
  </div>`;

describe("parseScielo", () => {
  it("reads the title, author, journal, year, DOI, abstract and free PDF", () => {
    const [paper] = parseScielo(html);
    expect(paper).toMatchObject({
      title: "Estrategia de calidad ambiental",
      authors: ["Alicia del Consuelo Feria Guerrero de Infantes"],
      year: 2026,
      venue: "e-Revista Multidisciplinaria del Saber",
      doi: "10.61286/e-rms.v4i.332",
      abstract: "Environmental education in early childhood is a determining factor.",
      isOpenAccess: true,
      sources: ["scielo"],
    });
    expect(paper.openAccessUrl).toContain("sci_pdf");
    expect(paper.url).toContain("sci_arttext");
  });
});

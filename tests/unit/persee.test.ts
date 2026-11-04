import { describe, expect, it } from "vitest";
import { parsePersee } from "@/lib/sources/adapters/persee";

const html = `
  <div class="doc-result">
    <div><a href="https://www.persee.fr/doc/refor_0988-1824_1997_num_24_1_1401" class="title title-free">Éducation civique, éducation morale</a> [article]</div>
    <div class="contributors">
      <span class="authority-reference"><a href="https://www.persee.fr/authority/71773"><span class="name"> Jean-Claude Filloux</span></a></span>
    </div>
    <div class="documentBibRef">
      <span class="collection"><a href="https://www.persee.fr/collection/refor">Recherche &amp; formation</a></span> /
      <span class="documentYear"> Année 1997</span> /
      <span class="documentIssue"> <a href="https://www.persee.fr/issue/refor">24</a></span> /
      <span class="documentPageRange"> pp. 97-111</span>
    </div>
    <div class="searchContext"><p>Éducation civique, éducation morale...</p></div>
  </div>`;

describe("parsePersee", () => {
  it("reads the title, author, journal, year, issue and pages", () => {
    const [paper] = parsePersee(html);
    expect(paper).toMatchObject({
      title: "Éducation civique, éducation morale",
      authors: ["Jean-Claude Filloux"],
      year: 1997,
      venue: "Recherche & formation",
      issue: "24",
      pages: "97-111",
      isOpenAccess: true,
      sources: ["persee"],
    });
    expect(paper.url).toBe("https://www.persee.fr/doc/refor_0988-1824_1997_num_24_1_1401");
  });
});

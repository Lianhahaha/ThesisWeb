import { describe, expect, it } from "vitest";
import { parseOjs } from "@/lib/sources/platforms/ojs";

/** One result as an OJS 3 search page renders it (trimmed). */
const result = (href: string, title: string, authors: string, published: string) => `
  <li><div class="obj_article_summary">
    <h3 class="title">
      <a id="article-1" href="${href}">
        ${title}
      </a>
    </h3>
    <div class="meta">
      <div class="authors">
        ${authors}
      </div>
      <div class="published">
        ${published}
      </div>
    </div>
  </div></li>`;

describe("parseOjs", () => {
  const html =
    '<div class="search_results">' +
    result(
      "https://actamedicaphilippina.upm.edu.ph/index.php/acta/article/view/11617",
      "Climate Anxiety among Undergraduate Students in Manila, Philippines",
      "Kent Tristan L. Esteban, Crystal Amiel M. Estrada, PhD, Ernesto R.  Gregorio Jr., MPH, PhD",
      "11/28/2025"
    ) +
    result(
      "https://po.pnuresearchportal.org/ejournal/index.php/normallights/article/view/124",
      "Critical Thinking of College Students",
      "Peter Howard Obias",
      "2015-12-10"
    ) +
    "</div>";

  it("reads title, authors without degrees, year and the article link", () => {
    const [a] = parseOjs(html, { id: "actamedica", publisher: "Acta Medica Philippina" });
    expect(a).toMatchObject({
      title: "Climate Anxiety among Undergraduate Students in Manila, Philippines",
      authors: ["Kent Tristan L. Esteban", "Crystal Amiel M. Estrada", "Ernesto R. Gregorio Jr."],
      year: 2025,
      venue: "Acta Medica Philippina",
      url: "https://actamedicaphilippina.upm.edu.ph/index.php/acta/article/view/11617",
      isOpenAccess: true,
      preprint: false,
      sources: ["actamedica"],
    });
  });

  it("names the journal from the link on a multi-journal portal", () => {
    const papers = parseOjs(html, { id: "pnu", publisher: "Philippine Normal University", journals: { normallights: "The Normal Lights" } });
    expect(papers[0].venue).toBe("Philippine Normal University");
    expect(papers[1]).toMatchObject({ venue: "The Normal Lights", year: 2015, authors: ["Peter Howard Obias"] });
  });

  it("returns nothing for a page with no results", () => {
    expect(parseOjs('<div class="search_results"><div class="cmp_notification notice">No Results</div></div>', { id: "x", publisher: "x" })).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import { parseHerdin } from "@/lib/sources/adapters/herdin";

/** One result as HERDIN's list page renders it (trimmed). */
const result = (cid: number, title: string, authors: string, source: string) => `
  <div class="row researchlist-div">
    <h4><a href="/index.php/component/herdin/?view=research&amp;cid=${cid}">
      ${title}</a></h4>
    <div class="row" name="opt1">
      <div class="col-md-2 listFieldLabel">Author(s)<span class="hidden-sm fieldValueColon">:</span></div>
      <div class="col-md-10">${authors}</div>
    </div>
    <div class="row" name="opt2">
      <div class="col-md-2 listFieldLabel">Source Document<span class="hidden-sm fieldValueColon">:</span></div>
      <div class="col-md-10">${source}</div>
    </div>
    <div class="row" name="opt3">
      <div class="col-md-2 listFieldLabel">Abstract<span class="hidden-sm fieldValueColon">:</span></div>
      <div class="col-md-10"><b>Dengue</b> virus is the etiologic... hemorrhagic fever</div>
    </div>
  </div>`;

describe("parseHerdin", () => {
  const html =
    "<html>" +
    result(
      46658,
      "<b>Dengue</b> <b>vaccine</b>s.",
      "<a href='/index.php/component/herdin/?view=expert&amp;cid=70834'>Gerald&nbsp;B.&nbsp;Jennings</a>",
      "Philippine Journal of Microbiology and Infectious Diseases. 1993; Vol. 22 ( 1 )  : p. 28-30 (Journal)"
    ) +
    result(51799, "A tetravalent <b>dengue</b> vaccine", "K Raviprakash, D Ewing", "Journal of Virology. July 2008; Vol. 82 ( 14 ) : p. 6927 (Journal)") +
    result(60944, "Community involvement in <b>dengue</b> control", "Lourdes&nbsp;B.&nbsp;Villarez", "") +
    "</html>";
  const papers = parseHerdin(html);

  it("reads title, authors, year, journal and record link", () => {
    expect(papers[0]).toMatchObject({
      title: "Dengue vaccines",
      authors: ["Gerald B. Jennings"],
      year: 1993,
      venue: "Philippine Journal of Microbiology and Infectious Diseases",
      url: "https://www.herdin.ph/index.php/component/herdin/?view=research&cid=46658",
      sources: ["herdin"],
    });
    expect(papers[1]).toMatchObject({ authors: ["K Raviprakash", "D Ewing"], year: 2008, venue: "Journal of Virology" });
  });

  it("leaves out the keyword-in-context snippet, which is not an abstract", () => {
    for (const p of papers) expect(p.abstract).toBeNull();
  });

  it("handles a record with no source document", () => {
    expect(papers[2]).toMatchObject({ title: "Community involvement in dengue control", year: null, venue: "HERDIN" });
  });
});

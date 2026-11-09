import { describe, expect, it } from "vitest";
import { parseEurLex } from "@/lib/sources/adapters/eurlex";

const html = `
<div class="SearchResult">
  <h2><a href="./legal-content/AUTO/?uri=CELEX:32003D0291&amp;qid=1" class="title">Decision No 291/2003/EC establishing the European Year of <em>Education</em> through Sport</a></h2>
  <p class="hidden-xs textUnderTitle"><i>OJ L 43, 18.2.2003, pp. 1–5</i></p>
  <div class="DocStatus"><p class="forceIndicator">In force</p></div>
</div>`;

describe("parseEurLex", () => {
  it("maps a legal act to a report record", () => {
    const [paper] = parseEurLex(html);
    expect(paper).toMatchObject({
      title: "Decision No 291/2003/EC establishing the European Year of Education through Sport",
      year: 2003,
      venue: "EUR-Lex",
      type: "report",
      isOpenAccess: true,
      sources: ["eurlex"],
    });
    expect(paper.url).toContain("CELEX:32003D0291");
    expect(paper.abstract).toContain("OJ L 43");
  });
});

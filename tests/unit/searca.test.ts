import { describe, expect, it } from "vitest";
import { parseSearcaDetail, parseSearcaList } from "@/lib/sources/adapters/searca";

const list = `
<table><tbody>
<tr><td>12566</td><td><a class="head-link" href="/lis/book/12566"><span class="head-title12566">Goat meat quality as affected by castration.</span></a></td><td></td><td>goat meat fatty acid sensory</td><td><p><u class="isbn12566">Tranquilan, Jane B.</u></p></td><td>theses</td><td></td><td></td></tr>
</tbody></table>`;

const detail = `
<p><b>Author :</b> Tranquilan, Jane B.</p>
<label>Summary :</label> Three studies were conducted to determine the physical characteristics of goat meat.</p>
<p><b>Material :</b> theses</p>
<p><b>Publisher :</b> University of the Philippines Los Banos (UPLB),</p>
<p><b>Publication Date :</b> April 2009</p>`;

describe("SEARCA parsing", () => {
  it("reads the theses table", () => {
    const [row] = parseSearcaList(list);
    expect(row).toMatchObject({
      id: "12566",
      title: "Goat meat quality as affected by castration.",
      subject: "goat meat fatty acid sensory",
      author: "Tranquilan, Jane B.",
    });
  });

  it("reads the detail page fields", () => {
    expect(parseSearcaDetail(detail)).toMatchObject({
      author: "Tranquilan, Jane B.",
      publisher: "University of the Philippines Los Banos (UPLB),",
      year: 2009,
      type: "thesis",
    });
    expect(parseSearcaDetail(detail).abstract).toContain("physical characteristics");
  });
});

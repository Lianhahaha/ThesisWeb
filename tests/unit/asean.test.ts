import { describe, expect, it } from "vitest";
import { parseAsean } from "@/lib/sources/adapters/asean";

const html = `
<table width="100%"><tr><td>
<a href='https://resourcecentre.asean.org/Book_Detail/?ID=676'><font class='judulbuku'>Rice in South-East Asia</font></a><br>
<font class='ketbuku'>Subtitle : Cultures and Landscapes</font><br>
<font class='ketbuku'>Registration No : B676</font><br>
<font class='ketbuku'>ISBN : 9676530387</font><br>
</td></tr></table>`;

describe("parseAsean", () => {
  it("maps a catalogue card to a book record", () => {
    const [paper] = parseAsean(html);
    expect(paper).toMatchObject({
      title: "Rice in South-East Asia: Cultures and Landscapes",
      venue: "ASEAN Resource Centre",
      type: "book",
      url: "https://resourcecentre.asean.org/Book_Detail/?ID=676",
      sources: ["asean"],
    });
    expect(paper.abstract).toContain("Registration No");
  });
});

import { describe, expect, it } from "vitest";
import { parseNist } from "@/lib/sources/adapters/nist";

const html = `
<article class="nist-teaser">
  <div class="nist-teaser__content-wrapper">
    <header>
      <h3 class="nist-teaser__title"><a href="/publications/robotic-sorting">Robotic Sorting and Artificial Intelligence in Material Recovery Facilities</a></h3>
      <div class="nist-teaser__date"> October 30, 2026 </div>
      <div class="nist-field nist-field--label-inline">
        <div class="nist-field__label">Author(s)</div>
        <div class="nist-field__item"><b>Tanmay Haldankar</b>, <b>Kelsea Schumacher</b></div>
      </div>
    </header>
    <div class="nist-teaser__content"> A mixed-methods study of published research and industry perspectives. </div>
  </div>
</article>`;

describe("parseNist", () => {
  it("maps a NIST teaser to a report record", () => {
    const [paper] = parseNist(html);
    expect(paper).toMatchObject({
      title: "Robotic Sorting and Artificial Intelligence in Material Recovery Facilities",
      authors: ["Tanmay Haldankar", "Kelsea Schumacher"],
      year: 2026,
      venue: "NIST",
      type: "report",
      isOpenAccess: true,
      url: "https://www.nist.gov/publications/robotic-sorting",
      sources: ["nist"],
    });
    expect(paper.abstract).toContain("mixed-methods study");
  });
});

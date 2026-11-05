import { describe, expect, it } from "vitest";
import { parseNcjrs } from "@/lib/sources/adapters/ncjrs";

const html = `
  <div class="views-row">
    <article class="listing-item listing-item--abstract listing-item-row">
      <h3 class="listing-item__title">
        <a href="/ncjrs/virtual-library/abstracts/characteristics-sexual-victimization">Characteristics of Sexual Victimization in Local Jails</a>
      </h3>
      <div class="field__label">Date Published</div>
      <div class="field__item"> October 2026 </div>
      <div class="field__label">Agencies</div>
      <div class="field__items"><span class="field__item">BJS</span></div>
      <a href="https://bjs.ojp.gov/document/example.pdf">Full Report (PDF)</a>
    </article>
  </div>`;

describe("parseNcjrs", () => {
  it("reads the title, year, agency and free PDF link", () => {
    const [paper] = parseNcjrs(html);
    expect(paper).toMatchObject({
      title: "Characteristics of Sexual Victimization in Local Jails",
      year: 2026,
      venue: "BJS",
      publisher: "BJS",
      type: "report",
      openAccessUrl: "https://bjs.ojp.gov/document/example.pdf",
      isOpenAccess: true,
      url: "https://www.ojp.gov/ncjrs/virtual-library/abstracts/characteristics-sexual-victimization",
      sources: ["ncjrs"],
    });
  });
});

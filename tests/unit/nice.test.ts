import { describe, expect, it } from "vitest";
import { parseNice } from "@/lib/sources/adapters/nice";

const html = `
<ol class="SearchCardList_list__Uazb8">
<li class="SearchCardList_listItem__4We2l">
  <div class="card">
    <p class="card__heading"><a href="/guidance/ng17"><span>Type 1 diabetes in adults: diagnosis and management (NG17)</span></a></p>
    <p class="card__summary"><span>This guideline covers care and treatment for adults with type 1 diabetes.</span></p>
    <dl class="card__metadata">
      <div><dt>Result type</dt><dd>NICE guideline</dd></div>
      <div><dt>Last updated</dt><dd>17 August 2022</dd></div>
    </dl>
  </div>
</li>
</ol>`;

describe("parseNice", () => {
  it("maps a NICE card to a report record", () => {
    const [paper] = parseNice(html);
    expect(paper).toMatchObject({
      title: "Type 1 diabetes in adults: diagnosis and management (NG17)",
      year: 2022,
      venue: "NICE",
      type: "report",
      isOpenAccess: true,
      keywords: ["NICE guideline"],
      url: "https://www.nice.org.uk/guidance/ng17",
      sources: ["nice"],
    });
    expect(paper.abstract).toContain("care and treatment");
  });
});

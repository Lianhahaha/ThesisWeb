import { describe, expect, it } from "vitest";
import { parseUpd } from "@/lib/sources/adapters/upd";

/** One result as UP Diliman's search page renders it (trimmed). */
const result = (id: number, title: string, author: string, date: string, abstract: string) => `
  <div class="post_content">
    <div class="post_meta">
      <h3>
        <a href="https://digitalarchives.upd.edu.ph/item/${id}/7/KFL36a3L94bDC8ifMImDk1hF">${title}</a>
      </h3>
      <div class="metaInfo"><span><i class="fa fa-user" title="Author"></i> By <strong>${author}</strong></span><span><i class="fa fa-calendar" title="Date"></i>&nbsp;<strong>${date}</strong></span><span><i class="fa fa-archive" title="Item Type"></i>&nbsp;<strong>Thesis/Dissertation</strong></span></div></div>
    <blockquote class="default"><div class="divAbstract"><p class="item-desc">${abstract}</p></div></blockquote>
    <div class="post_meta"><span><i class="fa fa-tags" title="Keywords"></i>&nbsp;biocultural landscapes; Ethnopharmacology--Siquijor Island</span></div><div><hr /></div></div>`;

describe("parseUpd", () => {
  const html =
    "<html>" +
    result(64348, "MIS[bo]tika: a landscape planning framework for Siquijor Island", "Abucot, Jaylord S.", "June 2026", "Siquijor is an island.<br />\n<br />\nTo address, the study&nbsp;develops a framework.") +
    result(34411, "Use of electronic resources by undergraduate students", "Tavora, Hazel Anne B.", "2012", "") +
    "</html>";
  const papers = parseUpd(html);

  it("reads title, author, year, abstract, keywords and a stable record link", () => {
    expect(papers).toHaveLength(2);
    expect(papers[0]).toMatchObject({
      title: "MIS[bo]tika: a landscape planning framework for Siquijor Island",
      authors: ["Jaylord S. Abucot"],
      year: 2026,
      venue: "UP Diliman Thesis / Dissertation",
      abstract: "Siquijor is an island. To address, the study develops a framework.",
      keywords: ["biocultural landscapes", "Ethnopharmacology--Siquijor Island"],
      url: "https://digitalarchives.upd.edu.ph/item/64348/7/home",
      sources: ["upd"],
    });
  });

  it("leaves the abstract empty when the record has none", () => {
    expect(papers[1]).toMatchObject({ year: 2012, abstract: null });
  });

  it("does not claim free full text", () => {
    for (const p of papers) expect(p.isOpenAccess).toBe(false);
  });
});

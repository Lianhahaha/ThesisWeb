import { describe, expect, it } from "vitest";
import { abstractFromHtml, isAllowedUrl } from "@/lib/server/abstract";

const LONG = "Teacher burnout was measured in 400 public school teachers in Iloilo using the Maslach Burnout Inventory, and workload predicted emotional exhaustion.";

describe("abstractFromHtml", () => {
  it("reads the citation or Dublin Core meta tag (OJS, repositories)", () => {
    expect(abstractFromHtml(`<meta name="DC.Description" xml:lang="en" content="${LONG}"/>`)).toBe(LONG);
    expect(abstractFromHtml(`<meta content="Abstract: ${LONG}" name="citation_abstract">`)).toBe(LONG);
  });

  it("reads the text under an Abstract heading (HERDIN, Philippine E-Journals)", () => {
    const html = `<div class="border3"><h4>Abstract</h4></div> <div style="text-align: justify;">${LONG}</div><h4>Keywords</h4>`;
    expect(abstractFromHtml(html)).toBe(LONG);
  });

  it("finds the full paragraph a shortened og:description starts (SERP-P, J-STAGE)", () => {
    const html = `<meta property="og:description" content="${LONG.slice(0, 100)} &hellip;"><body><p>${LONG}</p></body>`;
    expect(abstractFromHtml(html)).toBe(LONG);
  });

  it("ignores taglines, teasers and menus", () => {
    expect(abstractFromHtml(`<meta name="description" content="HERDIN is an online portal for health research.">`)).toBeNull();
    expect(abstractFromHtml(`<select><option>Abstract</option></select><p>Short text.</p>`)).toBeNull();
  });
});

describe("isAllowedUrl", () => {
  it("allows only the databases' own sites", () => {
    expect(isAllowedUrl("https://www.herdin.ph/index.php/component/herdin/?view=research&cid=1")).toBe(true);
    expect(isAllowedUrl("https://serp-p.pids.gov.ph/publication/public/view?slug=x")).toBe(true);
    expect(isAllowedUrl("http://169.254.169.254/latest/meta-data")).toBe(false);
    expect(isAllowedUrl("https://evil.example/herdin.ph")).toBe(false);
    expect(isAllowedUrl("javascript:alert(1)")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { parseSerpp } from "@/lib/sources/adapters/serpp";

/** One result as SERP-P's search page renders it (trimmed). */
const result = (slug: string, title: string, institution: string, series: string, year: string) => `
  <div class="list-content">
    <h3 class="list-content-title"><a href="/publication/public/view?slug=${slug}" class="text-decoration-none color-primary">${title}</a></h3>
    <div class="meta meta-h">
      <div class="me-3"><i class="fas fa-edit me-1" aria-hidden="true"></i>${institution}</div>
      <div class="me-3"><i class="fas fa-file-alt me-1" aria-hidden="true"></i>${series}</div>
      <div class="me-3"><i class="fas fa-calendar-alt me-1" aria-hidden="true"></i>${year}</div>
      <div><i class="fas fa-file-download me-1" aria-hidden="true"></i>203 Downloads</div>
    </div>
  </div>`;

describe("parseSerpp", () => {
  const papers = parseSerpp(
    "<h3 class=\"color-primary-1 fw-bold text-center\">2 related posts found</h3>" +
      result("market-and-state", "Market and State in Philippine Agricultural Policy", "PIDS", "DP 2022-08", "2022") +
      result("energy-and-rice-prices", "Energy and Rice Prices &amp; Inflation", "BSP", "BSP DP 2025-02", "2025")
  );

  it("reads title, year, series and record link", () => {
    expect(papers[0]).toMatchObject({
      title: "Market and State in Philippine Agricultural Policy",
      year: 2022,
      venue: "PIDS DP 2022-08",
      url: "https://serp-p.pids.gov.ph/publication/public/view?slug=market-and-state",
      sources: ["serpp"],
    });
  });

  it("doesn't repeat an institution the series already names", () => {
    expect(papers[1]).toMatchObject({ title: "Energy and Rice Prices & Inflation", venue: "BSP DP 2025-02" });
  });
});

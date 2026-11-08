import { afterEach, describe, expect, it, vi } from "vitest";
import { searchNvd } from "@/lib/sources/adapters/nvd";
import { searchPedro } from "@/lib/sources/adapters/pedro";

afterEach(() => vi.unstubAllGlobals());

describe("NVD", () => {
  it("maps a CVE record to a citation-ready paper", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          vulnerabilities: [
            {
              cve: {
                id: "CVE-2024-0001",
                published: "2024-01-02T10:00:00.000",
                descriptions: [{ lang: "en", value: "SQL injection in Example 1.0 allows remote attackers to run SQL." }],
                weaknesses: [{ description: [{ value: "CWE-89" }] }],
              },
            },
          ],
        })
      )
    );
    const [p] = await searchNvd("sql injection", { perSource: 5 });
    expect(p).toMatchObject({
      title: "CVE-2024-0001: SQL injection in Example 1.0 allows remote attackers to run SQL.",
      year: 2024,
      venue: "NVD (NIST)",
      url: "https://nvd.nist.gov/vuln/detail/CVE-2024-0001",
      isOpenAccess: true,
    });
    expect(p.authors).toEqual([]);
  });
});

describe("PEDro", () => {
  it("reads authors, year, venue and DOI from the detail page", async () => {
    const searchHtml = `<table class="search-results"><tr>
      <td><a href="https://search.pedro.org.au/search-results/record-detail/123"
        class="left">A trial of strength training</a></td>
      <td>clinical trial</td><td>7/10</td></tr></table>`;
    const detailHtml = `<table class="browse_records">
      <tr><td><strong>A trial of strength training</strong></td></tr>
      <tr><td>Doe J, Roe A</td></tr>
      <tr><td>Journal of Sports Science 2024 Jan</td></tr>
      <tr><td>clinical trial</td></tr>
      <tr><td><a href="https://dx.doi.org/10.1234/abc">DOI</a></td></tr>
    </table>`;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => new Response(url.includes("record-detail") ? detailHtml : searchHtml, { status: 200 }))
    );
    const [p] = await searchPedro("strength", { perSource: 3 });
    expect(p).toMatchObject({
      title: "A trial of strength training",
      authors: ["J Doe", "A Roe"],
      year: 2024,
      venue: "Journal of Sports Science",
      doi: "10.1234/abc",
      type: "article",
    });
  });
});

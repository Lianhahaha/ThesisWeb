import { afterEach, describe, expect, it, vi } from "vitest";
import { parseAgrisResults, searchAgris } from "@/lib/sources/adapters/agris";

const html = `
<div class="dynamic-list">
  <div class="col-md-12">
    <h6><a class="me-1" href="/search/en/records/aaa" data-agris-title> Rice breeding for drought tolerance. </a></h6>
    <p class="m-0 p-0">2024</p>
    <p>Lund, Thomas Bøker | Olsen, Søren Bøye</p>
    <div class="abstract mb-3"><p id="abstract_aaa" data-agris-abstract> A field study of upland rice. </p></div>
  </div>
  <div class="col-md-12">
    <h6><a class="me-1" href="/search/en/records/bbb" data-agris-title> Fisheries extension in Southeast Asia. </a></h6>
    <p>Reyes, Ana</p>
    <div class="abstract mb-3"><p id="abstract_bbb" data-agris-abstract> Extension services for small-scale fishers. </p></div>
  </div>
  <div class="col-md-12">
    <h6><a class="me-1" href="/search/en/records/ccc" data-agris-title> Future-dated conference paper. </a></h6>
    <p class="m-0 p-0">2028</p>
    <p>Dela Cruz, Juan</p>
    <div class="abstract mb-3"><p id="abstract_ccc" data-agris-abstract> A paper with a bad year. </p></div>
  </div>
</div>`;

afterEach(() => vi.unstubAllGlobals());

describe("parseAgrisResults", () => {
  it("reads titles, years, authors, abstracts and record links", () => {
    const papers = parseAgrisResults(html);
    expect(papers).toHaveLength(3);
    expect(papers[0]).toMatchObject({
      title: "Rice breeding for drought tolerance.",
      year: 2024,
      authors: ["Lund, Thomas Bøker", "Olsen, Søren Bøye"],
      abstract: "A field study of upland rice.",
      url: "https://agris.fao.org/search/en/records/aaa",
      sources: ["agris"],
    });
    expect(papers[1].year).toBeNull();
    expect(papers[2].year).toBeNull();
  });
});

describe("searchAgris", () => {
  it("applies the year filter after parsing", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(html, { status: 200 })));
    const papers = await searchAgris("rice", { fromYear: 2025 });
    expect(papers.map((p) => p.title)).toEqual([
      "Fisheries extension in Southeast Asia.",
      "Future-dated conference paper.",
    ]);
  });
});

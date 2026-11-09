import { describe, expect, it } from "vitest";
import { arxivQuery, parseArxivHtml } from "@/lib/sources/adapters/arxiv";

const html = `
<ol class="breathe-horizontal">
  <li class="arxiv-result">
    <p class="list-title is-inline-block"><a href="https://arxiv.org/abs/2611.09177">arXiv:2611.09177</a></p>
    <p class="title is-5 mathjax"> Analyzing Code Provenance in LLMs for Programming <span class="search-hit mathjax">Education</span> </p>
    <p class="authors">
      <span class="has-text-black-bis has-text-weight-semibold">Authors:</span>
      <a href="/search/?searchtype=author&amp;query=Maity">Subhankar Maity</a>,
      <a href="/search/?searchtype=author&amp;query=Boucelma">Omar Boucelma</a>
    </p>
    <p class="abstract mathjax">
      <span class="abstract-full has-text-grey-dark mathjax" style="display: none;">
        Large language models play an increasing role in programming education.
      </span>
    </p>
    <p class="is-size-7"><span class="has-text-black-bis has-text-weight-semibold">Submitted</span> 6 November, 2026; <span class="has-text-black-bis has-text-weight-semibold">originally announced</span> November 2026.</p>
  </li>
</ol>`;

describe("parseArxivHtml", () => {
  it("maps the server-rendered search result", () => {
    const [paper] = parseArxivHtml(html);
    expect(paper).toMatchObject({
      title: "Analyzing Code Provenance in LLMs for Programming Education",
      authors: ["Subhankar Maity", "Omar Boucelma"],
      year: 2026,
      venue: "arXiv",
      type: "preprint",
      openAccessUrl: "https://arxiv.org/pdf/2611.09177.pdf",
      url: "https://arxiv.org/abs/2611.09177",
      sources: ["arxiv"],
    });
    expect(paper.abstract).toContain("programming education");
  });
});

describe("arxivQuery", () => {
  it("requires every word and keeps the country clause", () => {
    expect(arxivQuery('reading comprehension AND ("Philippines" OR "Filipino")')).toBe(
      'all:reading AND all:comprehension AND (all:"Philippines" OR all:"Filipino")'
    );
  });
});

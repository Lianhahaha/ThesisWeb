import { describe, expect, it } from "vitest";
import { parsePlaridel, parsePlaridelDate } from "@/lib/sources/adapters/plaridel";

const html = `
<div class="post-8770 article type-article status-publish">
  <h4><a href="https://www.plarideljournal.org/article/example/" rel="bookmark">Bridging the Gap: Data Journalism Education</a><br /> <small>Article</small></h4>
  <p><strong>Abstract</strong></p>
  <p>This study addresses the growing demand for data journalism education.</p>
  <div class="post-metadata">
    <span class="authors">
      <span class="author-item author-8766"><a href="/may-akda/suherman-ansar/" title="Suherman, Ansar">Suherman, Ansar</a></span>
    </span>
    <div class="post_tags" title="Tags"><ul><li><a href="/tag/curriculum/" title="curriculum design">curriculum design</a></li></ul></div>
  </div>
</div>`;

describe("parsePlaridel", () => {
  it("reads the article list row", () => {
    const [row] = parsePlaridel(html);
    expect(row).toMatchObject({
      title: "Bridging the Gap: Data Journalism Education",
      type: "Article",
      authors: ["Suherman, Ansar"],
      keywords: ["curriculum design"],
      url: "https://www.plarideljournal.org/article/example/",
    });
    expect(row.abstract).toContain("data journalism education");
  });

  it("reads the publication date from JSON-LD", () => {
    expect(parsePlaridelDate('"datePublished":"2026-06-18T10:00:07+00:00"')).toEqual({
      year: 2026,
      date: "2026-06-18",
    });
  });
});

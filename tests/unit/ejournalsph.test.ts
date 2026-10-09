import { describe, expect, it } from "vitest";
import { parseEjournalsArticle, parseEjournalsList } from "@/lib/sources/adapters/ejournalsph";
import { decodeEntities } from "@/lib/text";

describe("parseEjournalsList", () => {
  const html = `
    <div id="journal">
      <div class="search_item"><a href="issue.php?id=2668"><h2>International Journal of Transformative Studies</h2></a><p>About the journal.</p></div>
    </div>
    <div id="article">
      <div class="search_item">
        <a href="article.php?id=19926"><h2 class="author">University Students&rsquo; Climate Change Knowledge</h2></a>
        <p style="font-style: italic;"><a target='_blank' class='' href='function/author.php?id=25773'>Alma M. Corpuz</a>.</p>
      </div>
      <div class="search_item">
        <a href="article.php?id=21462"><h2 class="author">Climate Change Strategies&rsquo; Model in Teaching Science 7</h2></a>
        <p style="font-style: italic;"></p>
      </div>`;

  it("reads article hits only, not the journals listed above them", () => {
    expect(parseEjournalsList(html)).toEqual([
      { id: "19926", title: "University Students’ Climate Change Knowledge", author: "Alma M. Corpuz" },
      { id: "21462", title: "Climate Change Strategies’ Model in Teaching Science 7", author: null },
    ]);
  });
});

describe("parseEjournalsArticle", () => {
  const html = `
    <meta name="citation_title" content="Attitude of Households Towards Climate Change Adaptation in Real, Quezon">
    <meta name="citation_author" content="Angelica  Uy, ">
    <meta name="citation_author" content="Tish Marthia  Rebong, ">
    <meta name="citation_publication_date" content="2023">
    <meta name="citation_journal_title" content="Ani: Letran Calamba Research Report">
    <meta name="citation_pdf_url" content="uploads/archive/ANI/Vol. 19 No. 1 (2023)/Ps/24 Attitude of Households.pdf">
    <div class="desc2">
      <h4>Abstract:</h4>
      <p>This study focused on the households&rsquo;
      attitude toward climate change adaptation.</p>
    </div>`;

  it("reads authors, year, journal, abstract and the free PDF", () => {
    expect(parseEjournalsArticle(html, "19629")).toMatchObject({
      title: "Attitude of Households Towards Climate Change Adaptation in Real, Quezon",
      authors: ["Angelica Uy", "Tish Marthia Rebong"],
      year: 2023,
      venue: "Ani: Letran Calamba Research Report",
      abstract: "This study focused on the households’ attitude toward climate change adaptation.",
      openAccessUrl: "https://ejournals.ph/uploads/archive/ANI/Vol.%2019%20No.%201%20(2023)/Ps/24%20Attitude%20of%20Households.pdf",
      isOpenAccess: true,
      url: "https://ejournals.ph/article.php?id=19629",
      sources: ["ejournalsph"],
    });
  });

  it("returns null for a page with no title", () => {
    expect(parseEjournalsArticle("<html></html>", "1")).toBeNull();
  });
});

describe("decodeEntities", () => {
  it("decodes typographic punctuation", () => {
    expect(decodeEntities("&ldquo;Kapwa&rdquo; &ndash; students&rsquo; view&hellip;")).toBe("“Kapwa” – students’ view…");
  });
});

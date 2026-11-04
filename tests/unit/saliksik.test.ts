import { describe, expect, it } from "vitest";
import { parseSaliksikArticle, parseSaliksikSearch } from "@/lib/sources/adapters/saliksik";

describe("parseSaliksikSearch", () => {
  it("keeps published records and ignores drafts", () => {
    expect(
      parseSaliksikSearch({
        publications: [
          { id: 1, title: "A study", status: "Published", journal_id: "DA-26" },
          { id: 2, title: "Still a draft", status: "Draft" },
          { id: 3, title: "" },
        ],
      })
    ).toEqual([{ id: 1, title: "A study", status: "Published", journal_id: "DA-26" }]);
  });
});

describe("parseSaliksikArticle", () => {
  it("reads the title, authors, journal and year from an article page", () => {
    const html = `
      <meta name="citation_title" content="Pagsasapanganib ng Wika">
      <meta name="citation_journal_title" content="Daluyan: Journal ng Wikang Filipino">
      <meta name="citation_publication_date" content="2021-08-30">
      <strong>Author(s):</strong>
      <a href="/authors/Jonevee%20B.%20Amparo">Jonevee B. Amparo</a>`;

    expect(parseSaliksikArticle(html)).toEqual({
      title: "Pagsasapanganib ng Wika",
      authors: ["Jonevee B. Amparo"],
      year: 2021,
      venue: "Daluyan: Journal ng Wikang Filipino",
    });
  });
});

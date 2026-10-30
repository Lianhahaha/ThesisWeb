import { describe, expect, it } from "vitest";
import { ieeeArticleToPaper, ieeePages } from "@/lib/sources/adapters/ieee";

const article = {
  title: "  A   Study of Reading Comprehension  ",
  abstract: "An abstract.",
  doi: "10.1109/ICOEI48184.2020.9142886",
  publication_title: "2020 4th International Conference on Trends in Electronics and Informatics",
  publication_year: 2020,
  publication_date: "15-17 June 2020",
  content_type: "Conferences",
  volume: "9",
  issue: "2",
  start_page: "956",
  end_page: "960",
  publisher: "IEEE",
  citing_paper_count: 10,
  access_type: "LOCKED",
  article_number: "9142886",
  html_url: "https://ieeexplore.ieee.org/document/9142886/",
  pdf_url: "https://ieeexplore.ieee.org/stamp/stamp.jsp?arnumber=9142886",
  authors: {
    authors: [
      { full_name: "Second Author", author_order: 2 },
      { full_name: "First Author", author_order: 1 },
    ],
  },
  index_terms: {
    author_terms: { terms: ["Reading", "Comprehension"] },
    ieee_terms: { terms: ["Reading", "Machine learning"] },
  },
};

describe("ieeeArticleToPaper", () => {
  it("maps a conference paper into the app's shape", () => {
    const paper = ieeeArticleToPaper(article)!;
    expect(paper.title).toBe("A Study of Reading Comprehension");
    expect(paper.authors).toEqual(["First Author", "Second Author"]);
    expect(paper.year).toBe(2020);
    expect(paper.publishedDate).toBeNull();
    expect(paper.type).toBe("conference");
    expect(paper.venue).toBe(article.publication_title);
    expect(paper.volume).toBe("9");
    expect(paper.issue).toBe("2");
    expect(paper.pages).toBe("956-960");
    expect(paper.doi).toBe("10.1109/ICOEI48184.2020.9142886");
    expect(paper.citedByCount).toBe(10);
    expect(paper.keywords).toEqual(["Reading", "Comprehension", "Machine learning"]);
    expect(paper.url).toBe(article.html_url);
    expect(paper.sources).toEqual(["ieee"]);
  });

  it("does not treat a paywalled PDF link as open access", () => {
    const paper = ieeeArticleToPaper(article)!;
    expect(paper.isOpenAccess).toBe(false);
    expect(paper.openAccessUrl).toBeNull();
  });

  it("uses the PDF link for open-access records", () => {
    const paper = ieeeArticleToPaper({ ...article, access_type: "Open Access" })!;
    expect(paper.isOpenAccess).toBe(true);
    expect(paper.openAccessUrl).toBe(article.pdf_url);
  });

  it("reads the year from the date when publication_year is missing", () => {
    const paper = ieeeArticleToPaper({
      ...article,
      publication_year: undefined,
      publication_date: "April 1997",
    })!;
    expect(paper.year).toBe(1997);
  });

  it("types the other content types", () => {
    expect(ieeeArticleToPaper({ ...article, content_type: "Journals" })!.type).toBe("article");
    expect(ieeeArticleToPaper({ ...article, content_type: "Books" })!.type).toBe("book");
    expect(ieeeArticleToPaper({ ...article, content_type: "Standards" })!.type).toBe("report");
  });

  it("falls back to the document URL when html_url is missing", () => {
    const paper = ieeeArticleToPaper({ ...article, html_url: undefined })!;
    expect(paper.url).toBe("https://ieeexplore.ieee.org/document/9142886");
  });

  it("drops a record with no title", () => {
    expect(ieeeArticleToPaper({ ...article, title: "   " })).toBeNull();
  });
});

describe("ieeePages", () => {
  it("uses one page when start and end match", () => {
    expect(ieeePages({ start_page: "5", end_page: "5" })).toBe("5");
  });

  it("keeps a lone start page", () => {
    expect(ieeePages({ start_page: "5" })).toBe("5");
  });

  it("returns null when there are no pages", () => {
    expect(ieeePages({})).toBeNull();
  });
});

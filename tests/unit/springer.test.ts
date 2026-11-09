import { afterEach, describe, expect, it, vi } from "vitest";
import { parseSpringer, searchSpringer } from "@/lib/sources/adapters/springer";

const data = {
  records: [
    {
      contentType: "Article",
      title: "Reliance on model-based and model-free control in obesity",
      creators: [{ creator: "Janssen, Lieneke K." }, { creator: "Mahner, Florian P." }],
      publicationName: "Scientific Reports",
      publicationDate: "2020-12-15",
      abstract: "A study of control strategies.",
      doi: "10.1038/s41598-020-79929-0",
      openaccess: "true",
      url: [
        { format: "html", value: "https://www.nature.com/articles/s41598-020-79929-0" },
        { format: "pdf", value: "https://www.nature.com/articles/s41598-020-79929-0.pdf" },
      ],
    },
  ],
};

const originalKey = process.env.SPRINGER_NATURE_API_KEY;
afterEach(() => {
  vi.unstubAllGlobals();
  if (originalKey == null) delete process.env.SPRINGER_NATURE_API_KEY;
  else process.env.SPRINGER_NATURE_API_KEY = originalKey;
});

describe("parseSpringer", () => {
  it("maps a record and its open-access PDF", () => {
    const [paper] = parseSpringer(data);
    expect(paper).toMatchObject({
      title: "Reliance on model-based and model-free control in obesity",
      authors: ["Lieneke K. Janssen", "Florian P. Mahner"],
      year: 2020,
      venue: "Scientific Reports",
      type: "article",
      doi: "10.1038/s41598-020-79929-0",
      isOpenAccess: true,
      openAccessUrl: "https://www.nature.com/articles/s41598-020-79929-0.pdf",
      sources: ["springer"],
    });
  });
});

describe("searchSpringer", () => {
  it("returns nothing without a key", async () => {
    delete process.env.SPRINGER_NATURE_API_KEY;
    await expect(searchSpringer("machine learning")).resolves.toEqual([]);
  });
});

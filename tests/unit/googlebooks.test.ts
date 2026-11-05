import { afterEach, describe, expect, it, vi } from "vitest";
import { searchGoogleBooks } from "@/lib/sources/adapters/googlebooks";

const response = {
  items: [
    {
      id: "abc",
      volumeInfo: {
        title: "Teaching Reading",
        subtitle: "A Practical Guide",
        authors: ["Ana Cruz"],
        publishedDate: "2021-05-01",
        publisher: "Example Press",
        description: "A guide for teachers.",
        categories: ["Education"],
        previewLink: "https://books.google.com/books?id=abc",
        infoLink: "https://books.google.com/books?id=abc",
      },
      accessInfo: { viewability: "PARTIAL", publicDomain: false },
    },
    {
      id: "old",
      volumeInfo: {
        title: "Old Book",
        publishedDate: "2018",
        previewLink: "https://books.google.com/books?id=old",
      },
      accessInfo: { viewability: "ALL_PAGES", publicDomain: true },
    },
  ],
};

const originalKey = process.env.GOOGLE_BOOKS_API_KEY;

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalKey == null) delete process.env.GOOGLE_BOOKS_API_KEY;
  else process.env.GOOGLE_BOOKS_API_KEY = originalKey;
});

describe("searchGoogleBooks", () => {
  it("maps a volume to a book record and applies the year filter", async () => {
    process.env.GOOGLE_BOOKS_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(response), { status: 200 }))
    );
    const papers = await searchGoogleBooks("reading", { fromYear: 2020, perSource: 10 });
    expect(papers).toHaveLength(1);
    expect(papers[0]).toMatchObject({
      title: "Teaching Reading: A Practical Guide",
      authors: ["Ana Cruz"],
      year: 2021,
      venue: "Example Press",
      type: "book",
      isOpenAccess: false,
      sources: ["googlebooks"],
    });
  });

  it("keeps only fully viewable volumes when open access is requested", async () => {
    process.env.GOOGLE_BOOKS_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(response), { status: 200 }))
    );
    const papers = await searchGoogleBooks("reading", { openAccessOnly: true });
    expect(papers.map((p) => p.title)).toEqual(["Old Book"]);
    expect(papers[0].openAccessUrl).toBe("https://books.google.com/books?id=old");
  });

  it("does not call the shared quota without a key", async () => {
    delete process.env.GOOGLE_BOOKS_API_KEY;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(searchGoogleBooks("reading")).rejects.toThrow("GOOGLE_BOOKS_API_KEY not configured");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

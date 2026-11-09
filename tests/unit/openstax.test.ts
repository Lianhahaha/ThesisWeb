import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  openstaxScore,
  resetOpenStaxCache,
  searchOpenStax,
} from "@/lib/sources/adapters/openstax";

function book(overrides: Record<string, unknown>) {
  return {
    id: 1,
    meta: { html_url: "https://openstax.org/details/books/example" },
    title: "Example Book",
    book_state: "live",
    description: "<p>A description.</p>",
    publish_date: "2021-03-05",
    authors: [{ type: "author", value: { name: "Ana Cruz" } }],
    book_subjects: [{ subject_name: "Science" }],
    book_categories: [],
    pdf_url: "https://example.org/book.pdf",
    webview_rex_link: "https://openstax.org/books/example/pages/1-introduction",
    ...overrides,
  };
}

function catalogue(items: unknown[], total = items.length) {
  return new Response(JSON.stringify({ meta: { total_count: total }, items }), { status: 200 });
}

beforeEach(() => {
  resetOpenStaxCache();
});

afterEach(() => {
  vi.unstubAllGlobals();
  resetOpenStaxCache();
});

describe("openstaxScore", () => {
  it("matches plural and inflected forms", () => {
    const b = book({ title: "College Success", description: "Reading strategies for students." });
    expect(openstaxScore(b, "reading strategy")).toBe(2);
    expect(openstaxScore(b, "marine biology")).toBe(0);
  });
});

describe("searchOpenStax", () => {
  it("maps a live matching book and ignores retired and out-of-range records", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        catalogue([
          book({ id: 1, title: "Calculus Volume 1", description: "Limits and derivatives." }),
          book({ id: 2, title: "Retired Calculus", book_state: "retired" }),
          book({ id: 3, title: "College Algebra", publish_date: "2015-02-13" }),
        ])
      )
    );

    const papers = await searchOpenStax("calculus", { fromYear: 2020, perSource: 10 });

    expect(papers).toHaveLength(1);
    expect(papers[0]).toMatchObject({
      title: "Calculus Volume 1",
      authors: ["Ana Cruz"],
      year: 2021,
      venue: "OpenStax",
      publisher: "OpenStax",
      type: "book",
      isOpenAccess: true,
      openAccessUrl: "https://example.org/book.pdf",
      sources: ["openstax"],
    });
  });

  it("returns nothing for a query made only of stop words, without calling the API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(searchOpenStax("the and of")).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reads every catalogue page and caches the result", async () => {
    const first = Array.from({ length: 100 }, (_, i) =>
      book({ id: i + 1, title: `Test Book ${i + 1}` })
    );
    const second = [book({ id: 101, title: "Test Book 101" })];
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => (++calls === 1 ? catalogue(first, 101) : catalogue(second, 101)))
    );

    const papers = await searchOpenStax("test book", { perSource: 15 });
    const again = await searchOpenStax("test book", { perSource: 15 });

    expect(papers).toHaveLength(15);
    expect(again).toHaveLength(15);
    expect(calls).toBe(2);
  });
});

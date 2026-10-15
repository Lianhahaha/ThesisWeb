import { describe, expect, it } from "vitest";
import { workToPaper } from "@/lib/sources/adapters/openalex";
import { pageRange } from "@/lib/text";

const work = (over: Record<string, unknown>) =>
  workToPaper({ id: "https://openalex.org/W1", title: "A study", ...over } as Parameters<typeof workToPaper>[0]);

describe("workToPaper citation details", () => {
  it("reads volume, issue, pages and publisher", () => {
    const p = work({
      type: "article",
      biblio: { volume: "12", issue: "3", first_page: "45", last_page: "67" },
      primary_location: { source: { display_name: "Journal of X", type: "journal", host_organization_name: "Elsevier BV" } },
    });
    expect(p).toMatchObject({ type: "article", volume: "12", issue: "3", pages: "45-67", publisher: "Elsevier BV" });
  });

  it("tells a conference paper from a journal article by its source", () => {
    expect(work({ type: "article", primary_location: { source: { type: "conference" } } }).type).toBe("conference");
    expect(work({ type: "article", primary_location: { source: { type: "repository" } } }).type).toBeUndefined();
  });

  it("maps theses, chapters and preprints", () => {
    expect(work({ type: "dissertation" }).type).toBe("thesis");
    expect(work({ type: "book-chapter" }).type).toBe("chapter");
    expect(work({ type: "preprint" }).type).toBe("preprint");
  });
});

describe("pageRange", () => {
  it("joins first and last page, and keeps a single page alone", () => {
    expect(pageRange("45", "67")).toBe("45-67");
    expect(pageRange("103778", "103778")).toBe("103778");
    expect(pageRange(null, "9")).toBeNull();
  });
});

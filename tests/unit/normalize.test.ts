import { describe, expect, it } from "vitest";
import { normalizePaper } from "@/lib/sources/normalize";
import type { Paper } from "@/lib/types";

const raw = (over: Record<string, unknown>) =>
  ({ id: "x", title: "A title", authors: [], year: 2024, sources: [], ...over }) as unknown as Paper;

describe("normalizePaper", () => {
  it("drops records without a title", () => {
    expect(normalizePaper(raw({ title: "   " }), "src")).toBeNull();
  });

  it("blocks non-http links", () => {
    expect(normalizePaper(raw({ isOpenAccess: true, openAccessUrl: "javascript:alert(1)" }), "src")?.openAccessUrl).toBeNull();
    expect(normalizePaper(raw({ isOpenAccess: true, openAccessUrl: "https://x.org/a.pdf" }), "src")?.openAccessUrl).toBe(
      "https://x.org/a.pdf"
    );
  });

  it("counts a record as free only with a free link, and a link as free only when flagged", () => {
    expect(normalizePaper(raw({ isOpenAccess: true }), "src")?.isOpenAccess).toBe(false);
    // A paywalled page sent as the free link stays reachable, as the record's link.
    const closed = normalizePaper(raw({ isOpenAccess: false, openAccessUrl: "https://publisher.com/x" }), "src");
    expect(closed).toMatchObject({ isOpenAccess: false, openAccessUrl: null, url: "https://publisher.com/x" });
  });

  it("reduces DOI links to bare DOIs and keeps bare ones intact", () => {
    expect(normalizePaper(raw({ doi: "https://doi.org/10.1234/ab" }), "src")?.doi).toBe("10.1234/ab");
    expect(normalizePaper(raw({ doi: "10.1002/(sici)1097(1998)" }), "src")?.doi).toBe("10.1002/(sici)1097(1998)");
    expect(normalizePaper(raw({ doi: "10.1234/ab" }), "src")?.id).toBe("doi:10.1234/ab");
  });

  it("rejects impossible years and non-string authors", () => {
    const n = normalizePaper(raw({ year: 20231, authors: ["A B", 7, null, " "] }), "src");
    expect(n?.year).toBeNull();
    expect(n?.authors).toEqual(["A B"]);
  });

  it("strips markup and entities from text fields", () => {
    const n = normalizePaper(
      raw({
        title: "Teacher <i>burnout</i> &amp; pay",
        abstract: "<jats:p>Findings &lt;b&gt;strong&lt;/b&gt;</jats:p>",
        authors: ["<b>Ana</b> Cruz"],
        venue: "<i>Journal</i>",
      }),
      "src"
    );
    expect(n?.title).toBe("Teacher burnout & pay");
    // Decoded entities are literal text, not live markup.
    expect(n?.abstract).toBe("Findings <b>strong</b>");
    expect(n?.authors).toEqual(["Ana Cruz"]);
    expect(n?.venue).toBe("Journal");
  });

  it("keeps citation details, as text, and drops an unknown record type", () => {
    const n = normalizePaper(raw({ type: "thesis", volume: 12, issue: "3", pages: " 45-67 ", publisher: "UP Diliman" }), "src");
    expect(n).toMatchObject({ type: "thesis", volume: "12", issue: "3", pages: "45-67", publisher: "UP Diliman" });
    expect(normalizePaper(raw({ type: "podcast", volume: {} }), "src")).toMatchObject({ type: undefined, volume: null });
  });

  it("always names its source", () => {
    expect(normalizePaper(raw({ sources: undefined }), "src")?.sources).toEqual(["src"]);
  });
});

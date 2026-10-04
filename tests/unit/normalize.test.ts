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
    expect(normalizePaper(raw({ openAccessUrl: "javascript:alert(1)" }), "src")?.openAccessUrl).toBeNull();
    expect(normalizePaper(raw({ openAccessUrl: "https://x.org/a.pdf" }), "src")?.openAccessUrl).toBe(
      "https://x.org/a.pdf"
    );
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

  it("always names its source", () => {
    expect(normalizePaper(raw({ sources: undefined }), "src")?.sources).toEqual(["src"]);
  });
});

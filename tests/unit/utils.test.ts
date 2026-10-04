import { describe, expect, it } from "vitest";
import { paperId } from "@/lib/utils";
import { arxivQuery } from "@/lib/sources/adapters/arxiv";

describe("paperId", () => {
  it("uses the lower-cased DOI when there is one", () => {
    expect(paperId("10.1/ABC", "x")).toBe("doi:10.1/abc");
  });

  it("gives different non-Latin titles different ids", () => {
    expect(paperId(null, "机器学习研究")).not.toBe(paperId(null, "Машинное обучение"));
  });

  it("keeps existing ids for Latin titles", () => {
    expect(paperId(null, "Deep learning")).toBe(paperId(null, "deep  LEARNING!"));
  });
});

describe("arxivQuery", () => {
  it("requires every word", () => {
    expect(arxivQuery("dual axis tracker")).toBe("all:dual AND all:axis AND all:tracker");
  });

  it("prefixes the country clause", () => {
    expect(arxivQuery('supply chain AND ("Philippines" OR "Filipino")')).toBe(
      'all:supply AND all:chain AND (all:"Philippines" OR all:"Filipino")'
    );
  });
});

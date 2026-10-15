import { describe, expect, it } from "vitest";
import { herdinCitation } from "@/lib/sources/adapters/herdin";
import { dspaceType } from "@/lib/sources/platforms/dspace7";
import { parseEjournalsArticle } from "@/lib/sources/adapters/ejournalsph";

describe("herdinCitation", () => {
  it("reads volume, issue, pages and type from a Source Document line", () => {
    expect(herdinCitation("Acta Medica Philippina. 2011; Vol. 45 ( 1 ) : p. 53-62 (Journal)")).toEqual({
      type: "article", volume: "45", issue: "1", pages: "53-62",
    });
  });

  it("handles a special-issue label, an en dash and a single page", () => {
    expect(herdinCitation("St. Luke's Journal of Medicine. January 2010; Vol. 6 ( 1 (Special Issue) ) : p. 19-22 (Journal)")).toMatchObject({ issue: "1", pages: "19-22" });
    expect(herdinCitation("Journal of Virology. July 2008; Vol. 82 ( 14 ) : p. 6927–6934 (Journal)").pages).toBe("6927-6934");
    expect(herdinCitation("PLOS NTD. 2013; Vol. 7 ( 7 ) : p. e2331- e2331 (Journal)").pages).toBe("e2331");
  });

  it("reads conference proceedings and leaves missing parts empty", () => {
    expect(herdinCitation("PSM 33rd Annual Convention and Scientific Meeting. (Proceedings)")).toEqual({
      type: "conference", volume: null, issue: null, pages: null,
    });
  });
});

describe("dspaceType", () => {
  it("maps a repository's free-text types", () => {
    expect(dspaceType("Thesis (Master's)")).toBe("thesis");
    expect(dspaceType("Technical Report")).toBe("report");
    expect(dspaceType("Book chapter")).toBe("chapter");
    expect(dspaceType("Book")).toBe("book");
    expect(dspaceType("Journal Article")).toBe("article");
    expect(dspaceType("Publications")).toBeUndefined();
  });
});

describe("parseEjournalsArticle citation details", () => {
  const page = (first: string, last: string) =>
    `<meta name="citation_title" content="A study"><meta name="citation_volume" content="4"><meta name="citation_issue" content="7">` +
    `<meta name="citation_firstpage" content="${first}"><meta name="citation_lastpage" content="${last}">`;

  it("keeps volume, issue and a real page range", () => {
    expect(parseEjournalsArticle(page("12", "30"), "1")).toMatchObject({ type: "article", volume: "4", issue: "7", pages: "12-30" });
  });

  it("decodes the site's double-encoded entities", () => {
    const html = `<meta name="citation_title" content="Principals&amp;rsquo; Leadership &amp;ndash; A Study">`;
    expect(parseEjournalsArticle(html, "1")?.title).toBe("Principals’ Leadership – A Study");
  });

  it("drops the 1-to-1 placeholder page range", () => {
    expect(parseEjournalsArticle(page("1", "1"), "1")?.pages).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { localCountry, looksLocal, paperScope } from "@/lib/library/scope";
import { groupReferences, sortBySurname } from "@/lib/library/reference-list";
import type { SavedPaper } from "@/lib/types";

const paper = (over: Partial<SavedPaper> = {}): SavedPaper => ({
  id: Math.random().toString(36),
  title: "Classroom management in rural schools",
  authors: ["Carlo Lim"],
  year: 2021,
  sources: ["openalex"],
  savedAt: 1,
  tags: [],
  readingStatus: "to-read",
  ...over,
});

describe("looksLocal", () => {
  it("counts papers from a Philippine database as local", () => {
    expect(looksLocal(paper({ sources: ["upd"] }), "Philippines")).toBe(true);
  });

  it("finds the country, its demonyms and Philippine places in the paper", () => {
    expect(looksLocal(paper({ title: "Teacher burnout among Filipino teachers" }), "Philippines")).toBe(true);
    expect(looksLocal(paper({ venue: "Philippine Journal of Science" }), "Philippines")).toBe(true);
    expect(looksLocal(paper({ abstract: "A survey of 200 schools in Davao City." }), "Philippines")).toBe(true);
    expect(looksLocal(paper(), "Philippines")).toBe(false);
  });

  it("works for another country focus", () => {
    expect(looksLocal(paper({ title: "Rural schools in Indonesia" }), "Indonesia")).toBe(true);
    expect(looksLocal(paper({ sources: ["thaijo"] }), "Thailand")).toBe(true);
  });
});

describe("paperScope", () => {
  it("lets the student's choice win over the guess", () => {
    expect(paperScope(paper({ sources: ["upd"], scope: "foreign" }), "Philippines")).toBe("foreign");
    expect(paperScope(paper({ scope: "local" }), "Philippines")).toBe("local");
  });

  it("defaults to the Philippines when no country focus is set", () => {
    expect(localCountry(null)).toBe("Philippines");
    expect(localCountry("Japan")).toBe("Japan");
  });
});

describe("groupReferences", () => {
  const santos = paper({ authors: ["Maria Santos"], title: "Reading in Luzon schools" });
  const cruz = paper({ authors: ["Ana Cruz"], title: "Burnout among Filipino teachers" });
  const lim = paper({ authors: ["Carlo Lim"] });
  const anon = paper({ authors: [] });

  it("sorts by surname with author-less papers last", () => {
    expect(sortBySurname([santos, anon, lim, cruz]).map((p) => p.authors[0])).toEqual(["Ana Cruz", "Carlo Lim", "Maria Santos", undefined]);
  });

  it("splits into Local then Foreign, leaving out empty groups", () => {
    const groups = groupReferences([santos, lim, cruz], (p) => paperScope(p, "Philippines"));
    expect(groups.map((g) => [g.heading, g.papers.map((p) => p.authors[0])])).toEqual([
      ["Local", ["Ana Cruz", "Maria Santos"]],
      ["Foreign", ["Carlo Lim"]],
    ]);
    expect(groupReferences([lim], (p) => paperScope(p, "Philippines")).map((g) => g.heading)).toEqual(["Foreign"]);
  });

  it("gives one unheaded group without a scope function", () => {
    expect(groupReferences([lim, cruz])).toEqual([{ heading: null, papers: [cruz, lim] }]);
  });
});

import { describe, expect, it } from "vitest";
import { planTopic } from "@/lib/search/topic";
import { groupIntoThemes } from "@/lib/search/themes";
import type { Paper } from "@/lib/types";

const paper = (over: Partial<Paper>): Paper => ({
  id: "x",
  title: "A title",
  authors: [],
  year: 2024,
  sources: ["openalex"],
  ...over,
});

describe("planTopic", () => {
  it("turns a described topic into the words that appear in papers", () => {
    const plan = planTopic(
      "I am writing about how small sari-sari store owners in the Philippines keep track of their stock"
    );
    expect(plan).not.toBeNull();
    expect(plan!.query).toBe("small sari-sari store owners philippines stock");
    expect(plan!.country).toBe("Philippines");
    expect(plan!.terms).toContain("stock");
  });

  it("drops the questions and filler people type", () => {
    const plan = planTopic("what is the effect of social media on the study habits of students");
    expect(plan!.terms).not.toContain("what");
    expect(plan!.terms).not.toContain("effect");
    expect(plan!.terms).toContain("social");
    expect(plan!.terms).toContain("habits");
  });

  it("notices a request for free full text", () => {
    expect(planTopic("climate adaptation in coastal farming, free full text only")!.openAccessOnly).toBe(true);
    expect(planTopic("climate adaptation in coastal farming")!.openAccessOnly).toBe(false);
  });

  it("refuses a description with nothing to search for", () => {
    expect(planTopic("   ")).toBeNull();
    expect(planTopic("the of and")).toBeNull();
  });

  it("caps the number of terms sent to the databases", () => {
    const plan = planTopic(
      "agriculture fisheries forestry coastal inland marine aquaculture irrigation postharvest marketing cooperatives"
    );
    expect(plan!.terms.length).toBeLessThanOrEqual(8);
  });
});

describe("groupIntoThemes", () => {
  const papers = [
    paper({ id: "1", title: "Supply chain resilience in small firms" }),
    paper({ id: "2", title: "Supply chain management practices of retailers" }),
    paper({ id: "3", title: "Digital record keeping among micro retailers" }),
    paper({ id: "4", title: "Record keeping and tax compliance of small shops" }),
    paper({ id: "5", title: "A study of consumer behaviour" }),
  ];

  it("groups papers that share a topic word and explains each one", () => {
    const themes = groupIntoThemes(papers, ["supply", "retailers"]);
    const supply = themes.find((t) => t.label === "Supply chain");
    expect(supply?.papers.map((p) => p.paper.id)).toEqual(["1", "2"]);
    expect(supply?.papers[0].why).toContain("matches");
  });

  it("keeps unmatched papers in a final group instead of forcing a theme", () => {
    const themes = groupIntoThemes(papers, ["supply"]);
    expect(themes[themes.length - 1].label).toBe("Other relevant work");
    expect(themes[themes.length - 1].papers.map((p) => p.paper.id)).toContain("5");
  });

  it("does not make a theme out of a single paper", () => {
    const themes = groupIntoThemes([paper({ id: "only", title: "Unique topic phrase here" })], ["topic"]);
    expect(themes).toHaveLength(1);
    expect(themes[0].label).toBe("Other relevant work");
  });

  it("returns nothing for an empty result set", () => {
    expect(groupIntoThemes([], ["anything"])).toEqual([]);
  });
});

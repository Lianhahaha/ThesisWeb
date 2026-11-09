import { describe, expect, it } from "vitest";
import { parseCtis } from "@/lib/sources/adapters/ctis";

const data = {
  data: [
    {
      ctNumber: "2026-526189-25-00",
      ctTitle: "A phase III study in type 2 diabetes",
      conditions: "Type 2 Diabetes",
      sponsor: "Example Pharma",
      trialPhase: "Phase III",
      decisionDateOverall: "08/11/2026",
      therapeuticAreas: ["Nutritional and Metabolic Diseases"],
      trialCountries: ["Poland:2"],
    },
  ],
};

describe("parseCtis", () => {
  it("maps a CTIS trial to a report record", () => {
    const [paper] = parseCtis(data);
    expect(paper).toMatchObject({
      title: "A phase III study in type 2 diabetes",
      year: 2026,
      venue: "CTIS (EU)",
      type: "report",
      url: "https://euclinicaltrials.eu/ctis-public/view/2026-526189-25-00",
      keywords: ["Nutritional and Metabolic Diseases"],
      sources: ["ctis"],
    });
    expect(paper.abstract).toContain("Conditions: Type 2 Diabetes");
    expect(paper.abstract).toContain("Sponsor: Example Pharma");
  });
});

import { describe, expect, it } from "vitest";
import { parseIsrctn } from "@/lib/sources/adapters/isrctn";

const xml = `<allTrials totalCount="1">
  <fullTrial>
    <trial publicIdentifierCanonical="ISRCTN66253408" publicIdentifierDateAssigned="2025-06-23T07:52:28Z">
      <trialDescription>
        <title>Dengue vaccine immune response study</title>
        <plainEnglishSummary>Healthy volunteers aged 18 to 60.</plainEnglishSummary>
      </trialDescription>
      <conditions><condition>Dengue</condition><condition>Yellow fever</condition></conditions>
      <doi>10.1186/ISRCTN66253408</doi>
    </trial>
  </fullTrial>
</allTrials>`;

describe("parseIsrctn", () => {
  it("maps a trial registration to a report record", () => {
    const [paper] = parseIsrctn(xml);
    expect(paper).toMatchObject({
      title: "Dengue vaccine immune response study",
      year: 2025,
      venue: "ISRCTN Registry",
      type: "report",
      doi: "10.1186/ISRCTN66253408",
      abstract: "Healthy volunteers aged 18 to 60.",
      keywords: ["Dengue", "Yellow fever"],
      url: "https://www.isrctn.com/ISRCTN66253408",
      sources: ["isrctn"],
    });
  });
});

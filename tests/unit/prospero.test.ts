import { describe, expect, it } from "vitest";
import { parseProspero } from "@/lib/sources/adapters/prospero";

const data = [
  {
    hits: 1304,
    retvals: {
      hits: {
        hits: [
          {
            _source: {
              recordid: 1158080,
              accessionnumber: "CRD420251158080",
              title: "<p>Mosquito-borne diseases: a systematic review</p>",
              reviewstatus: "Ongoing",
              yearfirstpublished: "2025",
              recordtype: "Clinical",
            },
          },
        ],
      },
    },
  },
];

describe("parseProspero", () => {
  it("maps a protocol to a report record", () => {
    const [paper] = parseProspero(data);
    expect(paper).toMatchObject({
      title: "Mosquito-borne diseases: a systematic review",
      year: 2025,
      venue: "PROSPERO",
      type: "report",
      url: "https://www.crd.york.ac.uk/PROSPERO/view/CRD420251158080",
      keywords: ["Ongoing", "Clinical"],
      sources: ["prospero"],
    });
    expect(paper.abstract).toContain("Review type: Clinical");
    expect(paper.abstract).toContain("Status: Ongoing");
  });
});

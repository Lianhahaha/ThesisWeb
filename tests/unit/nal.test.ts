import { describe, expect, it } from "vitest";
import { parseNalDocs } from "@/lib/sources/adapters/nal";

const docs = [
  {
    pnx: {
      display: {
        title: ["Ustilaginoidea virens: A Fungus Infects Rice Flower"],
        type: ["article"],
        creationdate: ["2019"],
        subject: ["rice", "fungal diseases"],
      },
      addata: {
        atitle: ["Ustilaginoidea virens: A Fungus Infects Rice Flower and Threats World Rice Production"],
        au: ["Jiehua, Qiu"],
        addau: ["Shuai, Meng", "Yizhen, Deng"],
        date: ["2019 - 07??", "2019"],
        abstract: ["<p>Rice false smut disease threatens world rice production.</p>"],
        doi: ["10.1016/j.rsci.2018.10.007"],
        genre: ["article"],
        jtitle: ["Rice science."],
        url: ["https://dx.doi.org/10.1016/j.rsci.2018.10.007"],
      },
      control: { recordid: ["alma9916337632107426"] },
    },
  },
];

describe("parseNalDocs", () => {
  it("maps a Primo record to a citation-ready paper", () => {
    const [paper] = parseNalDocs(docs, "pubag");
    expect(paper).toMatchObject({
      title: "Ustilaginoidea virens: A Fungus Infects Rice Flower and Threats World Rice Production",
      authors: ["Qiu Jiehua", "Meng Shuai", "Deng Yizhen"],
      year: 2019,
      venue: "Rice science.",
      type: "article",
      doi: "10.1016/j.rsci.2018.10.007",
      abstract: "Rice false smut disease threatens world rice production.",
      url: "https://dx.doi.org/10.1016/j.rsci.2018.10.007",
      sources: ["pubag"],
    });
  });

  it("falls back to the Primo record page when there is no URL", () => {
    const [paper] = parseNalDocs(
      [{ pnx: { addata: { atitle: ["A record"] }, control: { recordid: ["alma123"] } } }],
      "agricola"
    );
    expect(paper.url).toContain("docid=alma123");
    expect(paper.sources).toEqual(["agricola"]);
  });
});

import { describe, expect, it } from "vitest";
import { parseDryadDatasets } from "@/lib/sources/adapters/dryad";

const data = {
  total: 1,
  _embedded: {
    "stash:datasets": [
      {
        identifier: "doi:10.5061/dryad.j3tx95xxf",
        title: "Stem rot of rice in California",
        authors: [
          { firstName: "Luis", lastName: "Espino" },
          { firstName: "Whitney", lastName: "Brim-DeForest" },
        ],
        abstract: "<p>Fungicide trials from 2017 to 2024.</p>",
        publicationDate: "2025-04-01",
        keywords: ["rice", "fungicide"],
        fieldOfScience: "Agricultural sciences",
      },
    ],
  },
};

describe("parseDryadDatasets", () => {
  it("maps a dataset to a citable record", () => {
    const [paper] = parseDryadDatasets(data);
    expect(paper).toMatchObject({
      title: "Stem rot of rice in California",
      authors: ["Luis Espino", "Whitney Brim-DeForest"],
      year: 2025,
      venue: "Dryad",
      type: "other",
      doi: "10.5061/dryad.j3tx95xxf",
      abstract: "Fungicide trials from 2017 to 2024.",
      openAccessUrl: "https://doi.org/10.5061/dryad.j3tx95xxf",
      isOpenAccess: true,
      sources: ["dryad"],
    });
  });
});

import { describe, expect, it } from "vitest";
import { parseEuropeana } from "@/lib/sources/adapters/europeana";

describe("parseEuropeana", () => {
  it("maps a cultural-heritage item", () => {
    const [paper] = parseEuropeana({
      items: [
        {
          title: ["Education in Europe"],
          dcCreator: ["European Commission"],
          year: ["2004"],
          guid: "https://www.europeana.eu/item/123",
          dcDescription: ["A report on education."],
          dataProvider: ["European Library"],
          type: "TEXT",
        },
      ],
    });
    expect(paper).toMatchObject({
      title: "Education in Europe",
      authors: ["European Commission"],
      year: 2004,
      venue: "European Library",
      type: "other",
      url: "https://www.europeana.eu/item/123",
      sources: ["europeana"],
    });
  });
});

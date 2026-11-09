import { describe, expect, it } from "vitest";
import { parseNdltd } from "@/lib/sources/adapters/ndltd";

const data = {
  items: [
    {
      title: "Reading <em>Comprehension</em> in Filipino",
      description: "<p>An abstract of the study.</p>",
      creators: ["Ragusa, Wendy"],
      institution: "University of the Philippines",
      source_url: "https://example.edu/handle/1",
      item_url: "/etd/up/oai:example:1",
      year: 2024,
      degree_level: "Master's Thesis",
    },
    {
      title: "An older thesis",
      creators: ["Cruz, Juan"],
      year: 2001,
      item_url: "/etd/example/2",
    },
    { title: "", year: 2024 },
  ],
};

describe("parseNdltd", () => {
  it("maps the title, authors, institution, type and source link", () => {
    const [paper] = parseNdltd(data);
    expect(paper.title).toBe("Reading Comprehension in Filipino");
    expect(paper.authors).toEqual(["Wendy Ragusa"]);
    expect(paper.venue).toBe("University of the Philippines");
    expect(paper.type).toBe("thesis");
    expect(paper.url).toBe("https://example.edu/handle/1");
    expect(paper.year).toBe(2024);
    expect(paper.abstract).toBe("An abstract of the study.");
  });

  it("drops records older than the year filter and records with no title", () => {
    expect(parseNdltd(data, 2010)).toHaveLength(1);
    expect(parseNdltd(data)).toHaveLength(2);
  });

  it("falls back to the NDLTD record page when the source link is missing", () => {
    expect(parseNdltd(data)[1].url).toBe("https://search.dev.ndltd.org/etd/example/2");
  });
});

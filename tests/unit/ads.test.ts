import { afterEach, describe, expect, it, vi } from "vitest";
import { parseAds, searchAds } from "@/lib/sources/adapters/ads";

const data = {
  response: {
    docs: [
      {
        title: ["The Corgi of Exoplanets: Methane Mystery on HAT-P-18b"],
        author: ["Smith, Jane", "Dela Cruz, Juan"],
        year: "2023",
        abstract: "A study of an exoplanet atmosphere.",
        doi: "10.3847/2041-8213/acb123",
        bibcode: "2023ApJ...944L..12S",
      },
    ],
  },
};

const originalToken = process.env.NASA_ADS_TOKEN;
afterEach(() => {
  vi.unstubAllGlobals();
  if (originalToken == null) delete process.env.NASA_ADS_TOKEN;
  else process.env.NASA_ADS_TOKEN = originalToken;
});

describe("parseAds", () => {
  it("maps an ADS document", () => {
    const [paper] = parseAds(data);
    expect(paper).toMatchObject({
      title: "The Corgi of Exoplanets: Methane Mystery on HAT-P-18b",
      authors: ["Smith, Jane", "Dela Cruz, Juan"],
      year: 2023,
      venue: "NASA ADS",
      type: "article",
      doi: "10.3847/2041-8213/acb123",
      url: "https://ui.adsabs.harvard.edu/abs/2023ApJ...944L..12S/abstract",
      sources: ["ads"],
    });
  });
});

describe("searchAds", () => {
  it("returns nothing without a token", async () => {
    delete process.env.NASA_ADS_TOKEN;
    await expect(searchAds("dark matter")).resolves.toEqual([]);
  });
});

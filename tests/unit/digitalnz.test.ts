import { describe, expect, it } from "vitest";
import { parseDigitalNz } from "@/lib/sources/adapters/digitalnz";

const data = {
  search: {
    results: [
      {
        title: "EDUCATION: COMMERCIAL EDUCATION.",
        description: "Appendix to the Journals of the House of Representatives.",
        creator: ["National Library of New Zealand"],
        date: ["1902-01-01T00:00:00.000Z"],
        landing_url: "https://atojs.natlib.govt.nz/record",
        display_content_partner: "National Library of New Zealand",
        category: ["Newspapers"],
        subject: ["Education"],
      },
    ],
  },
};

describe("parseDigitalNz", () => {
  it("maps a heritage record", () => {
    const [paper] = parseDigitalNz(data);
    expect(paper).toMatchObject({
      title: "EDUCATION: COMMERCIAL EDUCATION.",
      authors: ["National Library of New Zealand"],
      year: 1902,
      venue: "National Library of New Zealand",
      type: "other",
      keywords: ["Newspapers", "Education"],
      url: "https://atojs.natlib.govt.nz/record",
      sources: ["digitalnz"],
    });
  });
});

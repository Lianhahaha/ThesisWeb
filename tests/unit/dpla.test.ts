import { describe, expect, it } from "vitest";
import { parseDpla } from "@/lib/sources/adapters/dpla";

describe("parseDpla", () => {
  it("maps a DPLA item with array and scalar fields", () => {
    const [paper] = parseDpla({
      docs: [
        {
          sourceResource: {
            title: "Education report",
            creator: ["Department of Education"],
            date: { displayDate: "1999" },
            description: "A report on schools.",
          },
          isShownAt: "https://example.org/item",
          provider: { name: "Internet Archive" },
        },
      ],
    });
    expect(paper).toMatchObject({
      title: "Education report",
      authors: ["Department of Education"],
      year: 1999,
      venue: "Internet Archive",
      type: "other",
      url: "https://example.org/item",
      sources: ["dpla"],
    });
  });
});

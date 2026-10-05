import { describe, expect, it } from "vitest";
import { coreQuery } from "@/lib/sources/adapters/core";

describe("coreQuery", () => {
  it("requires every word", () => {
    expect(coreQuery("reading comprehension strategies")).toBe("(reading AND comprehension AND strategies)");
  });

  it("keeps the country clause and adds the year range", () => {
    expect(coreQuery('dengue vaccine AND ("Philippines" OR "Filipino")', 2020)).toBe(
      '(dengue AND vaccine) AND ("Philippines" OR "Filipino") AND yearPublished>=2020'
    );
  });

  it("drops characters CORE would read as syntax", () => {
    expect(coreQuery('title:"rice" (yield)')).toBe("(title AND rice AND yield)");
  });
});

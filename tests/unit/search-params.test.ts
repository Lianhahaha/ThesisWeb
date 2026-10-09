import { describe, expect, it } from "vitest";
import { buildSearchParams, canonicalCountry, parseSearchParams } from "@/lib/search-params";

const defaults = { fromYear: 2022 };

describe("parseSearchParams", () => {
  it("round-trips what buildSearchParams writes", () => {
    const input = { query: "teacher burnout", fromYear: 2021, openAccessOnly: true, country: "Philippines" };
    expect(parseSearchParams(buildSearchParams(input).toString(), defaults, 2026)).toEqual(input);
  });

  it("rejects fractional and out-of-range years", () => {
    for (const from of ["2020.5", "1500", "2099", "abc", ""]) {
      expect(parseSearchParams(`q=reading&from=${from}`, defaults, 2026)?.fromYear, from).toBe(2022);
    }
    expect(parseSearchParams("q=reading&from=0", defaults, 2026)?.fromYear).toBe(0);
  });

  it("accepts only countries from the list, in the list's spelling", () => {
    expect(parseSearchParams("q=reading&country=philippines", defaults)?.country).toBe("Philippines");
    expect(parseSearchParams('q=reading&country=Atlantis"', defaults)?.country).toBeNull();
  });

  it("needs a query of at least 3 characters", () => {
    expect(parseSearchParams("q=ab", defaults)).toBeNull();
  });
});

describe("canonicalCountry", () => {
  it("matches case-insensitively and trims", () => {
    expect(canonicalCountry("  south korea ")).toBe("South Korea");
    expect(canonicalCountry(null)).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { buildSearchParams, canonicalCountry, parseSearchParams, shortenQuery } from "@/lib/search/params";

const defaults = { fromYear: 2022 };

describe("parseSearchParams", () => {
  it("round-trips what buildSearchParams writes", () => {
    const input = { query: "teacher burnout", fromYear: 2021, openAccessOnly: true, country: "Philippines" };
    expect(parseSearchParams(buildSearchParams(input).toString(), defaults, 2026)).toEqual({ ...input, sourceMode: "all" });
  });

  it("round-trips the source scope and falls back to all", () => {
    const input = { query: "teacher burnout", fromYear: 2021, openAccessOnly: false, country: null, sourceMode: "core" as const };
    expect(parseSearchParams(buildSearchParams(input).toString(), defaults, 2026)?.sourceMode).toBe("core");
    expect(parseSearchParams("q=reading&mode=bogus", defaults)?.sourceMode).toBe("all");
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

describe("shortenQuery", () => {
  it("turns a typed question into its topic words", () => {
    expect(shortenQuery("how do small shop owners keep track of stock")).toBe("small shop owners stock");
  });

  it("leaves a keyword query exactly as typed", () => {
    expect(shortenQuery("reading comprehension strategies")).toBe("reading comprehension strategies");
    expect(shortenQuery("teacher burnout public schools")).toBe("teacher burnout public schools");
  });

  it("keeps a long keyword query alone when there are no question words to drop", () => {
    const q = "climate change adaptation coastal farming communities philippines 2024";
    expect(shortenQuery(q)).toBe(q);
  });

  it("does not strip a query down to nothing", () => {
    expect(shortenQuery("what is the impact of")).toBe("what is the impact of");
  });

  it("drops punctuation hanging off a word", () => {
    expect(shortenQuery("how do sari-sari stores track stock?")).toBe("sari-sari stores stock");
  });
});

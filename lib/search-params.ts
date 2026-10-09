import { ALL_COUNTRIES } from "@/lib/countries";
import { KEYLESS_SOURCE_COUNT } from "@/lib/sources/meta";

/**
 * The search form <-> URL query string, so a search survives a refresh and can
 * be shared as a link (e.g. /search?q=vendor+challenges&from=2021&country=Philippines).
 * The /api/search route takes the same query string and parses it with the
 * same function, so the page and the server can't disagree on what is valid.
 */

export interface SearchInput {
  query: string;
  /** 0 means "all years". */
  fromYear: number;
  openAccessOnly: boolean;
  country: string | null;
}

export const MIN_QUERY_LENGTH = 3;
/** Longest query sent on to the databases. */
export const MAX_QUERY_LENGTH = 300;
/** Results asked of each database per search. */
export const PER_SOURCE = 15;
/**
 * Most papers one search can return (every database full, before duplicates
 * merge). Caches and checks that must cover a whole result set use this.
 */
export const MAX_RESULTS = KEYLESS_SOURCE_COUNT * PER_SOURCE;

/** Default "Published since": the last 5 years, counting this one (2022+ in 2026). */
export function defaultFromYear(currentYear = new Date().getFullYear()): number {
  return currentYear - 4;
}

/** The list's spelling of a country name, matched case-insensitively; null if unknown. */
export function canonicalCountry(name: string | null | undefined): string | null {
  const q = (name ?? "").trim().toLowerCase();
  if (!q) return null;
  return ALL_COUNTRIES.find((c) => c.toLowerCase() === q) ?? null;
}

export function buildSearchParams(input: SearchInput): URLSearchParams {
  const params = new URLSearchParams({ q: input.query.trim(), from: String(input.fromYear) });
  if (input.openAccessOnly) params.set("oa", "1");
  if (input.country) params.set("country", input.country);
  return params;
}

/**
 * Parse a query string into search input. Returns null when there is no usable
 * query. Untrusted input: bad or out-of-range values fall back to `defaults`
 * instead of being passed on to the API.
 */
export function parseSearchParams(
  qs: string,
  defaults: { fromYear: number },
  currentYear = new Date().getFullYear()
): SearchInput | null {
  const p = new URLSearchParams(qs);
  const query = (p.get("q") ?? "").trim().slice(0, MAX_QUERY_LENGTH);
  if (query.length < MIN_QUERY_LENGTH) return null;

  const fromRaw = p.get("from");
  const from = fromRaw === null || fromRaw.trim() === "" ? NaN : Number(fromRaw);
  const validFrom = Number.isInteger(from) && (from === 0 || (from >= 1900 && from <= currentYear + 1));

  return {
    query,
    fromYear: validFrom ? from : defaults.fromYear,
    openAccessOnly: p.get("oa") === "1",
    country: canonicalCountry(p.get("country")),
  };
}

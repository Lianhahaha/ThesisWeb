/**
 * The search form <-> URL query string, so a search survives a refresh and can
 * be shared as a link (e.g. /search?q=vendor+challenges&from=2021&country=Philippines).
 */

export interface SearchInput {
  query: string;
  /** 0 means "all years". */
  fromYear: number;
  openAccessOnly: boolean;
  country: string | null;
}

export const MIN_QUERY_LENGTH = 3;

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
  const query = (p.get("q") ?? "").trim().slice(0, 300);
  if (query.length < MIN_QUERY_LENGTH) return null;

  const fromRaw = p.get("from");
  const from = fromRaw === null || fromRaw.trim() === "" ? NaN : Number(fromRaw);
  const validFrom = Number.isInteger(from) && (from === 0 || (from >= 1900 && from <= currentYear + 1));

  return {
    query,
    fromYear: validFrom ? from : defaults.fromYear,
    openAccessOnly: p.get("oa") === "1",
    country: (p.get("country") ?? "").trim().slice(0, 60) || null,
  };
}

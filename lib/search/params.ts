import { ALL_COUNTRIES } from "@/lib/countries";
import { CORE_SOURCE_IDS, LOCAL_SOURCE_IDS, SOURCE_COUNT } from "@/lib/sources/meta";

/**
 * The search form <-> URL query string, so a search survives a refresh and can
 * be shared as a link (e.g. /search?q=vendor+challenges&from=2021&country=Philippines).
 * The /api/search route takes the same query string and parses it with the
 * same function, so the page and the server can't disagree on what is valid.
 */

export type SourceMode = "all" | "core" | "local";

export const SOURCE_MODES: { value: SourceMode; label: string; shortLabel: string; hint: string }[] = [
  { value: "all", label: `All sources (${SOURCE_COUNT})`, shortLabel: `All ${SOURCE_COUNT}`, hint: "Every database" },
  { value: "core", label: `Core indexes (${CORE_SOURCE_IDS.size})`, shortLabel: `Core ${CORE_SOURCE_IDS.size}`, hint: "Faster, major indexes only" },
  { value: "local", label: `Philippines (${LOCAL_SOURCE_IDS.size})`, shortLabel: `PH ${LOCAL_SOURCE_IDS.size}`, hint: "Philippine databases only" },
];

export interface SearchInput {
  query: string;
  /** 0 means "all years". */
  fromYear: number;
  openAccessOnly: boolean;
  country: string | null;
  /** Which group of databases to search. Missing on old saved searches = all. */
  sourceMode?: SourceMode;
}

export const MIN_QUERY_LENGTH = 3;
/** Longest query sent on to the databases. */
export const MAX_QUERY_LENGTH = 300;
/** Results asked of each database per search. */
export const PER_SOURCE = 15;/**
 * Most papers one search can return (every database full, before duplicates
 * merge). Caches and checks that must cover a whole result set use this.
 */
export const MAX_RESULTS = SOURCE_COUNT * PER_SOURCE;

/**
 * Words that ask the question rather than name the topic. People type a whole
 * question ("how do small shop owners keep track of stock"), and the databases
 * AND every word they receive, so the records they want are buried under
 * "how", "do" and "keep". Dropping those is what takes that search from three
 * results to dozens.
 */
const FILLER = new Set([
  "how", "what", "why", "when", "where", "which", "who", "whom", "whose",
  "is", "are", "was", "were", "be", "been", "being",
  "do", "does", "did", "can", "could", "should", "would", "will", "shall",
  "my", "our", "your", "their", "its", "his", "her", "i", "we", "you", "they",
  "the", "a", "an", "of", "in", "on", "at", "to", "for", "with", "by", "from",
  "about", "between", "among", "into", "over", "under", "that", "this", "these", "those",
  "keep", "keeps", "track", "tracks", "make", "makes", "get", "gets", "use", "uses", "using",
  "show", "shows", "find", "finds", "help", "helps", "need", "needs", "want", "wants",
  "give", "gives", "take", "takes", "know", "knows", "see", "sees", "look", "looks",
  "tell", "explain", "describe",
]);

/**
 * The words actually sent to the databases. A typed question loses its
 * question words and filler verbs, and a long query keeps its first `maxTerms`
 * terms (people front-load the topic). A keyword query — three or four words,
 * which is what the box asks for — comes back untouched.
 */
export function shortenQuery(query: string, maxTerms = 6): string {
  const words = query.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 3) return query;
  const cleaned = words.map((w) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "")).filter(Boolean);
  const kept = cleaned.filter((w) => !FILLER.has(w.toLowerCase()));
  // Nothing to remove, or nothing left to search for: keep what was typed.
  if (kept.length < 2 || kept.length === cleaned.length) return query;
  return kept.slice(0, maxTerms).join(" ");
}

/** Default "Published since": the last 5 years, counting this one (2022+ in 2026). */
export function defaultFromYear(currentYear = new Date().getFullYear()): number {  return currentYear - 4;
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
  if (input.sourceMode && input.sourceMode !== "all") params.set("mode", input.sourceMode);
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

  const mode = p.get("mode");
  return {
    query,
    fromYear: validFrom ? from : defaults.fromYear,
    openAccessOnly: p.get("oa") === "1",
    country: canonicalCountry(p.get("country")),
    sourceMode: mode === "core" || mode === "local" ? mode : "all",
  };
}

/**
 * Contact email sent to the academic APIs that offer a "polite pool"
 * (OpenAlex, Crossref, NCBI, Zenodo, ...). Identified requests get faster,
 * more reliable rate limits, and the API owners can reach you if a request
 * misbehaves.
 *
 * Set CONTACT_EMAIL to your own address. Falls back to UNPAYWALL_EMAIL (which
 * already has to be a real address), then to a placeholder so the app still runs.
 */
export const CONTACT_EMAIL =
  process.env.CONTACT_EMAIL?.trim() ||
  process.env.UNPAYWALL_EMAIL?.trim() ||
  "thesisweb-researcher@example.com";

/** User-Agent for adapters that identify themselves via header instead of query. */
export const USER_AGENT = `ThesisWeb/1.0 (mailto:${CONTACT_EMAIL})`;

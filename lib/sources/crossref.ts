import { fetchWithTimeout, safeJson, paperId } from "@/lib/utils";
import type { Paper } from "@/lib/types";
import { CONTACT_EMAIL } from "@/lib/config";
import { stripHtml } from "@/lib/text";

/**
 * Crossref adapter — metadata, DOIs, reference lists.
 * - No key required (add mailto for the polite pool).
 * - Strong for verifying DOIs and getting clean bibliographic data.
 * - No abstracts in most records, but excellent author/venue/year coverage.
 * Docs: https://api.crossref.org
 */

const MAILTO = CONTACT_EMAIL;
const BASE = "https://api.crossref.org/works";

interface CrossrefItem {
  DOI?: string;
  title?: string[];
  author?: { given?: string; family?: string }[];
  "container-title"?: string[];
  "published-print"?: { "date-parts": number[][] };
  "published-online"?: { "date-parts": number[][] };
  issued?: { "date-parts": number[][] };
  abstract?: string;
  "is-referenced-by-count"?: number;
  link?: { URL: string; "content-type": string }[];
  license?: { URL: string }[];
}

/**
 * True if the record carries a genuinely open license (Creative Commons or
 * public domain). Crossref's `has-license` also matches publishers' paywalled
 * text-and-data-mining licenses, so it can't be used as an "open access" test.
 */
function hasOpenLicense(it: CrossrefItem): boolean {
  return (it.license || []).some((l) =>
    /creativecommons\.org|publicdomain/i.test(l.URL || "")
  );
}

/** Current Creative Commons / CC0 license URLs, ORed into a Crossref filter. */
const OPEN_LICENSE_FILTER = [
  "https://creativecommons.org/licenses/by/4.0/",
  "https://creativecommons.org/licenses/by-sa/4.0/",
  "https://creativecommons.org/licenses/by-nc/4.0/",
  "https://creativecommons.org/licenses/by-nc-sa/4.0/",
  "https://creativecommons.org/licenses/by-nd/4.0/",
  "https://creativecommons.org/licenses/by-nc-nd/4.0/",
  "https://creativecommons.org/publicdomain/zero/1.0/",
]
  .map((u) => `license.url:${u}`)
  .join(",");

function yearFromItem(it: CrossrefItem): number | null {
  const parts =
    it["published-print"]?.["date-parts"]?.[0] ||
    it["published-online"]?.["date-parts"]?.[0] ||
    it.issued?.["date-parts"]?.[0];
  if (!parts || parts.length === 0) return null;
  return parts[0];
}

export async function searchCrossref(
  query: string,
  opts: { fromYear?: number; perSource?: number; openAccessOnly?: boolean } = {}
): Promise<Paper[]> {
  const { fromYear, perSource = 15, openAccessOnly } = opts;
  const params = new URLSearchParams({
    query,
    rows: String(perSource),
    "mailto": MAILTO,
    sort: "relevance",
  });
  // Repeated license.url values are ORed by Crossref, so this returns only
  // records under an open license (hasOpenLicense() double-checks the result).
  const filters: string[] = [];
  if (fromYear) filters.push(`from-pub-date:${fromYear}-01-01`);
  if (openAccessOnly) filters.push(OPEN_LICENSE_FILTER);
  if (filters.length) params.set("filter", filters.join(","));

  const res = await fetchWithTimeout(`${BASE}?${params}`);
  if (!res.ok) throw new Error(`Crossref ${res.status}`);
  const data = await safeJson<{ message: { items: CrossrefItem[] } }>(res);
  if (!data?.message?.items) return [];

  const items = openAccessOnly
    ? data.message.items.filter(hasOpenLicense)
    : data.message.items;

  return items.map(itemToPaper);
}

function itemToPaper(it: CrossrefItem): Paper {
  // Crossref returns HTML entities and tags in titles ("Computers &amp; Education").
  const title = it.title?.[0] ? stripHtml(it.title[0]) : "Untitled";
  const doi = it.DOI || null;
  const open = hasOpenLicense(it);
  return {
    id: paperId(doi, title),
    title,
    authors: (it.author || []).map((a) => stripHtml([a.given, a.family].filter(Boolean).join(" "))),
    year: yearFromItem(it),
    venue: it["container-title"]?.[0] ? stripHtml(it["container-title"][0]) : null,
    doi,
    abstract: it.abstract ? stripHtml(it.abstract) : null,
    citedByCount: it["is-referenced-by-count"] ?? 0,
    isOpenAccess: open,
    openAccessUrl: open && doi ? `https://doi.org/${doi}` : null,
    sources: ["crossref"],
  };
}

/** Look up one work by DOI. Returns null when Crossref doesn't know it. */
export async function getCrossrefByDoi(doi: string): Promise<Paper | null> {
  const path = doi.split("/").map(encodeURIComponent).join("/");
  const res = await fetchWithTimeout(`${BASE}/${path}?mailto=${encodeURIComponent(MAILTO)}`);
  if (!res.ok) return null;
  const data = await safeJson<{ message?: CrossrefItem }>(res);
  return data?.message ? itemToPaper(data.message) : null;
}

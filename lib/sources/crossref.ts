import { fetchWithTimeout, safeJson, paperId } from "@/lib/utils";
import type { Paper } from "@/lib/types";

/**
 * Crossref adapter — metadata, DOIs, reference lists.
 * - No key required (add mailto for the polite pool).
 * - Strong for verifying DOIs and getting clean bibliographic data.
 * - No abstracts in most records, but excellent author/venue/year coverage.
 * Docs: https://api.crossref.org
 */

const MAILTO = "thesisweb-researcher@example.com";
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
  const { fromYear, perSource = 15 } = opts;
  const params = new URLSearchParams({
    query,
    rows: String(perSource),
    "mailto": MAILTO,
    sort: "relevance",
  });
  if (fromYear) {
    params.set("filter", `from-pub-date:${fromYear}-01-01${opts.openAccessOnly ? ",has-license:true" : ""}`);
  } else if (opts.openAccessOnly) {
    params.set("filter", "has-license:true");
  }

  const res = await fetchWithTimeout(`${BASE}?${params}`);
  if (!res.ok) throw new Error(`Crossref ${res.status}`);
  const data = await safeJson<{ message: { items: CrossrefItem[] } }>(res);
  if (!data?.message?.items) return [];

  return data.message.items.map<Paper>((it) => {
    const title = it.title?.[0] || "Untitled";
    const doi = it.DOI || null;
    const year = yearFromItem(it);
    return {
      id: paperId(doi, title),
      title,
      authors: (it.author || []).map((a) => [a.given, a.family].filter(Boolean).join(" ")),
      year,
      venue: it["container-title"]?.[0] ?? null,
      doi,
      // Crossref abstracts often contain JATS XML tags — strip lightly.
      abstract: it.abstract ? it.abstract.replace(/<[^>]+>/g, "") : null,
      citedByCount: it["is-referenced-by-count"] ?? 0,
      sources: ["crossref"],
    };
  });
}

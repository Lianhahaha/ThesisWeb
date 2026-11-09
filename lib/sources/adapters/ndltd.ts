import { paperId } from "@/lib/utils";
import { fetchWithTimeout, readJson } from "@/lib/server/http";
import { USER_AGENT } from "@/lib/server/config";
import { flipName, stripHtml } from "@/lib/text";
import type { Paper } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * NDLTD, the Networked Digital Library of Theses and Dissertations global
 * union catalog. It harvests electronic theses and dissertations from
 * university repositories worldwide and exposes a free, keyless JSON search
 * API (plus OAI-PMH). This is the machine-readable alternative to OATD, which
 * has no API and asks that its metadata not be re-exported.
 * https://union.dev.ndltd.org/docs/api
 */

const API = "https://search.dev.ndltd.org/api/search";
const SITE = "https://search.dev.ndltd.org";

export interface NdltdItem {
  title?: string;
  description?: string | null;
  creators?: string[];
  institution?: string | null;
  source_url?: string | null;
  item_url?: string | null;
  year?: number | null;
  degree_level?: string | null;
}

/** Turn the API's items into the app's papers, dropping anything older than fromYear. */
export function parseNdltd(data: { items?: NdltdItem[] } | null, fromYear?: number): Paper[] {
  const papers: Paper[] = [];
  for (const item of data?.items ?? []) {
    if (!item.title) continue;
    const year = typeof item.year === "number" ? item.year : Number(item.year) || null;
    if (fromYear && year && year < fromYear) continue;

    const title = stripHtml(item.title);
    if (!title) continue;
    const sourceUrl = item.source_url && /^https?:\/\//i.test(item.source_url) ? item.source_url : null;
    let itemUrl: string | null = null;
    try {
      itemUrl = item.item_url ? new URL(item.item_url, SITE).toString() : null;
    } catch {
      // A malformed record URL should not take the whole source down.
    }
    const institution = item.institution?.trim() || null;

    papers.push({
      id: paperId(null, title),
      title,
      authors: (Array.isArray(item.creators) ? item.creators : []).map(flipName).slice(0, 10),
      year,
      // The awarding university is the useful venue for a thesis.
      venue: institution || item.degree_level || "NDLTD",
      type: "thesis",
      publisher: institution,
      doi: null,
      abstract: item.description ? stripHtml(item.description) : null,
      // The catalog links to the repository record, not necessarily a PDF.
      openAccessUrl: null,
      isOpenAccess: false,
      keywords: [],
      url: sourceUrl ?? itemUrl,
      sources: ["ndltd"],
    });
  }
  return papers;
}

export async function searchNdltd(query: string, opts: AdapterOptions = {}): Promise<Paper[]> {
  const { fromYear, perSource = 15 } = opts;
  // Ask for extra rows so the year filter still leaves enough results.
  const pageSize = Math.min(100, Math.max(perSource * 2, perSource));
  const params = new URLSearchParams({ q: query, page_size: String(pageSize), sort: "relevance" });

  const res = await fetchWithTimeout(
    `${API}?${params}`,
    { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } },
    12000
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return parseNdltd(await readJson<{ items?: NdltdItem[] }>(res), fromYear);
}

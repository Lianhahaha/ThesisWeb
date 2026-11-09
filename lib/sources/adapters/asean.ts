import { paperId } from "@/lib/utils";
import { fetchWithTimeout, readText } from "@/lib/server/http";
import { USER_AGENT } from "@/lib/server/config";
import { stripHtml } from "@/lib/text";
import type { Paper } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * ASEAN Resource Centre: books, reports and studies published by the ASEAN
 * Secretariat on trade, environment, social policy, education and regional
 * cooperation. The catalogue is small but gives primary ASEAN documents that
 * general indexes miss.
 * https://resourcecentre.asean.org
 */

const BASE = "https://resourcecentre.asean.org";
const SEARCH = `${BASE}/Books/`;

/** Parse the catalogue's result cards. Exported for tests. */
export function parseAsean(html: string): Paper[] {
  const papers: Paper[] = [];
  for (const m of html.matchAll(
    /<a href='([^']*Book_Detail\/\?ID=\d+)'><font class='judulbuku'>([\s\S]*?)<\/font><\/a>([\s\S]*?)<\/table>/gi
  )) {
    const title = stripHtml(m[2]);
    if (!title) continue;
    const meta = stripHtml(m[3].replace(/<br\s*\/?>/gi, " "));
    const subtitle = meta.match(/Subtitle\s*:\s*(.*?)(?:\s+Registration No|\s+ISBN|$)/i)?.[1]?.trim();
    const fullTitle = subtitle ? `${title}: ${subtitle}` : title;

    papers.push({
      id: paperId(null, fullTitle),
      title: fullTitle,
      authors: [],
      year: null,
      venue: "ASEAN Resource Centre",
      type: "book",
      doi: null,
      abstract: meta || null,
      openAccessUrl: null,
      isOpenAccess: false,
      keywords: [],
      url: m[1],
      sources: ["asean"],
    });
  }
  return papers;
}

export async function searchAsean(query: string, opts: AdapterOptions = {}): Promise<Paper[]> {
  const { perSource = 15 } = opts;
  const params = new URLSearchParams({ search: query });
  const res = await fetchWithTimeout(
    `${SEARCH}?${params}`,
    { headers: { "User-Agent": USER_AGENT, Accept: "text/html" } },
    12000
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return parseAsean(await readText(res)).slice(0, Math.max(1, perSource));
}

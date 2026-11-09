import { paperId } from "@/lib/utils";
import { fetchWithTimeout, readText } from "@/lib/server/http";
import { USER_AGENT } from "@/lib/server/config";
import { stripHtml } from "@/lib/text";
import type { Paper } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * NICE, the UK National Institute for Health and Care Excellence: clinical
 * guidelines, quality standards, technology appraisals and public-health
 * guidance, free under the Open Government Licence.
 * https://www.nice.org.uk
 */

const BASE = "https://www.nice.org.uk";
const SEARCH = `${BASE}/search`;

/** Parse the server-rendered NICE result cards. Exported for tests. */
export function parseNice(html: string): Paper[] {
  const papers: Paper[] = [];
  const maxYear = new Date().getFullYear() + 1;

  for (const part of html.split(/<li class="SearchCardList_listItem/i).slice(1)) {
    const link = part.match(
      /<p class="card__heading"><a href="([^"]+)"><span>([\s\S]*?)<\/span><\/a><\/p>/i
    );
    if (!link) continue;
    const title = stripHtml(link[2]);
    if (!title) continue;

    const summary = part.match(/<p class="card__summary"><span>([\s\S]*?)<\/span><\/p>/i)?.[1];
    const updated = part.match(/<dt[^>]*>Last updated<\/dt><dd>([\s\S]*?)<\/dd>/i)?.[1];
    const rawYear = updated ? Number(stripHtml(updated).match(/\d{4}/)?.[0]) : null;
    const year = rawYear && rawYear >= 1000 && rawYear <= maxYear ? rawYear : null;
    const kind = part.match(/<dt[^>]*>Result type<\/dt><dd>([\s\S]*?)<\/dd>/i)?.[1];
    const url = link[1].startsWith("http") ? link[1] : `${BASE}${link[1]}`;

    papers.push({
      id: paperId(null, title),
      title,
      authors: [],
      year,
      venue: "NICE",
      type: "report",
      doi: null,
      abstract: summary ? stripHtml(summary) : null,
      openAccessUrl: url,
      isOpenAccess: true,
      keywords: kind ? [stripHtml(kind)] : [],
      url,
      sources: ["nice"],
    });
  }
  return papers;
}

export async function searchNice(query: string, opts: AdapterOptions = {}): Promise<Paper[]> {
  const { fromYear, perSource = 15 } = opts;
  const params = new URLSearchParams({ q: query });

  const res = await fetchWithTimeout(
    `${SEARCH}?${params}`,
    { headers: { "User-Agent": USER_AGENT, Accept: "text/html" } },
    15000
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return parseNice(await readText(res))
    .filter((p) => !(fromYear && fromYear > 0 && p.year != null && p.year < fromYear))
    .slice(0, Math.max(1, perSource));
}

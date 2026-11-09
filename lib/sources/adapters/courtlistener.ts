import { paperId } from "@/lib/utils";
import { fetchWithTimeout, readJson } from "@/lib/server/http";
import { USER_AGENT } from "@/lib/server/config";
import { stripHtml } from "@/lib/text";
import type { Paper } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * CourtListener / RECAP, the Free Law Project's open legal database: U.S.
 * case law, PACER dockets, judges and oral arguments. A free API token is
 * required; the default allowance is 5 requests/minute, 50/hour and
 * 125/day, so this source is meant for occasional legal searches.
 * Docs: https://www.courtlistener.com/help/api/rest/search
 */

const BASE = "https://www.courtlistener.com/api/rest/v4/search/";

interface CourtResult {
  caseName?: string;
  caseNameFull?: string;
  citation?: string[];
  court?: string;
  dateFiled?: string;
  absolute_url?: string;
  docketNumber?: string;
  status?: string;
}

interface CourtResponse {
  results?: CourtResult[];
}

/** Map CourtListener results to records. Exported for tests. */
export function parseCourtListener(data: CourtResponse): Paper[] {
  const papers: Paper[] = [];
  const maxYear = new Date().getFullYear() + 1;

  for (const r of data?.results ?? []) {
    const title = (r.caseNameFull || r.caseName || "").trim();
    if (!title) continue;
    const rawYear = r.dateFiled ? Number(r.dateFiled.slice(0, 4)) : null;
    const year = rawYear && rawYear >= 1000 && rawYear <= maxYear ? rawYear : null;
    const url = r.absolute_url ? `https://www.courtlistener.com${r.absolute_url}` : null;

    papers.push({
      id: paperId(null, title),
      title: stripHtml(title),
      authors: [],
      year,
      publishedDate: r.dateFiled?.slice(0, 10) || null,
      venue: r.court || "CourtListener",
      type: "other",
      doi: null,
      abstract: (r.citation ?? []).join("; ") || null,
      openAccessUrl: url,
      isOpenAccess: true,
      keywords: [r.court, r.status].filter((x): x is string => !!x),
      url,
      sources: ["courtlistener"],
    });
  }
  return papers;
}

export async function searchCourtListener(query: string, opts: AdapterOptions = {}): Promise<Paper[]> {
  const token = process.env.COURTLISTENER_API_TOKEN?.trim();
  if (!token) return [];
  const { fromYear, perSource = 15 } = opts;
  const params = new URLSearchParams({
    q: query,
    type: "o",
    order_by: "dateFiled desc",
    page_size: String(Math.min(Math.max(perSource, 1), 20)),
  });

  const res = await fetchWithTimeout(
    `${BASE}?${params}`,
    { headers: { "User-Agent": USER_AGENT, Accept: "application/json", Authorization: `Token ${token}` } },
    15000
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return parseCourtListener(await readJson<CourtResponse>(res))
    .filter((p) => !(fromYear && fromYear > 0 && p.year != null && p.year < fromYear))
    .slice(0, Math.max(1, perSource));
}

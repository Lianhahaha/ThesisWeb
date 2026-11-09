import { paperId } from "@/lib/utils";
import { fetchWithTimeout, readJson } from "@/lib/server/http";
import { USER_AGENT } from "@/lib/server/config";
import { stripHtml } from "@/lib/text";
import type { Paper } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * NASA Astrophysics Data System: astronomy, physics, earth and space science
 * literature with citation links and identifiers. A free personal token is
 * required; the default allowance is 5,000 requests/day.
 * Docs: https://ui.adsabs.harvard.edu/abs_doc/help_pages/developer_api.html
 */

const BASE = "https://api.adsabs.harvard.edu/v1/search/query";
const FIELDS = "title,author,year,abstract,doi,bibcode,identifier";

interface AdsDoc {
  title?: string[];
  author?: string[];
  year?: string | number;
  abstract?: string;
  doi?: string | string[];
  bibcode?: string;
  identifier?: string[];
}

interface AdsResponse {
  response?: { docs?: AdsDoc[] };
}

/** Map ADS documents to papers. Exported for tests. */
export function parseAds(data: AdsResponse): Paper[] {
  const papers: Paper[] = [];
  const maxYear = new Date().getFullYear() + 1;

  for (const d of data?.response?.docs ?? []) {
    const title = d.title?.[0];
    if (!title) continue;
    const rawYear = d.year != null ? Number(d.year) : null;
    const year = rawYear && rawYear >= 1000 && rawYear <= maxYear ? rawYear : null;
    const doi = (Array.isArray(d.doi) ? d.doi[0] : d.doi) ?? null;
    const url = d.bibcode ? `https://ui.adsabs.harvard.edu/abs/${d.bibcode}/abstract` : null;

    papers.push({
      id: paperId(doi, title),
      title: stripHtml(title),
      authors: (d.author ?? []).slice(0, 10),
      year,
      venue: "NASA ADS",
      type: "article",
      doi,
      abstract: d.abstract ? stripHtml(d.abstract) : null,
      openAccessUrl: null,
      isOpenAccess: false,
      keywords: [],
      url,
      sources: ["ads"],
    });
  }
  return papers;
}

export async function searchAds(query: string, opts: AdapterOptions = {}): Promise<Paper[]> {
  const token = process.env.NASA_ADS_TOKEN?.trim();
  if (!token) return [];
  const { fromYear, perSource = 15 } = opts;
  const params = new URLSearchParams({
    q: query,
    fl: FIELDS,
    rows: String(Math.min(Math.max(perSource, 1), 100)),
  });

  const res = await fetchWithTimeout(
    `${BASE}?${params}`,
    { headers: { "User-Agent": USER_AGENT, Accept: "application/json", Authorization: `Bearer ${token}` } },
    15000
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return parseAds(await readJson<AdsResponse>(res)).filter(
    (p) => !(fromYear && fromYear > 0 && p.year != null && p.year < fromYear)
  );
}

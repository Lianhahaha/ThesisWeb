import { fetchWithTimeout, safeJson, paperId } from "@/lib/utils";
import { USER_AGENT } from "@/lib/config";
import { extractDoi, extractYear, flipName, stripHtml } from "@/lib/text";
import type { Paper } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * EconBiz (ZBW – Leibniz Information Centre for Economics, Germany):
 * economics and business literature from RePEc, EconStor, publishers and
 * national libraries: journal articles, working papers, books and theses.
 * Free, no API key. Docs: https://api.econbiz.de/doc
 */

const BASE = "https://api.econbiz.de/v1/search";

interface EconBizHit {
  id?: string;
  title?: string;
  person?: string[];
  date?: string[];
  identifier_url?: string[];
  isPartOf?: string[];
  publisher?: string[];
  subject?: string[];
  type?: string;
}

export async function searchEconBiz(query: string, opts: AdapterOptions = {}): Promise<Paper[]> {
  const { fromYear, perSource = 15, openAccessOnly } = opts;

  // The API has no year-range filter, so ask for more and filter here.
  const params = new URLSearchParams({ q: query, size: String(fromYear ? perSource * 3 : perSource) });
  const res = await fetchWithTimeout(`${BASE}?${params}`, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`EconBiz ${res.status}`);
  const data = await safeJson<{ hits?: { hits?: EconBizHit[] } }>(res);

  const papers: Paper[] = [];
  for (const h of data?.hits?.hits ?? []) {
    if (!h.title) continue;
    // Dates come as "2017" or "Juni 2017".
    const year = extractYear(h.date?.[0]);
    if (fromYear && (!year || year < fromYear)) continue;

    const urls = h.identifier_url ?? [];
    const doi = urls.map((u) => extractDoi(u)).find(Boolean) ?? null;
    // A non-DOI link is usually the free copy (RePEc / EconStor PDF).
    const freeUrl = urls.find((u) => !/doi\.org/i.test(u) && /^https?:/i.test(u)) ?? null;
    if (openAccessOnly && !freeUrl) continue;
    // "Journal name ; 69.2017, 2, 153-172" -> "Journal name".
    const venue = h.isPartOf?.[0]?.split(" ; ")[0]?.replace(/\s*:.*$/, "") || h.publisher?.[0] || "EconBiz";
    const title = stripHtml(h.title);

    papers.push({
      id: paperId(doi, title),
      title,
      authors: (h.person ?? []).map(flipName).slice(0, 10),
      year,
      venue,
      doi,
      abstract: null,
      openAccessUrl: freeUrl,
      isOpenAccess: !!freeUrl,
      url: h.id ? `https://www.econbiz.de/Record/${encodeURIComponent(h.id)}` : null,
      keywords: (h.subject ?? []).slice(0, 5),
      sources: ["econbiz"],
    });
    if (papers.length >= perSource) break;
  }
  return papers;
}

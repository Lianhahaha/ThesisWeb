import { paperId } from "@/lib/utils";
import { fetchWithTimeout, readJson } from "@/lib/server/http";
import { USER_AGENT } from "@/lib/server/config";
import { flipName, stripHtml } from "@/lib/text";
import type { Paper, WorkType } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * Springer Nature Meta API: 16M+ journal articles, book chapters and
 * protocols across STM and some social sciences, with open-access PDFs where
 * the publisher provides them. A free Basic key allows 500 records/day and
 * 100 requests/minute.
 * Docs: https://dev.springernature.com/docs/api-endpoints/meta-api
 */

const BASE = "https://api.springernature.com/meta/v2/json";

interface SpringerRecord {
  identifier?: string;
  title?: string;
  creators?: { creator?: string }[];
  publicationName?: string;
  journalTitle?: string;
  publicationDate?: string;
  abstract?: string;
  doi?: string;
  openaccess?: string;
  contentType?: string;
  url?: { format?: string; platform?: string; value?: string }[];
}

interface SpringerResponse {
  records?: SpringerRecord[];
}

function springerType(type: string | undefined): WorkType {
  const t = type?.toLowerCase() ?? "";
  if (/chapter/.test(t)) return "chapter";
  if (/book/.test(t)) return "book";
  if (/protocol/.test(t)) return "report";
  return "article";
}

/** Map the API's records to papers. Exported for tests. */
export function parseSpringer(data: SpringerResponse): Paper[] {
  const papers: Paper[] = [];
  const maxYear = new Date().getFullYear() + 1;

  for (const r of data?.records ?? []) {
    if (!r.title) continue;
    const rawYear = r.publicationDate ? Number(r.publicationDate.slice(0, 4)) : null;
    const year = rawYear && rawYear >= 1000 && rawYear <= maxYear ? rawYear : null;
    const urls = r.url ?? [];
    const htmlUrl = urls.find((u) => u.format === "html")?.value;
    const pdfUrl = urls.find((u) => u.format === "pdf")?.value;
    const isOpen = r.openaccess === "true" || r.openaccess === "1";

    papers.push({
      id: paperId(r.doi, r.title),
      title: stripHtml(r.title),
      authors: (r.creators ?? [])
        .map((c) => flipName(c.creator ?? ""))
        .filter(Boolean)
        .slice(0, 10),
      year,
      publishedDate: r.publicationDate?.slice(0, 10) || null,
      venue: r.publicationName || r.journalTitle || "Springer Nature",
      type: springerType(r.contentType),
      doi: r.doi || null,
      abstract: r.abstract ? stripHtml(r.abstract) : null,
      openAccessUrl: isOpen ? pdfUrl || htmlUrl || null : null,
      isOpenAccess: isOpen,
      keywords: [],
      url: htmlUrl || (r.doi ? `https://doi.org/${r.doi}` : null),
      sources: ["springer"],
    });
  }
  return papers;
}

export async function searchSpringer(query: string, opts: AdapterOptions = {}): Promise<Paper[]> {
  const key = process.env.SPRINGER_NATURE_API_KEY?.trim();
  if (!key) return [];
  const { fromYear, perSource = 15 } = opts;
  const params = new URLSearchParams({
    q: query,
    p: String(Math.min(Math.max(perSource, 1), 25)),
    s: "1",
    api_key: key,
  });

  const res = await fetchWithTimeout(
    `${BASE}?${params}`,
    { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } },
    15000
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return parseSpringer(await readJson<SpringerResponse>(res)).filter(
    (p) => !(fromYear && fromYear > 0 && p.year != null && p.year < fromYear)
  );
}

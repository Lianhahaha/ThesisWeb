import { paperId } from "@/lib/utils";
import { fetchWithTimeout, readJson } from "@/lib/server/http";
import { USER_AGENT } from "@/lib/server/config";
import { stripHtml } from "@/lib/text";
import type { Paper } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * PROSPERO, the international prospective register of systematic review
 * protocols (CRD, University of York): 500,000+ records with review status,
 * record type, population, intervention and outcomes. Free to search; the
 * public search endpoint is the same one the portal's frontend uses.
 * https://www.crd.york.ac.uk/PROSPERO
 */

const BASE = "https://www.crd.york.ac.uk/PROSPERO";

interface ProsperoRecord {
  recordid?: number;
  accessionnumber?: string;
  title?: string;
  reviewstatus?: string;
  yearfirstpublished?: string | number;
  recordtype?: string;
}

interface ProsperoResponse {
  hits?: number;
  retvals?: { hits?: { hits?: { _source?: ProsperoRecord }[] } };
}

/** Map the search response to records. Exported for tests. */
export function parseProspero(data: ProsperoResponse[] | ProsperoResponse): Paper[] {
  const first = Array.isArray(data) ? data[0] : data;
  const hits = first?.retvals?.hits?.hits ?? [];
  const papers: Paper[] = [];
  const maxYear = new Date().getFullYear() + 1;

  for (const hit of hits) {
    const r = hit._source;
    if (!r?.title || !r.accessionnumber) continue;
    const rawYear = r.yearfirstpublished != null ? Number(r.yearfirstpublished) : null;
    const year = rawYear && rawYear >= 1000 && rawYear <= maxYear ? rawYear : null;
    const title = stripHtml(r.title);

    papers.push({
      id: paperId(null, title),
      title,
      authors: [],
      year,
      venue: "PROSPERO",
      type: "report",
      doi: null,
      abstract: [
        r.recordtype ? `Review type: ${r.recordtype}.` : null,
        r.reviewstatus ? `Status: ${r.reviewstatus}.` : null,
      ]
        .filter(Boolean)
        .join(" "),
      openAccessUrl: null,
      isOpenAccess: false,
      keywords: [r.reviewstatus, r.recordtype].filter((x): x is string => !!x),
      url: `${BASE}/view/${r.accessionnumber}`,
      sources: ["prospero"],
    });
  }
  return papers;
}

export async function searchProspero(query: string, opts: AdapterOptions = {}): Promise<Paper[]> {
  const { fromYear, perSource = 15 } = opts;
  const token = Buffer.from(String(Date.now())).toString("base64");
  const body = {
    term: query,
    page: 1,
    nperpage: Math.max(1, perSource),
    sort: "TI",
    sortorder: "ASC",
    filters: [],
    download: false,
    actual: query,
  };

  const res = await fetchWithTimeout(
    `${BASE}/api/search`,
    {
      method: "POST",
      headers: {
        "User-Agent": USER_AGENT,
        "Content-Type": "application/json",
        Accept: "application/json",
        "prospero-auth-token": token,
      },
      body: JSON.stringify(body),
    },
    15000
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return parseProspero(await readJson<ProsperoResponse[]>(res)).filter(
    (p) => !(fromYear && fromYear > 0 && p.year != null && p.year < fromYear)
  );
}

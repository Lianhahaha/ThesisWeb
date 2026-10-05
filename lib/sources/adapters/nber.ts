import { fetchWithTimeout, safeJson, paperId } from "@/lib/utils";
import { USER_AGENT } from "@/lib/config";
import { extractYear, stripHtml } from "@/lib/text";
import type { Paper } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * NBER Working Papers (National Bureau of Economic Research, U.S.): 33k+
 * economics papers on labour, health, education, development, trade and
 * finance, free to download. Working papers are not yet peer-reviewed.
 * The site's own search API; it has no year filter, so the year is
 * filtered here from a larger page.
 * https://www.nber.org/papers
 */

interface NberResult {
  title?: string;
  /** Author links, e.g. `<a href="/people/dean_yang">Dean Yang</a>`. */
  authors?: string[];
  /** "June 2006". */
  displaydate?: string;
  /** The first ~300 characters only. */
  abstract?: string;
  /** "/papers/w12325". */
  url?: string;
}

export async function searchNber(query: string, opts: AdapterOptions = {}): Promise<Paper[]> {
  const { fromYear, perSource = 15 } = opts;
  const fetchCount = fromYear ? Math.min(perSource * 3, 50) : perSource;
  const params = new URLSearchParams({ q: query, page: "1", perPage: String(fetchCount) });

  const res = await fetchWithTimeout(
    `https://www.nber.org/api/v1/working_page_listing/contentType/working_paper/_/_/search?${params}`,
    { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await safeJson<{ results?: NberResult[] }>(res);

  const papers: Paper[] = [];
  for (const r of data?.results ?? []) {
    if (!r.title) continue;
    const year = extractYear(r.displaydate);
    if (fromYear && year && year < fromYear) continue;
    const title = stripHtml(r.title);
    const num = r.url?.match(/\/papers\/(w\d+)$/)?.[1];
    const link = num ? `https://www.nber.org/papers/${num}` : null;
    const abstract = r.abstract ? stripHtml(r.abstract) : null;

    papers.push({
      // NBER registers every working paper as 10.3386/w<number>.
      id: paperId(num ? `10.3386/${num}` : null, title),
      title,
      authors: (r.authors ?? []).map(stripHtml).filter(Boolean).slice(0, 10),
      year,
      venue: "NBER Working Paper",
      doi: num ? `10.3386/${num}` : null,
      abstract: abstract && !/[.!?]$/.test(abstract) ? `${abstract}…` : abstract,
      openAccessUrl: link,
      isOpenAccess: !!link,
      keywords: [],
      url: link,
      preprint: true,
      sources: ["nber"],
    });
    if (papers.length >= perSource) break;
  }
  return papers;
}

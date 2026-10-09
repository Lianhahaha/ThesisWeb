import { fetchWithTimeout, paperId } from "@/lib/utils";
import { USER_AGENT } from "@/lib/server/config";
import { decodeEntities, extractYear, stripHtml } from "@/lib/text";
import type { Paper } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * SERP-P, the Socioeconomic Research Portal for the Philippines run by the
 * Philippine Institute for Development Studies (PIDS): discussion papers,
 * policy notes, journal articles and reports on the Philippine economy,
 * agriculture, education, health and governance from PIDS, the BSP, NEDA,
 * universities and other research institutions. Free to download.
 *
 * SERP-P has no API, so this reads its public search page (10 results, no
 * year filter). The list names the institution and paper series but not
 * the authors; the record page has them.
 * https://serp-p.pids.gov.ph
 */

const BASE = "https://serp-p.pids.gov.ph";

/** Papers from a SERP-P results page. */
export function parseSerpp(html: string): Paper[] {
  const papers: Paper[] = [];
  for (const block of html.split('<h3 class="list-content-title">').slice(1)) {
    const link = block.match(/<a href="(\/publication\/public\/view\?slug=[^"]+)"[^>]*>([\s\S]*?)<\/a>/);
    if (!link) continue;
    const title = stripHtml(link[2]);
    if (!title) continue;
    // Meta items: institution ("PIDS"), series number ("DP 2022-08"), year, downloads.
    const meta = (icon: string) => {
      const m = block.match(new RegExp(`<i class="fas ${icon}[^"]*"[^>]*></i>([^<]*)</div>`));
      return m ? stripHtml(m[1]) : "";
    };
    const institution = meta("fa-edit");
    const series = meta("fa-file-alt");
    const url = BASE + decodeEntities(link[1]);

    papers.push({
      id: paperId(null, title),
      title,
      authors: [],
      year: extractYear(meta("fa-calendar-alt")),
      venue: (series && institution && !series.startsWith(institution) ? `${institution} ${series}` : series || institution) || "SERP-P",
      doi: null,
      abstract: null,
      openAccessUrl: url,
      isOpenAccess: true,
      keywords: [],
      url,
      sources: ["serpp"],
    });
  }
  return papers;
}

export async function searchSerpp(query: string, opts: AdapterOptions = {}): Promise<Paper[]> {
  const { fromYear, perSource = 15 } = opts;
  const params = new URLSearchParams({ "SiteSearch[text_search]": query });

  const res = await fetchWithTimeout(`${BASE}/site/homepage-search?${params}`, { headers: { "User-Agent": USER_AGENT } }, 10000);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  // A changed page layout should show up as a failed source, not as "no results".
  if (!html.includes("related posts found")) throw new Error("unexpected page");

  return parseSerpp(html)
    .filter((p) => !fromYear || !p.year || p.year >= fromYear)
    .slice(0, perSource);
}

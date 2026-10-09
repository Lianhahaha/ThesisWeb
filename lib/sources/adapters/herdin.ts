import { fetchWithTimeout, paperId } from "@/lib/utils";
import { USER_AGENT } from "@/lib/server/config";
import { decodeEntities, extractYear, stripHtml } from "@/lib/text";
import type { Paper } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * HERDIN Plus, the Philippine national health research registry run by
 * DOST-PCHRD: 90k+ records of health research done in the Philippines
 * (journal articles, theses, dissertations and reports from universities,
 * hospitals and agencies), many of them in no other database.
 *
 * HERDIN has no API, so this reads its public search results page, which a
 * plain GET serves. The list shows keyword-in-context snippets ("...")
 * rather than abstracts, so no abstract is taken; the record page has it.
 * https://www.herdin.ph
 */

const BASE = "https://www.herdin.ph";

/** One labelled field of a result ("Author(s)", "Source Document", ...), as text. */
function field(block: string, label: string): string | null {
  const re = new RegExp(`listFieldLabel">${label}<[\\s\\S]*?<div class="col-md-10"[^>]*>([\\s\\S]*?)</div>`);
  const m = block.match(re);
  const text = m ? stripHtml(m[1]) : "";
  return text || null;
}

/** Papers from a HERDIN results page. */
export function parseHerdin(html: string): Paper[] {
  const papers: Paper[] = [];
  for (const block of html.split('<div class="row researchlist-div">').slice(1)) {
    const link = block.match(/<a href="(\/index\.php\/component\/herdin\/\?view=research&amp;cid=\d+)">([\s\S]*?)<\/a>/);
    if (!link) continue;
    // Search words are wrapped in <b>, sometimes mid-word ("<b>vaccine</b>s").
    const title = stripHtml(link[2].replace(/<\/?b>/g, "")).replace(/\.$/, "");
    if (!title) continue;

    // "Philippine Journal of Microbiology and Infectious Diseases. 1993; Vol. 22 ( 1 ) : p. 28-30 (Journal)"
    // or "Journal of Virology. July 2008; Vol. 82 ( 14 ) ..."
    const source = field(block, "Source Document");
    const venue = source?.split(/\s*\.\s+(?:[A-Z][a-z]+\.?\s+)?(?:1[89]|20)\d\d\b|\s*\.\s+\(/)[0].trim() || null;
    const url = BASE + decodeEntities(link[1]);

    papers.push({
      id: paperId(null, title),
      title,
      authors: (field(block, "Author\\(s\\)") ?? "")
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean)
        .slice(0, 10),
      year: extractYear(source),
      venue: venue ?? "HERDIN",
      doi: null,
      abstract: null,
      // "Full-text" here means a copy at the holding library, not online.
      openAccessUrl: null,
      isOpenAccess: false,
      keywords: [],
      url,
      sources: ["herdin"],
    });
  }
  return papers;
}

export async function searchHerdin(query: string, opts: AdapterOptions = {}): Promise<Paper[]> {
  const { fromYear, perSource = 15 } = opts;
  const fetchCount = fromYear ? Math.min(perSource * 2, 50) : perSource;
  const params = new URLSearchParams({
    option: "com_herdin",
    view: "publiclistowp",
    layout: "list",
    type: "researches",
    searchstr: query,
    "keywords[0]": query,
    "fieldList[0]": "all",
    limit: String(fetchCount),
    start: "0",
  });

  const res = await fetchWithTimeout(`${BASE}/index.php?${params}`, { headers: { "User-Agent": USER_AGENT } }, 10000);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  // A changed page layout should show up as a failed source, not as "no results".
  if (!html.includes("researchlist-div") && !html.includes("No results found.")) throw new Error("unexpected page");

  return parseHerdin(html)
    .filter((p) => !fromYear || !p.year || p.year >= fromYear)
    .slice(0, perSource);
}

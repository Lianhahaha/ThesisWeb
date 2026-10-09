import { fetchWithTimeout, paperId, safeJson } from "@/lib/utils";
import { USER_AGENT } from "@/lib/config";
import { extractYear, flipName, stripHtml } from "@/lib/text";
import type { Paper } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * Digital Archives @ UP Diliman, the University of the Philippines Diliman
 * repository: 6k+ theses and dissertations from every UPD college, most
 * with full abstracts, plus university records and personal papers.
 *
 * It has no API. The search page answers a form POST with 5 results; later
 * pages come from an AJAX call that needs the session cookie and the search
 * id from that first answer.
 * https://digitalarchives.upd.edu.ph
 */

const BASE = "https://digitalarchives.upd.edu.ph";
const PAGE_SIZE = 5;
/** Its pages are small, so cap the follow-up calls rather than the result count. */
const MAX_PAGES = 4;

/** A labelled meta value ("Author", "Date", "Item Type") from a result. */
function meta(block: string, label: string): string | null {
  const m = block.match(new RegExp(`title="${label}"></i>(?:&nbsp;|\\s)*(?:By\\s*)?<strong>([\\s\\S]*?)</strong>`));
  const text = m ? stripHtml(m[1]) : "";
  return text || null;
}

/** Papers from a page of UPD search results (the full page or an AJAX fragment). */
export function parseUpd(html: string): Paper[] {
  const papers: Paper[] = [];
  for (const block of html.split('<div class="post_content">').slice(1)) {
    // Links carry the search id as their last part; "/home" opens the same record without it.
    const link = block.match(/<h3>\s*<a href="https:\/\/digitalarchives\.upd\.edu\.ph\/item\/(\d+)\/(\d+)\/[^"]*">([\s\S]*?)<\/a>/);
    if (!link) continue;
    const title = stripHtml(link[3]);
    if (!title) continue;

    const abs = block.match(/<p class="item-desc">([\s\S]*?)<\/p>/);
    const keywords = block.match(/title="Keywords"><\/i>(?:&nbsp;|\s)*([^<]*)/);
    const type = meta(block, "Item Type");
    const url = `${BASE}/item/${link[1]}/${link[2]}/home`;

    papers.push({
      id: paperId(null, title),
      title,
      // One author per result, "Family, Given M."
      authors: (meta(block, "Author") ?? "")
        .split(/\s*;\s*/)
        .filter(Boolean)
        .map(flipName)
        .slice(0, 10),
      year: extractYear(meta(block, "Date")),
      venue: type ? `UP Diliman ${type.replace("/", " / ")}` : "UP Diliman",
      doi: null,
      abstract: abs ? stripHtml(abs[1]) || null : null,
      // Full text is often restricted to the UP network, so no open-access claim.
      openAccessUrl: null,
      isOpenAccess: false,
      keywords: keywords ? stripHtml(keywords[1]).split(/\s*;\s*/).filter(Boolean).slice(0, 5) : [],
      url,
      sources: ["upd"],
    });
  }
  return papers;
}

export async function searchUpd(query: string, opts: AdapterOptions = {}): Promise<Paper[]> {
  const { fromYear, perSource = 15 } = opts;
  const headers = { "User-Agent": USER_AGENT, "Content-Type": "application/x-www-form-urlencoded" };

  const res = await fetchWithTimeout(
    `${BASE}/search/`,
    { method: "POST", headers, body: new URLSearchParams({ searchfield: "any", SearchID: "", AjaxRequest: "doSearch", s: query }) },
    10000
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const total = Number(html.match(/returned <strong>(\d+)<\/strong> records/)?.[1] ?? NaN);
  // A changed page layout should show up as a failed source, not as "no results".
  if (Number.isNaN(total)) throw new Error("unexpected page");
  let papers = parseUpd(html);

  const wanted = Math.min(Math.ceil((fromYear ? perSource * 2 : perSource) / PAGE_SIZE), MAX_PAGES, Math.ceil(total / PAGE_SIZE));
  const searchId = html.match(/id="SearchID" name="SearchID" value="([^"]*)"|name="SearchID" value="([^"]*)"/);
  const cookie = res.headers.get("set-cookie")?.match(/PHPSESSID=[^;]+/)?.[0];
  if (wanted > 1 && searchId && cookie) {
    const pages = await Promise.allSettled(
      Array.from({ length: wanted - 1 }, (_, i) =>
        fetchWithTimeout(
          `${BASE}/app/ajax/search_ajax.php`,
          {
            method: "POST",
            headers: { ...headers, Cookie: cookie },
            body: new URLSearchParams({ AjaxRequest: "MoveToPage", pagenum: String(i + 2), SearchID: searchId[1] ?? searchId[2] }),
          },
          8000
        ).then((r) => (r.ok ? safeJson<{ SearchResult?: string }>(r) : null))
      )
    );
    // A later page that fails only costs its five results.
    for (const p of pages) if (p.status === "fulfilled" && p.value?.SearchResult) papers = papers.concat(parseUpd(p.value.SearchResult));
  }

  return papers.filter((p) => !fromYear || !p.year || p.year >= fromYear).slice(0, perSource);
}

import { fetchWithTimeout, paperId } from "@/lib/utils";
import { USER_AGENT } from "@/lib/config";
import { extractYear, stripHtml } from "@/lib/text";
import type { Paper } from "@/lib/types";
import type { Adapter, AdapterOptions } from "@/lib/sources/types";

/**
 * Shared client for Open Journal Systems (OJS 3), the software most
 * Philippine university journals run on. OJS has no keyless search API, but
 * its public search page is the same everywhere: one
 * <div class="obj_article_summary"> per article with the title link,
 * authors and publication date (no abstract), and it filters by year itself.
 * Every article is open access, so the article page is the free copy.
 */

export interface OjsConfig {
  /** Source id, as in lib/sources/meta.ts. */
  id: string;
  /** The search page, e.g. "https://example.edu.ph/index.php/journal/search". */
  searchUrl: string;
  /** Venue for every article, unless `journals` names the one in its link. */
  publisher: string;
  /** Journal names by URL path, for a portal that searches several journals. */
  journals?: Record<string, string>;
  /** Fetch timeout; some of these servers are slow. */
  timeoutMs?: number;
}

/** Degrees that OJS sites list after a name as if they were authors ("PhD", "MPH", "RN", "MAEd"). */
const CREDENTIAL = /^(?:[A-Z][a-z]?){1,5}\.?$/;

/** Papers from an OJS search results page. */
export function parseOjs(html: string, cfg: Pick<OjsConfig, "id" | "publisher" | "journals">): Paper[] {
  const papers: Paper[] = [];
  for (const block of html.split('class="obj_article_summary"').slice(1)) {
    const link = block.match(/<h3 class="title">\s*<a[^>]*href="([^"]+\/article\/view\/\d+)"[^>]*>([\s\S]*?)<\/a>/);
    if (!link) continue;
    const title = stripHtml(link[2]);
    if (!title) continue;

    const authors = block.match(/<div class="authors">([\s\S]*?)<\/div>/);
    const published = block.match(/<div class="published">([\s\S]*?)<\/div>/);
    const journal = link[1].match(/\/index\.php\/([^/]+)\/article\//)?.[1];
    const url = link[1];

    papers.push({
      id: paperId(null, title),
      title,
      authors: (authors ? stripHtml(authors[1]) : "")
        .split(/\s*,\s*/)
        .filter((a) => a && !CREDENTIAL.test(a))
        .slice(0, 10),
      year: extractYear(published ? stripHtml(published[1]) : null),
      venue: (journal && cfg.journals?.[journal]) || cfg.publisher,
      doi: null,
      abstract: null,
      openAccessUrl: url,
      isOpenAccess: true,
      preprint: false,
      keywords: [],
      url,
      sources: [cfg.id],
    });
  }
  return papers;
}

export function ojsAdapter(cfg: OjsConfig): Adapter {
  return async (query: string, opts: AdapterOptions = {}): Promise<Paper[]> => {
    const { fromYear, perSource = 15 } = opts;
    const params = new URLSearchParams({ query });
    if (fromYear && fromYear > 0) {
      params.set("dateFromYear", String(fromYear));
      params.set("dateFromMonth", "1");
      params.set("dateFromDay", "1");
    }

    const res = await fetchWithTimeout(
      `${cfg.searchUrl}?${params}`,
      { headers: { "User-Agent": USER_AGENT } },
      cfg.timeoutMs ?? 10000
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    // A changed page layout should show up as a failed source, not as "no results".
    if (!html.includes("search_results")) throw new Error("unexpected page");

    return parseOjs(html, cfg)
      .filter((p) => !fromYear || !p.year || p.year >= fromYear)
      .slice(0, perSource);
  };
}

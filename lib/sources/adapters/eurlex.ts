import { paperId } from "@/lib/utils";
import { fetchWithTimeout, readText } from "@/lib/server/http";
import { USER_AGENT } from "@/lib/server/config";
import { stripHtml } from "@/lib/text";
import type { Paper } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * EUR-Lex: EU treaties, legislation, case law and preparatory acts in every
 * EU language, free to read and reuse. The public quick-search page is
 * server-rendered, so no key or JavaScript is needed.
 * https://eur-lex.europa.eu
 */

const BASE = "https://eur-lex.europa.eu";
const SEARCH = `${BASE}/search.html`;

/** Parse the search result list. Exported for tests. */
export function parseEurLex(html: string): Paper[] {
  const papers: Paper[] = [];
  const maxYear = new Date().getFullYear() + 1;

  for (const part of html.split('class="SearchResult"').slice(1)) {
    const link = part.match(/<h2><a[^>]*href="([^"]*uri=CELEX:[^"&]+)[^"]*"[^>]*>([\s\S]*?)<\/a><\/h2>/i);
    if (!link) continue;
    const title = stripHtml(link[2]);
    if (!title) continue;

    const celex = link[1].match(/uri=CELEX:([^"&]+)/)?.[1] ?? null;
    const celexYear = celex?.match(/^[0-9](\d{4})/)?.[1];
    const ojDate = part.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    const rawYear = celexYear ? Number(celexYear) : ojDate ? Number(ojDate[3]) : null;
    const year = rawYear && rawYear >= 1000 && rawYear <= maxYear ? rawYear : null;

    const citation = part.match(/class="[^"]*textUnderTitle[^"]*">([\s\S]*?)<\/p>/i);
    const status = part.match(/class="forceIndicator"[^>]*>([\s\S]*?)<\/p>/i);
    const abstract = [citation ? stripHtml(citation[1]) : null, status ? stripHtml(status[1]) : null]
      .filter(Boolean)
      .join(" ");

    const url = link[1].startsWith("http") ? link[1] : `${BASE}/${link[1].replace(/^\.\//, "")}`;

    papers.push({
      id: paperId(null, title),
      title,
      authors: [],
      year,
      venue: "EUR-Lex",
      type: "report",
      doi: null,
      abstract: abstract || null,
      openAccessUrl: url,
      isOpenAccess: true,
      keywords: [],
      url,
      sources: ["eurlex"],
    });
  }
  return papers;
}

export async function searchEurLex(query: string, opts: AdapterOptions = {}): Promise<Paper[]> {
  const { fromYear, perSource = 15 } = opts;
  const params = new URLSearchParams({ text: query, scope: "EURLEX", type: "quick", lang: "en" });

  const res = await fetchWithTimeout(
    `${SEARCH}?${params}`,
    { headers: { "User-Agent": USER_AGENT, Accept: "text/html" } },
    18000
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return parseEurLex(await readText(res))
    .filter((p) => !(fromYear && fromYear > 0 && p.year != null && p.year < fromYear))
    .slice(0, Math.max(1, perSource));
}

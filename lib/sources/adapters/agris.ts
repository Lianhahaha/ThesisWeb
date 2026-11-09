import { paperId } from "@/lib/utils";
import { fetchWithTimeout, readText } from "@/lib/server/http";
import { USER_AGENT } from "@/lib/server/config";
import { stripHtml } from "@/lib/text";
import type { Paper } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * AGRIS, the Food and Agriculture Organization's international information
 * system for agricultural science and technology: 15M+ records on
 * agriculture, forestry, fisheries, food, nutrition and the environment,
 * indexed in more than 90 languages and linked to AGROVOC. The search page
 * is server-rendered, so no key or JavaScript is needed.
 * https://agris.fao.org
 */

const BASE = "https://agris.fao.org";

/** Parse the server-rendered result list. Exported for tests. */
export function parseAgrisResults(html: string): Paper[] {
  const papers: Paper[] = [];
  const parts = html.split(/<h6>\s*(?=<a[^>]*href="\/search\/en\/records\/)/i).slice(1);

  for (const part of parts) {
    const link = part.match(/^<a[^>]*href="(\/search\/en\/records\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!link) continue;
    const title = stripHtml(link[2]);
    if (!title) continue;

    const yearMatch = part.match(/<p[^>]*>\s*(\d{4})\s*<\/p>/);
    const rawYear = yearMatch ? Number(yearMatch[1]) : null;
    // AGRIS carries some future-dated conference records (e.g. 2028); a year
    // beyond next year would corrupt the citation, so leave it unknown.
    const maxYear = new Date().getFullYear() + 1;
    const year = rawYear && rawYear >= 1000 && rawYear <= maxYear ? rawYear : null;
    const rest = part.slice((yearMatch?.index ?? 0) + (yearMatch?.[0].length ?? 0));
    const authorsLine = rest.match(/<p[^>]*>([\s\S]*?)<\/p>/);
    const authors = authorsLine
      ? stripHtml(authorsLine[1])
          .split(/\s*\|\s*/)
          .map((name) => name.trim())
          .filter(Boolean)
          .slice(0, 10)
      : [];

    const abstractMatch =
      part.match(/data-agris-abstract[^>]*>([\s\S]*?)<\/p>/i) ??
      part.match(/<div class="abstract[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i);
    const abstract = abstractMatch ? stripHtml(abstractMatch[1]) : null;

    papers.push({
      id: paperId(null, title),
      title,
      authors,
      year,
      venue: "AGRIS",
      doi: null,
      abstract,
      openAccessUrl: null,
      isOpenAccess: false,
      keywords: [],
      url: `${BASE}${link[1]}`,
      sources: ["agris"],
    });
  }
  return papers;
}

export async function searchAgris(query: string, opts: AdapterOptions = {}): Promise<Paper[]> {
  const { fromYear, perSource = 15 } = opts;
  const params = new URLSearchParams({ q: query, size: String(Math.max(1, perSource)) });

  const res = await fetchWithTimeout(
    `${BASE}/search/en?${params}`,
    { headers: { "User-Agent": USER_AGENT, Accept: "text/html" } },
    15000
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const papers = parseAgrisResults(await readText(res));
  return papers.filter((p) => !(fromYear && fromYear > 0 && p.year != null && p.year < fromYear));
}

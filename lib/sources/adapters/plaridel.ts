import { paperId } from "@/lib/utils";
import { fetchWithTimeout, readText } from "@/lib/server/http";
import { USER_AGENT } from "@/lib/server/config";
import { stripHtml } from "@/lib/text";
import type { Paper } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * Plaridel, the Philippine journal of communication, media and society
 * published by the UP College of Mass Communication. Open access; the
 * WordPress search page lists titles, abstracts, authors and tags, and each
 * article page carries its publication date.
 * https://www.plarideljournal.org
 */

const BASE = "https://plarideljournal.org";
const SEARCH = `${BASE}/`;

interface PlaridelRow {
  title: string;
  url: string;
  type: string;
  abstract: string | null;
  authors: string[];
  keywords: string[];
}

/** Parse the WordPress search result list. Exported for tests. */
export function parsePlaridel(html: string): PlaridelRow[] {
  const rows: PlaridelRow[] = [];
  for (const part of html.split(/<div class="post-\d+ article\b/i).slice(1)) {
    const link = part.match(/<h4>\s*<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!link) continue;
    const title = stripHtml(link[2]);
    if (!title) continue;

    const type = stripHtml(part.match(/<small>([\s\S]*?)<\/small>/i)?.[1] ?? "") || "Article";
    const abstract =
      part.match(/<p><strong>Abstract<\/strong><\/p>\s*<p>([\s\S]*?)<\/p>/i)?.[1] ??
      part.match(/<p><strong>Abstrakt<\/strong><\/p>\s*<p>([\s\S]*?)<\/p>/i)?.[1] ??
      null;
    const authors = [...part.matchAll(/<span class="author-item[^"]*">\s*<a[^>]*>([\s\S]*?)<\/a>/gi)]
      .map((m) => stripHtml(m[1]))
      .filter(Boolean);
    const keywords = [...new Set(
      [...part.matchAll(/<div class="post_tags"[\s\S]*?<\/div>/gi)].flatMap((m) =>
        [...m[0].matchAll(/<a[^>]*title=["']([^"']+)["']/gi)].map((x) => x[1])
      )
    )].slice(0, 5);

    rows.push({
      title,
      url: link[1],
      type,
      abstract: abstract ? stripHtml(abstract) : null,
      authors: [...new Set(authors)].slice(0, 10),
      keywords,
    });
  }
  return rows;
}

/** Read the article's JSON-LD publication date. Exported for tests. */
export function parsePlaridelDate(html: string): { year: number | null; date: string | null } {
  const raw = html.match(/"datePublished"\s*:\s*"([^"]+)"/)?.[1]
    ?? html.match(/property="article:published_time"\s+content="([^"]+)"/)?.[1];
  if (!raw) return { year: null, date: null };
  const year = Number(raw.slice(0, 4));
  return {
    year: year && year >= 1000 && year <= new Date().getFullYear() + 1 ? year : null,
    date: raw.slice(0, 10),
  };
}

export async function searchPlaridel(query: string, opts: AdapterOptions = {}): Promise<Paper[]> {
  const { fromYear, perSource = 15 } = opts;
  const params = new URLSearchParams({ s: query });
  const res = await fetchWithTimeout(
    `${SEARCH}?${params}`,
    { headers: { "User-Agent": USER_AGENT, Accept: "text/html" } },
    15000
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const rows = parsePlaridel(await readText(res)).slice(0, Math.max(1, perSource));

  const papers = await Promise.all(
    rows.map(async (row): Promise<Paper> => {
      let date: Awaited<ReturnType<typeof parsePlaridelDate>> = { year: null, date: null };
      try {
        const r = await fetchWithTimeout(
          row.url,
          { headers: { "User-Agent": USER_AGENT, Accept: "text/html" } },
          7000
        );
        if (r.ok) date = parsePlaridelDate(await readText(r));
      } catch {
        // The search row is still useful without the article date.
      }

      return {
        id: paperId(null, row.title),
        title: row.title,
        authors: row.authors,
        year: date.year,
        publishedDate: date.date,
        venue: "Plaridel",
        type: /article/i.test(row.type) ? "article" : "other",
        doi: null,
        abstract: row.abstract,
        openAccessUrl: row.url,
        isOpenAccess: true,
        keywords: row.keywords,
        url: row.url,
        sources: ["plaridel"],
      };
    })
  );

  return papers.filter((p) => !(fromYear && fromYear > 0 && p.year != null && p.year < fromYear));
}

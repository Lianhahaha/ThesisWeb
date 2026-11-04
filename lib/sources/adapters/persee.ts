import { paperId } from "@/lib/utils";
import { fetchWithTimeout } from "@/lib/server/http";
import { decodeEntities, extractYear, flipName, stripHtml } from "@/lib/text";
import type { Paper } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * Persée, the French open archive for humanities and social sciences:
 * journal articles, book reviews and conference papers, mostly in French,
 * with free full text for the "free" titles.
 *
 * It has no public search API, but its results page is stable HTML with the
 * title, authors, journal, year and pagination on each item.
 * https://www.persee.fr
 */

const SEARCH = "https://www.persee.fr/search";

/** A paper from one Persée result block. */
export function parsePerseeItem(block: string): Paper | null {
  const title = block.match(/<a href="([^"]+)"[^>]*class="title[^"]*"[^>]*>([\s\S]*?)<\/a>/);
  if (!title) return null;
  const cleanTitle = stripHtml(title[2]);
  if (!cleanTitle) return null;

  const contributors = block.match(/<div class="contributors">([\s\S]*?)<\/div>/)?.[1] ?? "";
  const authors = [...contributors.matchAll(/class="name">([\s\S]*?)<\/span>/g)]
    .map((m) => flipName(stripHtml(m[1])))
    .filter(Boolean)
    .slice(0, 10);

  const venue = stripHtml(block.match(/<span class="collection">\s*<a[^>]*>([\s\S]*?)<\/a>/)?.[1] ?? "");
  const year = extractYear(block.match(/<span class="documentYear">([\s\S]*?)<\/span>/)?.[1] ?? null);
  const issue = stripHtml(block.match(/<span class="documentIssue">\s*<a[^>]*>([\s\S]*?)<\/a>/)?.[1] ?? "") || null;
  const pages = stripHtml(block.match(/<span class="documentPageRange">\s*pp?\.\s*([^<]+)<\/span>/)?.[1] ?? "") || null;

  // "title-free" is the site's marker for a fully free article; "title-limited" is not.
  const open = /class="title[^"]*\btitle-free\b/.test(block);
  const url = decodeEntities(title[1]);

  return {
    id: paperId(null, cleanTitle),
    title: cleanTitle,
    authors,
    year,
    publishedDate: null,
    venue: venue || "Persée",
    type: "article",
    volume: null,
    issue,
    pages,
    doi: null,
    abstract: null,
    openAccessUrl: open ? url : null,
    isOpenAccess: open,
    keywords: [],
    url,
    sources: ["persee"],
  };
}

export function parsePersee(html: string): Paper[] {
  return html
    .split('class="doc-result"')
    .slice(1)
    .map(parsePerseeItem)
    .filter((p): p is Paper => p !== null);
}

export async function searchPersee(query: string, opts: AdapterOptions = {}): Promise<Paper[]> {
  const { fromYear, perSource = 15, openAccessOnly } = opts;
  const params = new URLSearchParams({ ta: "article", q: query });

  const res = await fetchWithTimeout(`${SEARCH}?${params}`, { headers: { Accept: "text/html" } }, 12000);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  if (!html.includes("doc-result") && !/aucun r[ée]sultat/i.test(html)) throw new Error("unexpected page");

  return parsePersee(html)
    .filter((p) => !fromYear || !p.year || p.year >= fromYear)
    .filter((p) => !openAccessOnly || p.isOpenAccess)
    .slice(0, perSource);
}

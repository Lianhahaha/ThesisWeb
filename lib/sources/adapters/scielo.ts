import { paperId } from "@/lib/utils";
import { fetchWithTimeout } from "@/lib/server/http";
import { decodeEntities, extractDoi, extractYear, flipName, stripHtml } from "@/lib/text";
import type { Paper } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * SciELO, the open-access library of Latin American, Spanish, Portuguese and
 * South African journals. Most records are in Spanish or Portuguese, with
 * English titles and abstracts; medicine, agriculture, education, social
 * sciences and humanities are strongest.
 *
 * It has no public search API. Its results page is stable HTML, ten or
 * fifteen items at a time, with the journal, year, DOI and abstract there.
 * https://www.scielo.org
 */

const SEARCH = "https://search.scielo.org/";
// SciELO's edge blocks the app's polite bot user-agent; a normal browser UA is required.
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/** A paper from one SciELO result block. */
function parseItem(block: string): Paper | null {
  const title = block.match(/<strong class="title"[^>]*>([\s\S]*?)<\/strong>/)?.[1];
  if (!title) return null;

  const href =
    block.match(/<a href="([^"]+)"[^>]*>\s*<strong class="title"/)?.[1] ??
    block.match(/<div class="line">[\s\S]*?<a href="([^"]+)"/)?.[1];
  if (!href) return null;
  const url = decodeEntities(href);

  const authorBlock = block.match(/<div class="line authors">([\s\S]*?)<\/div>/)?.[1] ?? "";
  const authors = [...authorBlock.matchAll(/class="author">([\s\S]*?)<\/a>/g)]
    .map((m) => flipName(stripHtml(m[1])))
    .filter(Boolean)
    .slice(0, 10);

  // The source line also carries the publication date; the next line starts the actions.
  const sourceBlock = block.match(/<div class="line source">([\s\S]*?)<div class="user-actions">/)?.[1] ?? "";
  const venue = stripHtml(
    sourceBlock.match(/data-original-title="Metrics"[^>]*>([\s\S]*?)<\/a>/)?.[1] ?? ""
  );
  const year = extractYear(stripHtml(sourceBlock));

  const doi = extractDoi(block.match(/class="DOIResults"><a href="([^"]+)"/)?.[1] ?? null);
  const abstract =
    stripHtml(block.match(/<div id="[^"]+_en" class="abstract"[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? "") ||
    stripHtml(block.match(/<div id="[^"]+" class="abstract"[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? "") ||
    null;

  const pdf = block.match(/href="([^"]*sci_pdf[^"]*)"/)?.[1];
  const openAccessUrl = pdf ? decodeEntities(pdf) : url;

  return {
    id: paperId(doi, stripHtml(title)),
    title: stripHtml(title),
    authors,
    year,
    publishedDate: null,
    venue: venue || "SciELO",
    type: "article",
    doi,
    abstract,
    openAccessUrl,
    isOpenAccess: true,
    keywords: [],
    url,
    sources: ["scielo"],
  };
}

export function parseScielo(html: string): Paper[] {
  return html
    .split('class="item"')
    .slice(1)
    .map(parseItem)
    .filter((p): p is Paper => p !== null);
}

export async function searchScielo(query: string, opts: AdapterOptions = {}): Promise<Paper[]> {
  const { fromYear, perSource = 15 } = opts;
  const params = new URLSearchParams({ q: query, lang: "en", count: String(Math.min(perSource, 50)) });

  const res = await fetchWithTimeout(
    `${SEARCH}?${params}`,
    {
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    },
    12000
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  if (!html.includes('class="results"')) throw new Error("unexpected page");

  return parseScielo(html)
    .filter((p) => !fromYear || !p.year || p.year >= fromYear)
    .slice(0, perSource);
}

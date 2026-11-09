import { paperId } from "@/lib/utils";
import { fetchWithTimeout, waitTurn, readText } from "@/lib/server/http";
import { USER_AGENT } from "@/lib/server/config";
import { stripHtml } from "@/lib/text";
import type { Paper } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * arXiv adapter.
 * - ~2.5M preprints mostly in physics, math, computer science, quantitative biology, quantitative finance, statistics, electrical engineering and systems science, and economics.
 * - Completely free, no API key needed, Atom XML format.
 * - Rate limit: one request every three seconds (arXiv API terms of use);
 *   searches on one server queue for their turn (waitTurn).
 * - When the API refuses or times out, the server-rendered search page is used.
 * Docs: https://info.arxiv.org/help/api/user-manual.html
 */

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/** Decode the XML entities arXiv's Atom feed uses in text nodes. */
function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, "&"); // last, so "&amp;lt;" stays a literal "&lt;"
}

/**
 * arXiv reads `all:dual axis tracker` as `all:dual` OR the bare words, so
 * results matched any one word ("solar tracking" returned solar-wind
 * papers). Require every word, and give the country clause
 * (`AND ("Philippines" OR "Filipino")`) the field prefix arXiv needs.
 */
export function arxivQuery(query: string): string {
  const clause = query.match(/\s+AND\s+\(([^)]+)\)\s*$/i);
  const base = clause ? query.slice(0, clause.index) : query;
  const words = base
    .replace(/["():]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !/^(AND|OR|NOT)$/i.test(w));
  let q = words.map((w) => `all:${w}`).join(" AND ");
  if (clause) {
    const terms = [...clause[1].matchAll(/"([^"]+)"/g)].map((t) => `all:"${t[1]}"`);
    if (terms.length) q += ` AND (${terms.join(" OR ")})`;
  }
  return q;
}

/** Parse the server-rendered /search page. Exported for tests. */
export function parseArxivHtml(html: string): Paper[] {
  const papers: Paper[] = [];
  const maxYear = new Date().getFullYear() + 1;

  for (const part of html.split(/<li class="arxiv-result">/).slice(1)) {
    const id = part.match(
      /<p class="list-title[^"]*"><a href="https:\/\/arxiv\.org\/abs\/([^"]+)"/i
    )?.[1];
    const titleRaw = part.match(/<p class="title is-5 mathjax">([\s\S]*?)<\/p>/i)?.[1];
    if (!id || !titleRaw) continue;

    const title = stripHtml(titleRaw);
    if (!title) continue;
    const authorBlock = part.match(/<p class="authors">([\s\S]*?)<\/p>/i)?.[1] ?? "";
    const authors = [...authorBlock.matchAll(/<a[^>]*>([\s\S]*?)<\/a>/gi)]
      .map((m) => stripHtml(m[1]))
      .filter(Boolean)
      .slice(0, 10);
    const abstractRaw =
      part.match(/<span class="abstract-full[^"]*"[^>]*>([\s\S]*?)<\/span>/i)?.[1] ??
      part.match(/<span class="abstract-short[^"]*"[^>]*>([\s\S]*?)<\/span>/i)?.[1];
    const abstract = abstractRaw
      ? stripHtml(abstractRaw).replace(/\s*(Less|More)\s*$/i, "").trim() || null
      : null;

    const submitted =
      part.match(/Submitted<\/span>\s*\d{1,2}\s+\w+,\s*(\d{4})/)?.[1] ??
      part.match(/originally announced<\/span>\s*\w+\s*(\d{4})/)?.[1];
    const rawYear = submitted ? Number(submitted) : null;
    const year = rawYear && rawYear >= 1000 && rawYear <= maxYear ? rawYear : null;
    const pdf = `https://arxiv.org/pdf/${id}.pdf`;

    papers.push({
      id: paperId(null, title),
      title,
      authors,
      year,
      venue: "arXiv",
      type: "preprint",
      doi: null,
      abstract,
      openAccessUrl: pdf,
      isOpenAccess: true,
      keywords: [],
      url: `https://arxiv.org/abs/${id}`,
      preprint: true,
      sources: ["arxiv"],
    });
  }
  return papers;
}

async function searchArxivApi(
  query: string,
  opts: AdapterOptions
): Promise<Paper[]> {
  const { fromYear, perSource = 15 } = opts;
  const fetchCount = fromYear ? Math.min(perSource * 2, 50) : perSource;
  const url = `https://export.arxiv.org/api/query?search_query=${encodeURIComponent(
    arxivQuery(query)
  )}&start=0&max_results=${fetchCount}&sortBy=relevance&sortOrder=descending`;

  await waitTurn("arxiv", 3000);
  // The API refuses requests with an anonymous client ("429 Rate exceeded").
  const res = await fetchWithTimeout(
    url,
    { headers: { "User-Agent": USER_AGENT, Accept: "application/atom+xml" } },
    8000
  );
  if (res.status === 429) throw new Error("rate limited (429)");
  if (!res.ok) throw new Error(`arXiv search failed: ${res.status}`);

  const text = await readText(res);
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;
  const papers: Paper[] = [];

  while ((match = entryRegex.exec(text)) !== null) {
    const entryXml = match[1];
    const idMatch = entryXml.match(/<id>(.*?)<\/id>/);
    const arxivUrl = idMatch ? idMatch[1].trim() : null;
    const arxivId = arxivUrl ? arxivUrl.split("/abs/")[1]?.replace(/v\d+$/, "") : null;

    const titleMatch = entryXml.match(/<title>([\s\S]*?)<\/title>/);
    const title = titleMatch ? decodeXml(titleMatch[1]).replace(/\s+/g, " ").trim() : "Untitled";

    const abstractMatch = entryXml.match(/<summary>([\s\S]*?)<\/summary>/);
    const abstract = abstractMatch
      ? decodeXml(abstractMatch[1]).replace(/\s+/g, " ").trim()
      : null;

    const publishedMatch = entryXml.match(/<published>(.*?)<\/published>/);
    const publishedStr = publishedMatch ? publishedMatch[1].trim() : null;
    const year = publishedStr ? parseInt(publishedStr.slice(0, 4), 10) : null;
    if (fromYear && year && year < fromYear) continue;

    const authors: string[] = [];
    const authorRegex = /<author>\s*<name>([\s\S]*?)<\/name>/g;
    let authorMatch;
    while ((authorMatch = authorRegex.exec(entryXml)) !== null) {
      authors.push(decodeXml(authorMatch[1]).trim());
    }

    const doiMatch = entryXml.match(/<arxiv:doi[^>]*>(.*?)<\/arxiv:doi>/);
    const doi = doiMatch ? doiMatch[1].trim() : null;
    const pdfUrl = arxivId ? `https://arxiv.org/pdf/${arxivId}.pdf` : null;

    papers.push({
      id: paperId(doi, title),
      title,
      authors: authors.slice(0, 10),
      year,
      publishedDate: publishedStr ? publishedStr.slice(0, 10) : null,
      venue: "arXiv",
      type: "preprint",
      doi,
      abstract,
      tldr: null,
      openAccessUrl: pdfUrl,
      isOpenAccess: true,
      citedByCount: 0,
      keywords: [],
      preprint: true,
      sources: ["arxiv"],
    });

    if (papers.length >= perSource) break;
  }

  return papers;
}

async function searchArxivHtml(
  query: string,
  opts: AdapterOptions
): Promise<Paper[]> {
  const { fromYear, perSource = 15 } = opts;
  const base = query.replace(/\s+AND\s+\([^)]+\)\s*$/i, "").trim();
  const params = new URLSearchParams({
    query: base,
    searchtype: "all",
    abstracts: "show",
    order: "-announced_date_first",
    size: String(Math.min(Math.max(perSource, 1), 50)),
  });
  const res = await fetchWithTimeout(
    `https://arxiv.org/search/?${params}`,
    { headers: { "User-Agent": BROWSER_UA, Accept: "text/html" } },
    16000
  );
  if (!res.ok) throw new Error(`arXiv HTML ${res.status}`);
  return parseArxivHtml(await readText(res))
    .filter((p) => !(fromYear && fromYear > 0 && p.year != null && p.year < fromYear))
    .slice(0, Math.max(1, perSource));
}

export async function searchArxiv(
  query: string,
  opts: AdapterOptions = {}
): Promise<Paper[]> {
  try {
    return await searchArxivApi(query, opts);
  } catch (apiError) {
    try {
      return await searchArxivHtml(query, opts);
    } catch {
      throw apiError;
    }
  }
}

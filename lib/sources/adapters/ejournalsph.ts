import { fetchWithTimeout, paperId } from "@/lib/utils";
import { USER_AGENT } from "@/lib/server/config";
import { decodeEntities, extractYear, stripHtml } from "@/lib/text";
import type { Paper } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * Philippine E-Journals (C&E Publishing): one site holding the articles of
 * hundreds of Philippine university and society journals, with free PDFs.
 *
 * It has no API. The search page lists every match on one page with title
 * and first author only, and runs to megabytes for common words, so only
 * its first part is read. The year, all authors, journal, abstract and PDF
 * come from each article's page, which is fetched for the top results.
 * https://ejournals.ph
 */

const BASE = "https://ejournals.ph";
/** Enough of the result list for well over the results needed. */
const LIST_BYTES = 120_000;
/** Article pages fetched at once; more than this slows the site down for everyone. */
const CONCURRENCY = 8;
/** Per article page. The site answers most in about a second but some take 20 s. */
const ARTICLE_MS = 4000;
/** No new article page is started after this long, so the search stays within its deadline. */
const BUDGET_MS = 10000;

/** Search hits from the results page: article id, title and first author. */
export function parseEjournalsList(html: string): { id: string; title: string; author: string | null }[] {
  const start = html.indexOf('<div id="article">');
  if (start === -1) return [];
  const hits: { id: string; title: string; author: string | null }[] = [];
  for (const block of html.slice(start).split('<div class="search_item">').slice(1)) {
    const link = block.match(/<a href="article\.php\?id=(\d+)"><h2[^>]*>([\s\S]*?)<\/h2>/);
    if (!link) continue;
    const title = stripHtml(link[2]);
    if (!title) continue;
    const author = block.match(/href='function\/author\.php\?id=\d+'>([\s\S]*?)<\/a>/);
    hits.push({ id: link[1], title, author: author ? stripHtml(author[1]) || null : null });
  }
  return hits;
}

/** The values of one Highwire <meta name="citation_..."> tag. */
function metas(html: string, name: string): string[] {
  return [...html.matchAll(new RegExp(`<meta name="${name}" content="([^"]*)"`, "g"))]
    .map((m) => stripHtml(m[1]).replace(/,\s*$/, ""))
    .filter(Boolean);
}

/** A paper from an article page; null if the page has no title. */
export function parseEjournalsArticle(html: string, id: string): Paper | null {
  const title = metas(html, "citation_title")[0];
  if (!title) return null;
  const abs = html.match(/<h4>Abstract:<\/h4>([\s\S]*?)(?:<h4|<\/div>)/);
  const pdf = metas(html, "citation_pdf_url")[0];
  const pdfUrl = pdf ? `${BASE}/${encodeURI(decodeEntities(pdf).replace(/^\/+/, ""))}` : null;
  return {
    id: paperId(null, title),
    title,
    authors: metas(html, "citation_author").slice(0, 10),
    year: extractYear(metas(html, "citation_publication_date")[0]),
    venue: metas(html, "citation_journal_title")[0] ?? "Philippine E-Journals",
    doi: null,
    abstract: abs ? stripHtml(abs[1]) || null : null,
    openAccessUrl: pdfUrl,
    isOpenAccess: Boolean(pdfUrl),
    keywords: [],
    url: `${BASE}/article.php?id=${id}`,
    sources: ["ejournalsph"],
  };
}

/** The first `max` bytes of a response body as text; the rest is never downloaded. */
async function readStart(res: Response, max: number): Promise<string> {
  if (!res.body) return res.text();
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  try {
    while (text.length < max) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
    }
  } finally {
    reader.cancel().catch(() => {});
  }
  return text;
}

export async function searchEjournalsPh(query: string, opts: AdapterOptions = {}): Promise<Paper[]> {
  const { fromYear, perSource = 15, openAccessOnly } = opts;
  const headers = { "User-Agent": USER_AGENT };

  const started = Date.now();
  const res = await fetchWithTimeout(`${BASE}/search.php?searchStr=${encodeURIComponent(query)}`, { headers }, 9000);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await readStart(res, LIST_BYTES);
  // A changed page layout should show up as a failed source, not as "no results".
  if (!html.includes("search_item") && !html.includes('<div id="article">')) throw new Error("unexpected page");

  // The list has no years, so a year filter needs a few more candidates.
  const hits = parseEjournalsList(html).slice(0, fromYear ? perSource + 5 : perSource);
  const pages: (string | null)[] = new Array(hits.length).fill(null);
  let next = 0;
  async function worker() {
    while (next < hits.length && Date.now() - started < BUDGET_MS) {
      const i = next++;
      pages[i] = await fetchWithTimeout(`${BASE}/article.php?id=${hits[i].id}`, { headers }, ARTICLE_MS)
        .then((r) => (r.ok ? r.text() : null))
        .catch(() => null);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const papers = hits.map((h, i): Paper => {
    const page = pages[i];
    const full = page ? parseEjournalsArticle(page, h.id) : null;
    // A page that failed to load still leaves the title, first author and link.
    return (
      full ?? {
        id: paperId(null, h.title),
        title: h.title,
        authors: h.author ? [h.author] : [],
        year: null,
        venue: "Philippine E-Journals",
        doi: null,
        abstract: null,
        openAccessUrl: null,
        isOpenAccess: false,
        keywords: [],
        url: `${BASE}/article.php?id=${h.id}`,
        sources: ["ejournalsph"],
      }
    );
  });

  return papers
    // Without its article page a hit has no year, and most of this site's archive is old.
    .filter((p) => !fromYear || (p.year !== null && p.year >= fromYear))
    .filter((p) => !openAccessOnly || p.isOpenAccess)
    .slice(0, perSource);
}

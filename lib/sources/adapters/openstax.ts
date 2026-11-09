import { normalizeForMatch, paperId } from "@/lib/utils";
import { fetchWithTimeout, readJson } from "@/lib/server/http";
import { USER_AGENT } from "@/lib/server/config";
import { stripHtml } from "@/lib/text";
import type { Paper } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * OpenStax (Rice University): free, peer-reviewed open textbooks across
 * maths, science, business, social science and the humanities, with a free
 * PDF for every book. The catalogue is small enough to fetch once and match
 * locally, which avoids the CMS search's exact-title behaviour.
 * Catalogue: https://openstax.org/apps/cms/api/v2/pages/?type=books.Book
 */

const API = "https://openstax.org/apps/cms/api/v2/pages/";
const FIELDS = [
  "title",
  "description",
  "authors",
  "publish_date",
  "pdf_url",
  "high_resolution_pdf_url",
  "book_state",
  "book_subjects",
  "book_categories",
  "webview_rex_link",
  "license_name",
  "license_url",
].join(",");
const PAGE_SIZE = 100;
const CACHE_MS = 24 * 60 * 60 * 1000;

interface OpenStaxAuthor {
  type?: string;
  value?: { name?: string };
}

interface OpenStaxBook {
  id?: number;
  meta?: { slug?: string; html_url?: string };
  title?: string;
  book_state?: string;
  description?: string | null;
  publish_date?: string | null;
  authors?: OpenStaxAuthor[];
  book_subjects?: { subject_name?: string }[];
  book_categories?: { subject_name?: string; subject_category?: string }[];
  pdf_url?: string | null;
  high_resolution_pdf_url?: string | null;
  webview_rex_link?: string | null;
  license_name?: string | null;
  license_url?: string | null;
}

const STOP_WORDS = new Set([
  "and", "or", "not", "the", "a", "an", "of", "in", "on", "for", "to",
  "with", "by", "from", "at", "as", "is", "are", "its", "their", "this",
]);

function words(text: string): string[] {
  return normalizeForMatch(text)
    .split(" ")
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

/** Small, conservative stemmer: enough for plurals and the usual -ing/-ed forms. */
function stem(word: string): string {
  if (word.length <= 4) return word;
  if (word.endsWith("ies")) return word.slice(0, -3) + "y";
  if (word.endsWith("ing") && word.length > 5) return word.slice(0, -3);
  if (word.endsWith("ed") && word.length > 4) return word.slice(0, -2);
  if (word.endsWith("es") && word.length > 4) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

function authorNames(book: OpenStaxBook): string[] {
  const names = (book.authors ?? [])
    .map((a) => (a.value?.name ?? "").replace(/\s+/g, " ").trim())
    .filter(Boolean);
  return [...new Set(names)].slice(0, 10);
}

function subjects(book: OpenStaxBook): string[] {
  return [
    ...(book.book_subjects ?? []).map((s) => s.subject_name ?? ""),
    ...(book.book_categories ?? []).map((c) => c.subject_category ?? c.subject_name ?? ""),
  ].filter(Boolean);
}

function publishYear(book: OpenStaxBook): number | null {
  const year = book.publish_date ? Number(book.publish_date.slice(0, 4)) : NaN;
  return Number.isFinite(year) ? year : null;
}

function searchText(book: OpenStaxBook): string {
  return [book.title ?? "", stripHtml(book.description ?? ""), ...subjects(book), ...authorNames(book)].join(" ");
}

/** How many of the query's (stemmed) terms the book mentions. Exported for tests. */
export function openstaxScore(book: OpenStaxBook, query: string): number {
  const terms = [...new Set(words(query).map(stem))];
  if (!terms.length) return 0;
  const haystack = new Set(words(searchText(book)).map(stem));
  return terms.filter((t) => haystack.has(t)).length;
}

function toPaper(book: OpenStaxBook): Paper {
  const title = (book.title ?? "").trim();
  const pdf = book.pdf_url || book.high_resolution_pdf_url || null;
  const web = book.webview_rex_link || book.meta?.html_url || null;
  return {
    id: paperId(null, title),
    title,
    authors: authorNames(book),
    year: publishYear(book),
    publishedDate: book.publish_date?.slice(0, 10) || null,
    venue: "OpenStax",
    publisher: "OpenStax",
    type: "book",
    doi: null,
    abstract: book.description ? stripHtml(book.description) : null,
    openAccessUrl: pdf || web,
    isOpenAccess: true,
    keywords: subjects(book).slice(0, 5),
    url: web,
    sources: ["openstax"],
  };
}

async function fetchCatalog(): Promise<OpenStaxBook[]> {
  const books: OpenStaxBook[] = [];
  let offset = 0;
  for (;;) {
    const params = new URLSearchParams({
      type: "books.Book",
      fields: FIELDS,
      limit: String(PAGE_SIZE),
      offset: String(offset),
    });
    const res = await fetchWithTimeout(
      `${API}?${params}`,
      { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } },
      12000
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await readJson<{ items?: OpenStaxBook[]; meta?: { total_count?: number } }>(res);
    const items = data?.items ?? [];
    books.push(...items);
    offset += items.length;
    const total = data?.meta?.total_count ?? books.length;
    if (items.length === 0 || offset >= total || offset > 2000) break;
  }
  return books;
}

let cache: { at: number; books: OpenStaxBook[] } | null = null;
let inflight: Promise<OpenStaxBook[]> | null = null;

async function getCatalog(): Promise<OpenStaxBook[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.books;
  if (!inflight) {
    inflight = fetchCatalog()
      .then((books) => {
        cache = { at: Date.now(), books };
        return books;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/** Drop the cached catalogue (tests, or after changing the matcher). */
export function resetOpenStaxCache(): void {
  cache = null;
  inflight = null;
}

export async function searchOpenStax(query: string, opts: AdapterOptions = {}): Promise<Paper[]> {
  const { fromYear = 0, perSource = 15 } = opts;
  const terms = [...new Set(words(query).map(stem))];
  if (!terms.length) return [];

  const books = (await getCatalog()).filter((book) => {
    if (book.book_state !== "live" || !book.title) return false;
    const year = publishYear(book);
    return !(fromYear > 0 && year != null && year < fromYear);
  });

  // A country focus appends the country's name to non-boolean queries, so a
  // book need not repeat every query word; most of them is a real match.
  const need = Math.max(1, Math.ceil(terms.length * 0.6));

  return books
    .map((book) => ({ book, score: openstaxScore(book, query) }))
    .filter(({ score }) => score >= need)
    .sort((a, b) => b.score - a.score || (publishYear(b.book) ?? 0) - (publishYear(a.book) ?? 0))
    .slice(0, Math.max(1, perSource))
    .map(({ book }) => toPaper(book));
}

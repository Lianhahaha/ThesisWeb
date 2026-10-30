import { paperId } from "@/lib/utils";
import { fetchWithTimeout, readJson, upstreamError } from "@/lib/server/http";
import { USER_AGENT } from "@/lib/server/config";
import type { Paper, WorkType } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";

const API_KEY = process.env.IEEE_XPLORE_API_KEY?.trim() || "";
const BASE = "https://ieeexploreapi.ieee.org/api/v1/search/articles";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX = 300;
const cache = new Map<string, { at: number; papers: Paper[] }>();

const DAILY_LIMIT = 180;
const REDIS_URL = (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "").trim().replace(/\/$/, "");
const REDIS_TOKEN = (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "").trim();
const REDIS_MS = 800;

let localDay = "";
let localCalls = 0;

interface IeeeAuthor {
  full_name?: string;
  author_order?: number;
}

interface IeeeArticle {
  title?: string;
  abstract?: string;
  doi?: string | null;
  publication_title?: string;
  publication_year?: number | string;
  publication_date?: string;
  content_type?: string;
  volume?: string;
  issue?: string;
  start_page?: string;
  end_page?: string;
  publisher?: string;
  citing_paper_count?: number;
  access_type?: string;
  is_open_access?: boolean;
  article_number?: string;
  html_url?: string;
  abstract_url?: string;
  pdf_url?: string;
  authors?: { authors?: IeeeAuthor[] };
  index_terms?: {
    author_terms?: { terms?: string[] };
    ieee_terms?: { terms?: string[] };
  };
}

const WORK_TYPE: Record<string, WorkType> = {
  Journals: "article",
  Magazines: "article",
  "Early Access": "article",
  Conferences: "conference",
  Books: "book",
  Standards: "report",
  Courses: "other",
};

function yearOf(it: IeeeArticle): number | null {
  const value = it.publication_year;
  if (typeof value === "number" && Number.isInteger(value)) return value;
  const year = Number(String(value ?? "").slice(0, 4));
  if (Number.isInteger(year) && year >= 1000) return year;
  const found = (it.publication_date ?? "").match(/\b(?:19|20)\d{2}\b/);
  return found ? Number(found[0]) : null;
}

export function ieeePages(it: IeeeArticle): string | null {
  const start = (it.start_page ?? "").trim();
  const end = (it.end_page ?? "").trim();
  if (start && end && end !== start) return `${start}-${end}`;
  return start || end || null;
}

function ieeeKeywords(it: IeeeArticle): string[] {
  const terms = [
    ...(it.index_terms?.author_terms?.terms ?? []),
    ...(it.index_terms?.ieee_terms?.terms ?? []),
  ];
  return [...new Set(terms.map((t) => t.trim()).filter(Boolean))].slice(0, 20);
}

export function ieeeArticleToPaper(it: IeeeArticle): Paper | null {
  const title = (it.title ?? "").replace(/\s+/g, " ").trim();
  if (!title) return null;

  const doi = it.doi?.trim() || null;
  const open = it.is_open_access === true || /open/i.test(it.access_type ?? "");
  const pageUrl =
    it.html_url ||
    it.abstract_url ||
    (it.article_number ? `https://ieeexplore.ieee.org/document/${it.article_number}` : null);
  const pdfUrl = open ? it.pdf_url || pageUrl : null;

  const authors = (it.authors?.authors ?? [])
    .slice()
    .sort((a, b) => (a.author_order ?? 0) - (b.author_order ?? 0))
    .map((a) => (a.full_name ?? "").replace(/\s+/g, " ").trim())
    .filter(Boolean);

  return {
    id: paperId(doi, title),
    title,
    authors,
    year: yearOf(it),
    publishedDate: /^\d{4}-\d{2}-\d{2}/.test(it.publication_date ?? "")
      ? it.publication_date!.slice(0, 10)
      : null,
    venue: it.publication_title?.trim() || null,
    type: it.content_type ? WORK_TYPE[it.content_type] : undefined,
    volume: it.volume ?? null,
    issue: it.issue ?? null,
    pages: ieeePages(it),
    publisher: it.publisher ?? null,
    doi,
    abstract: it.abstract?.trim() || null,
    openAccessUrl: pdfUrl,
    url: pageUrl,
    isOpenAccess: open && !!pdfUrl,
    citedByCount: typeof it.citing_paper_count === "number" ? it.citing_paper_count : 0,
    keywords: ieeeKeywords(it),
    sources: ["ieee"],
  };
}

async function takeCall(): Promise<boolean> {
  const day = new Date().toISOString().slice(0, 10);

  if (REDIS_URL && REDIS_TOKEN) {
    const key = `tw:ieee:calls:${day}`;
    try {
      const res = await fetchWithTimeout(
        `${REDIS_URL}/pipeline`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
          body: JSON.stringify([
            ["INCR", key],
            ["PEXPIRE", key, String(CACHE_TTL_MS), "NX"],
          ]),
        },
        REDIS_MS
      );
      if (res.ok) {
        const replies = (await res.json()) as { result?: unknown }[];
        const count = replies[0]?.result;
        if (typeof count === "number") return count <= DAILY_LIMIT;
      }
    } catch {
      // Fall back to this instance's own count.
    }
  }

  if (localDay !== day) {
    localDay = day;
    localCalls = 0;
  }
  if (localCalls >= DAILY_LIMIT) return false;
  localCalls++;
  return true;
}

export async function searchIeee(query: string, opts: AdapterOptions = {}): Promise<Paper[]> {
  if (!API_KEY) return [];

  const { fromYear, perSource = 15, openAccessOnly } = opts;
  const cacheKey = JSON.stringify([query, fromYear ?? 0, perSource, !!openAccessOnly]);
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.papers;
  if (!(await takeCall())) throw new Error("daily API limit reached; try again tomorrow");

  const params = new URLSearchParams({
    apikey: API_KEY,
    format: "json",
    querytext: query,
    max_records: String(Math.min(perSource, 200)),
    start_record: "1",
  });
  if (fromYear) params.set("start_year", String(fromYear));
  if (openAccessOnly) params.set("open_access", "true");

  const res = await fetchWithTimeout(
    `${BASE}?${params}`,
    { headers: { Accept: "application/json", "User-Agent": USER_AGENT } },
    10000
  );
  if (res.status === 403) throw new Error("key not active yet");
  if (res.status === 429) throw new Error("rate limited");
  if (!res.ok) throw upstreamError("IEEE Xplore", res.status);

  const data = await readJson<{ articles?: IeeeArticle[] }>(res, {});
  const papers = (data?.articles ?? [])
    .map(ieeeArticleToPaper)
    .filter((p): p is Paper => p !== null);

  if (cache.size >= CACHE_MAX) cache.clear();
  cache.set(cacheKey, { at: Date.now(), papers });
  return papers;
}

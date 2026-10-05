import { fetchWithTimeout, safeJson, paperId } from "@/lib/utils";
import { USER_AGENT } from "@/lib/config";
import { extractDoi, flipName, stripHtml } from "@/lib/text";
import type { Paper } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * CORE (The Open University and Jisc, UK): 300M+ open-access papers
 * harvested from 10k+ university repositories and journals worldwide,
 * including Philippine ones, with links to the repository's free copy.
 * Works without a key at a low rate limit; a free CORE_API_KEY raises it.
 * Docs: https://api.core.ac.uk/docs/v3
 */

const API_KEY = process.env.CORE_API_KEY?.trim() || "";

interface CoreWork {
  id?: number;
  title?: string;
  authors?: { name?: string }[];
  yearPublished?: number | null;
  publishedDate?: string | null;
  doi?: string | null;
  abstract?: string | null;
  downloadUrl?: string | null;
  publisher?: string | null;
  journals?: { title?: string }[];
  dataProviders?: { name?: string }[];
}

/**
 * Authors as given ("Family, Given" from repositories, "Given Family (id)"
 * from Figshare), flipped, without Figshare's numeric ids and repeats.
 */
function coreAuthors(list: CoreWork["authors"]): string[] {
  const names = (list ?? []).map((a) => flipName((a.name ?? "").replace(/\s*\(\d+\)$/, "").replace(/\s+/g, " ")));
  return [...new Set(names.filter(Boolean))].slice(0, 10);
}

/**
 * CORE ORs bare words, so "reading comprehension strategies" matched any
 * paper with one of them. Require every word, keep the country clause
 * (`AND ("Philippines" OR "Filipino")`) as it is, and add the year range.
 */
export function coreQuery(query: string, fromYear?: number): string {
  const clause = query.match(/\s+AND\s+\(([^)]+)\)\s*$/i);
  const base = clause ? query.slice(0, clause.index) : query;
  const words = base
    .replace(/["():]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !/^(AND|OR|NOT)$/i.test(w));
  const parts = [`(${words.join(" AND ")})`];
  if (clause) parts.push(`(${clause[1]})`);
  if (fromYear && fromYear > 0) parts.push(`yearPublished>=${fromYear}`);
  return parts.join(" AND ");
}

export async function searchCore(query: string, opts: AdapterOptions = {}): Promise<Paper[]> {
  const { fromYear, perSource = 15, openAccessOnly } = opts;
  const q = coreQuery(query, fromYear) + (openAccessOnly ? " AND _exists_:downloadUrl" : "");
  const params = new URLSearchParams({ q, limit: String(perSource) });

  const url = `https://api.core.ac.uk/v3/search/works/?${params}`;
  const headers: Record<string, string> = { "User-Agent": USER_AGENT, Accept: "application/json" };
  let res = await fetchWithTimeout(url, { headers: API_KEY ? { ...headers, Authorization: `Bearer ${API_KEY}` } : headers }, 10000);
  if (res.status === 401 && API_KEY) {
    // A key CORE doesn't accept (not yet activated, or revoked) shouldn't
    // take the source down: anonymous access still works, more slowly.
    console.warn("[core] CORE_API_KEY was refused; searching anonymously");
    res = await fetchWithTimeout(url, { headers }, 10000);
  }
  if (res.status === 429) throw new Error(API_KEY ? "rate limited" : "rate limited (set CORE_API_KEY)");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await safeJson<{ results?: CoreWork[] }>(res);

  const papers: Paper[] = [];
  for (const w of data?.results ?? []) {
    if (!w.title) continue;
    const title = stripHtml(w.title);
    const doi = extractDoi(w.doi);
    // Single figures and tables of PLOS papers (10.1371/journal.pone.0261412.g005)
    // are harvested as works of their own; the paper itself is what to cite.
    if (doi && /\.[gst]\d{3}$/.test(doi)) continue;
    const year = w.yearPublished ?? null;
    if (fromYear && year && year < fromYear) continue;
    const pdf = w.downloadUrl || null;

    papers.push({
      id: paperId(doi, title),
      title,
      authors: coreAuthors(w.authors),
      year,
      publishedDate: w.publishedDate?.slice(0, 10) || null,
      venue: w.journals?.[0]?.title || w.publisher || w.dataProviders?.[0]?.name || null,
      doi,
      abstract: w.abstract ? stripHtml(w.abstract) : null,
      openAccessUrl: pdf,
      isOpenAccess: !!pdf,
      keywords: [],
      url: w.id ? `https://core.ac.uk/works/${w.id}` : null,
      sources: ["core"],
    });
  }
  return papers;
}

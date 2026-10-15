import { paperId } from "@/lib/utils";
import { fetchWithTimeout, readJson, sleep, waitTurn } from "@/lib/server/http";
import type { Paper, WorkType } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";
import { decodeEntities } from "@/lib/text";

/**
 * Semantic Scholar adapter — TLDRs, citation graphs, influential citations.
 * - Free API key recommended but not required for low volume.
 * - Provides AI-written "TLDR" summaries for ~70M papers — better than our
 *   heuristic extractive summary when available.
 * - Has openAccessPdf field — useful for the find-PDF feature.
 * Docs: https://api.semanticscholar.org/graph/v1
 */

const BASE = "https://api.semanticscholar.org/graph/v1/paper/search";

/**
 * Optional API key (SEMANTIC_SCHOLAR_API_KEY). Unauthenticated requests share a
 * small pool and are frequently answered with 429; a key gets a dedicated limit.
 */
function s2Headers(): HeadersInit {
  const key = process.env.SEMANTIC_SCHOLAR_API_KEY?.trim();
  return key ? { "x-api-key": key } : {};
}

/**
 * A key allows 1 request per second, cumulative across all endpoints. Every
 * call reserves the next free slot 1.1 s after the previous one, so
 * concurrent searches queue instead of being rejected. The counter lives in
 * this server instance only, so under heavy parallel traffic (several
 * serverless instances) the retries below are still the safety net.
 */
const MIN_GAP_MS = 1100;

/**
 * Without a key, requests share one public pool that answers most calls with
 * 429 (roughly 7 in 8 at busy times), so a single retry almost never gets
 * through. Retry 429 and 5xx a few times with backoff; the search deadline
 * for this source leaves room for it.
 */
const MAX_ATTEMPTS = 4;

/** GET, paced to the rate limit, retrying 429 and 5xx with backoff. */
async function s2Fetch(url: string): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    await waitTurn("semanticscholar", MIN_GAP_MS);
    const res = await fetchWithTimeout(url, { headers: s2Headers() }, 6000);
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt >= MAX_ATTEMPTS) return res;

    // Honour Retry-After when present, otherwise back off 0.8 s, 1.6 s, 3.2 s
    // plus jitter so parallel searches don't retry in lockstep.
    const retryAfter = Number(res.headers.get("retry-after"));
    const wait = retryAfter > 0 ? retryAfter * 1000 : 400 * 2 ** attempt + Math.random() * 300;
    await sleep(Math.min(wait, 3500));
  }
}

interface S2Paper {
  paperId: string;
  /** The Graph API has no top-level `doi` — it lives under externalIds. */
  externalIds?: { DOI?: string } | null;
  title?: string;
  abstract?: string;
  year?: number;
  publicationDate?: string;
  venue?: string;
  citationCount?: number;
  openAccessPdf?: { url: string } | null;
  fieldsOfStudy?: string[];
  tldr?: { text: string } | null;
  authors?: { name: string }[];
  journal?: { name?: string; volume?: string; pages?: string } | null;
  /** "JournalArticle", "Conference", "Book", "BookSection", "Review", ... */
  publicationTypes?: string[] | null;
}

/** Semantic Scholar publication types as the app's record types, most specific first. */
function s2Type(types: string[] | null | undefined): WorkType | undefined {
  const t = types ?? [];
  if (t.includes("BookSection")) return "chapter";
  if (t.includes("Book")) return "book";
  if (t.includes("Conference")) return "conference";
  if (t.some((x) => x === "JournalArticle" || x === "Review" || x === "MetaAnalysis")) return "article";
  return undefined;
}

export async function searchSemanticScholar(
  query: string,
  opts: AdapterOptions = {}
): Promise<Paper[]> {
  const { fromYear, perSource = 15, openAccessOnly } = opts;
  const params = new URLSearchParams({
    query,
    limit: String(perSource),
    fields:
      "title,abstract,year,publicationDate,venue,citationCount,openAccessPdf,fieldsOfStudy,tldr,authors,externalIds,journal,publicationTypes",
  });
  if (fromYear) params.set("year", `${fromYear}-`);

  const res = await s2Fetch(`${BASE}?${params}`);
  if (!res.ok) {
    throw new Error(res.status === 429 ? "rate limited (429)" : `HTTP ${res.status}`);
  }
  const data = await readJson<{ data: S2Paper[]; total?: number }>(res);
  if (!data?.data) return [];

  return data.data
    .filter((p) => (openAccessOnly ? !!p.openAccessPdf?.url : true))
    .map<Paper>((p) => {
      const doi = p.externalIds?.DOI || null;
      const title = p.title || "Untitled";
      const venue = p.venue || p.journal?.name;
      return {
        id: paperId(doi, title),
        title,
        authors: (p.authors || []).map((a) => a.name).slice(0, 10),
        year: p.year ?? null,
        publishedDate: p.publicationDate ?? null,
        // Venue names arrive with HTML entities ("Administration &amp; Leadership").
        venue: venue ? decodeEntities(venue) : null,
        type: s2Type(p.publicationTypes),
        volume: p.journal?.volume ?? null,
        pages: p.journal?.pages?.replace(/\s+/g, "") ?? null,
        doi,
        abstract: p.abstract ?? null,
        tldr: p.tldr?.text ?? null,
        openAccessUrl: p.openAccessPdf?.url ?? null,
        isOpenAccess: !!p.openAccessPdf?.url,
        url: p.paperId ? `https://www.semanticscholar.org/paper/${p.paperId}` : null,
        citedByCount: p.citationCount ?? 0,
        keywords: (p.fieldsOfStudy || []).slice(0, 5),
        sources: ["semanticscholar"],
      };
    });
}


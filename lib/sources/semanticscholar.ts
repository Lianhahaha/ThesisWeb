import { fetchWithTimeout, safeJson, paperId, sleep } from "@/lib/utils";
import type { Paper } from "@/lib/types";

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
 * serverless instances) the retry below is still the safety net.
 */
const MIN_GAP_MS = 1100;
let lastSlot = 0;

/** GET, paced to the rate limit, with one retry on 429. */
async function s2Fetch(url: string): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const now = Date.now();
    const slot = Math.max(now, lastSlot + MIN_GAP_MS);
    lastSlot = slot; // reserve synchronously, before awaiting
    if (slot > now) await sleep(slot - now);

    const res = await fetchWithTimeout(url, { headers: s2Headers() });
    if (res.status !== 429 || attempt >= 1) return res;
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
}

export async function searchSemanticScholar(
  query: string,
  opts: { fromYear?: number; perSource?: number; openAccessOnly?: boolean } = {}
): Promise<Paper[]> {
  const { fromYear, perSource = 15, openAccessOnly } = opts;
  const params = new URLSearchParams({
    query,
    limit: String(perSource),
    fields: "title,abstract,year,publicationDate,venue,citationCount,openAccessPdf,fieldsOfStudy,tldr,authors,externalIds",
  });
  if (fromYear) params.set("year", `${fromYear}-`);

  const res = await s2Fetch(`${BASE}?${params}`);
  if (!res.ok) throw new Error(`Semantic Scholar ${res.status}`);
  const data = await safeJson<{ data: S2Paper[]; total?: number }>(res);
  if (!data?.data) return [];

  return data.data
    .filter((p) => (openAccessOnly ? !!p.openAccessPdf?.url : true))
    .map<Paper>((p) => {
      const doi = p.externalIds?.DOI || null;
      const title = p.title || "Untitled";
      return {
        id: paperId(doi, title),
        title,
        authors: (p.authors || []).map((a) => a.name).slice(0, 10),
        year: p.year ?? null,
        publishedDate: p.publicationDate ?? null,
        venue: p.venue ?? null,
        doi,
        abstract: p.abstract ?? null,
        tldr: p.tldr?.text ?? null,
        openAccessUrl: p.openAccessPdf?.url ?? null,
        isOpenAccess: !!p.openAccessPdf?.url,
        citedByCount: p.citationCount ?? 0,
        keywords: (p.fieldsOfStudy || []).slice(0, 5),
        sources: ["semanticscholar"],
      };
    });
}

/** Fetch S2 metadata for one paper by DOI — enriches the saved-paper view. */
export async function getSemanticScholarByDoi(doi: string): Promise<Paper | null> {
  const url = `https://api.semanticscholar.org/graph/v1/paper/DOI:${doi}?fields=title,abstract,year,publicationDate,venue,citationCount,openAccessPdf,tldr,authors`;
  const res = await s2Fetch(url);
  if (!res.ok) return null;
  const p = await safeJson<S2Paper>(res);
  if (!p) return null;
  return {
    id: paperId(doi, p.title || ""),
    title: p.title || "Untitled",
    authors: (p.authors || []).map((a) => a.name),
    year: p.year ?? null,
    publishedDate: p.publicationDate ?? null,
    venue: p.venue ?? null,
    doi,
    abstract: p.abstract ?? null,
    tldr: p.tldr?.text ?? null,
    openAccessUrl: p.openAccessPdf?.url ?? null,
    isOpenAccess: !!p.openAccessPdf?.url,
    citedByCount: p.citationCount ?? 0,
    sources: ["semanticscholar"],
  };
}

import { fetchWithTimeout, safeJson, paperId } from "@/lib/utils";
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

interface S2Paper {
  paperId: string;
  doi?: string;
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

  const res = await fetchWithTimeout(`${BASE}?${params}`);
  if (!res.ok) throw new Error(`Semantic Scholar ${res.status}`);
  const data = await safeJson<{ data: S2Paper[]; total?: number }>(res);
  if (!data?.data) return [];

  return data.data
    .filter((p) => (openAccessOnly ? !!p.openAccessPdf?.url : true))
    .map<Paper>((p) => {
      const doi = p.doi || null;
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
  const res = await fetchWithTimeout(url);
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

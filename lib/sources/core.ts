import { fetchWithTimeout, safeJson, paperId } from "@/lib/utils";
import type { Paper } from "@/lib/types";

/**
 * CORE adapter — open access repository metadata + full text.
 * - Free API key required: https://core.ac.uk/api-keys/register
 * - ~300M metadata records from 11,000+ repositories worldwide.
 * - Strong for theses, dissertations, and repo-hosted OA content.
 * Docs: https://core.ac.uk/documentation/api
 */

const API_KEY = process.env.CORE_API_KEY?.trim() || "";
const BASE = "https://api.core.ac.uk/v3";

interface CoreSearchResult {
  results: CoreArticle[];
  totalHits: number;
}

interface CoreArticle {
  id: number;
  title?: string;
  authors?: { name?: string }[];
  yearPublished?: number;
  publishedDate?: string;
  publisher?: string;
  journals?: { title?: string }[];
  doi?: string;
  abstract?: string;
  downloadUrl?: string;
  sourceFulltextUrls?: string[];
  language?: { code?: string };
  subjects?: string[];
}

export async function searchCore(
  query: string,
  opts: { fromYear?: number; perSource?: number; openAccessOnly?: boolean } = {}
): Promise<Paper[]> {
  if (!API_KEY) return [];

  const { fromYear, perSource = 15 } = opts;

  // CORE's search doesn't handle complex boolean queries well.
  // Strip country-scope clauses like "AND (Philippines OR Filipino ...)".
  const cleanQuery = query
    .replace(/\s+AND\s+\([^)]+\)/gi, "")
    .replace(/\s+OR\s+.*/gi, "")
    .trim();

  const params = new URLSearchParams({
    q: cleanQuery,
    limit: String(perSource),
  });

  // CORE uses yearPublished filter
  if (fromYear) {
    params.set("yearFrom", String(fromYear));
  }

  const res = await fetchWithTimeout(`${BASE}/search/works?${params}`, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  });

  if (!res.ok) throw new Error(`CORE ${res.status}`);
  const data = await safeJson<CoreSearchResult>(res);
  if (!data?.results) return [];

  return data.results.map<Paper>((it) => {
    const title = it.title || "Untitled";
    const doi = it.doi || null;
    const year = it.yearPublished ?? null;
    const venue = it.journals?.[0]?.title ?? it.publisher ?? null;

    // CORE has sourceFulltextUrls for OA links
    const oaUrl =
      it.downloadUrl ||
      it.sourceFulltextUrls?.[0] ||
      (doi ? `https://doi.org/${doi}` : null);

    return {
      id: paperId(doi, title),
      title,
      authors: (it.authors || []).map((a) => a.name || "").filter(Boolean),
      year,
      venue,
      doi,
      abstract: it.abstract || null,
      openAccessUrl: oaUrl,
      isOpenAccess: true, // CORE only indexes OA content
      sources: ["core"],
    };
  });
}

import { fetchWithTimeout, safeJson, paperId } from "@/lib/utils";
import type { Paper } from "@/lib/types";
import { CONTACT_EMAIL } from "@/lib/config";

/**
 * OpenAlex adapter — the primary discovery source.
 * - No API key required (add mailto for the polite pool / faster rates).
 * - Abstracts are stored as "inverted index" — we reconstruct the text.
 * - Free filtering by publication year server-side.
 * Docs: https://docs.openalex.org/
 */

const MAILTO = CONTACT_EMAIL; // polite pool
const BASE = "https://api.openalex.org/works";

interface OpenAlexWork {
  id: string;
  doi?: string | null;
  title?: string;
  display_name?: string;
  publication_date?: string | null;
  publication_year?: number | null;
  referenced_works_count?: number;
  cited_by_count?: number;
  authorships?: { author: { display_name: string } }[];
  primary_location?: {
    source?: { display_name?: string } | null;
    is_oa?: boolean;
    pdf_url?: string | null;
    landing_page_url?: string | null;
  } | null;
  best_oa_location?: { pdf_url?: string | null; landing_page_url?: string | null } | null;
  abstract_inverted_index?: Record<string, number[]> | null;
  concepts?: { display_name: string; score: number }[] | null;
  keywords?: { keyword: string; score: number }[] | null;
  is_retracted?: boolean;
}

/** Reconstruct abstract text from OpenAlex's inverted-index format. */
function deinvert(idx: Record<string, number[]> | null | undefined): string {
  if (!idx) return "";
  const positions: { pos: number; word: string }[] = [];
  for (const [word, posList] of Object.entries(idx)) {
    for (const pos of posList) positions.push({ pos, word });
  }
  positions.sort((a, b) => a.pos - b.pos);
  return positions.map((p) => p.word).join(" ");
}

export async function searchOpenAlex(
  query: string,
  opts: { fromYear?: number; perSource?: number; openAccessOnly?: boolean } = {}
): Promise<Paper[]> {
  const { fromYear, perSource = 15, openAccessOnly } = opts;
  const params = new URLSearchParams({
    search: query,
    per_page: String(perSource),
    mailto: MAILTO,
  });
  if (fromYear) params.set("filter", `from_publication_date:${fromYear}-01-01${openAccessOnly ? ",is_oa:true" : ""}`);
  else if (openAccessOnly) params.set("filter", "is_oa:true");

  params.set("sort", "relevance_score:desc");

  const res = await fetchWithTimeout(`${BASE}?${params}`);
  if (!res.ok) throw new Error(`OpenAlex ${res.status}`);
  const data = await safeJson<{ results: OpenAlexWork[] }>(res);
  if (!data?.results) return [];

  return data.results.map(workToPaper);
}

/** Normalize one OpenAlex work into the app's Paper shape. */
export function workToPaper(w: OpenAlexWork): Paper {
  const title = w.title || w.display_name || "Untitled";
  const doi = w.doi?.replace("https://doi.org/", "") || null;
  const oa = w.best_oa_location || w.primary_location;
  return {
    id: paperId(doi, title),
    title,
    authors: (w.authorships || []).map((a) => a.author.display_name).slice(0, 10),
    year: w.publication_year ?? null,
    publishedDate: w.publication_date ?? null,
    venue: w.primary_location?.source?.display_name ?? null,
    doi,
    abstract: deinvert(w.abstract_inverted_index) || null,
    openAccessUrl: oa?.pdf_url || oa?.landing_page_url || null,
    isOpenAccess: oa?.pdf_url != null || w.primary_location?.is_oa === true,
    citedByCount: w.cited_by_count ?? 0,
    keywords: (w.keywords || w.concepts || [])
      .slice(0, 5)
      .map((k) => ("keyword" in k ? k.keyword : k.display_name)),
    retracted: w.is_retracted === true,
    sources: ["openalex"],
  };
}

/** URL path for a DOI: each segment encoded, slashes kept (DOIs may contain ? # ; <). */
function doiPath(doi: string): string {
  return doi.split("/").map(encodeURIComponent).join("/");
}

/** Fetch one OpenAlex work by DOI (used to enrich a saved paper). */
export async function getOpenAlexByDoi(doi: string): Promise<Paper | null> {
  const res = await fetchWithTimeout(`${BASE}/doi:${doiPath(doi)}?mailto=${MAILTO}`);
  if (!res.ok) return null;
  const w = await safeJson<OpenAlexWork>(res);
  if (!w) return null;
  return { ...workToPaper(w), doi, id: paperId(doi, w.title || w.display_name || "Untitled") };
}

export interface RelatedPapers {
  /** Works this paper cites, most-cited first. */
  references: Paper[];
  referencesTotal: number;
  /** Works that cite this paper, most-cited first. */
  citedBy: Paper[];
  citedByTotal: number;
  /** OpenAlex's algorithmically related works, most-cited first. */
  similar: Paper[];
}

const shortId = (url: string) => url.split("/").pop() ?? url;

/** Fetch works by OpenAlex id, most-cited first. Ids are batched into one OR filter. */
async function worksByIds(ids: string[], limit: number): Promise<Paper[]> {
  if (ids.length === 0) return [];
  const params = new URLSearchParams({
    filter: `openalex:${ids.slice(0, 50).map(shortId).join("|")}`,
    sort: "cited_by_count:desc",
    per_page: String(limit),
    mailto: MAILTO,
  });
  const res = await fetchWithTimeout(`${BASE}?${params}`);
  if (!res.ok) return [];
  const data = await safeJson<{ results?: OpenAlexWork[] }>(res);
  return (data?.results ?? []).map(workToPaper);
}

/**
 * The citation neighbourhood of a paper, for snowballing a literature review:
 * follow what it cites (older foundations), who cites it (newer work), and
 * similar papers. Returns null if OpenAlex doesn't know the DOI.
 */
export async function getRelatedPapers(doi: string, limit = 10): Promise<RelatedPapers | null> {
  const workRes = await fetchWithTimeout(
    `${BASE}/doi:${doiPath(doi)}?select=id,referenced_works,related_works&mailto=${MAILTO}`
  );
  if (!workRes.ok) return null;
  const work = await safeJson<{ id?: string; referenced_works?: string[]; related_works?: string[] }>(workRes);
  if (!work?.id) return null;

  const citedByParams = new URLSearchParams({
    filter: `cites:${shortId(work.id)}`,
    sort: "cited_by_count:desc",
    per_page: String(limit),
    mailto: MAILTO,
  });

  const [references, similar, citedByRes] = await Promise.all([
    worksByIds(work.referenced_works ?? [], limit),
    worksByIds(work.related_works ?? [], limit),
    fetchWithTimeout(`${BASE}?${citedByParams}`).then((r) =>
      r.ok ? safeJson<{ meta?: { count?: number }; results?: OpenAlexWork[] }>(r) : null
    ),
  ]);

  return {
    references,
    referencesTotal: work.referenced_works?.length ?? 0,
    citedBy: (citedByRes?.results ?? []).map(workToPaper),
    citedByTotal: citedByRes?.meta?.count ?? 0,
    similar,
  };
}

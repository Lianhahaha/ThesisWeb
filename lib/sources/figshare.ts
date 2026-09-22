import { fetchWithTimeout, safeJson, paperId } from "@/lib/utils";
import { USER_AGENT } from "@/lib/config";
import { stripHtml } from "@/lib/text";
import type { Paper } from "@/lib/types";

/**
 * Figshare adapter — university and publisher repository items.
 * - 30M+ items: journal contributions, theses, conference papers, preprints,
 *   deposited alongside datasets, figures and posters (which we filter out).
 * - The search endpoint returns only summary fields, so each candidate needs
 *   a follow-up detail fetch for its abstract and authors. Capped at
 *   MAX_DETAIL fetches, run in parallel, to keep one slow item from
 *   stalling the whole source.
 * - Free, no API key.
 * Docs: https://docs.figshare.com/#articles_search
 */

const SEARCH_URL = "https://api.figshare.com/v2/articles/search";
const ARTICLE_URL = "https://api.figshare.com/v2/articles";
const MAX_DETAIL = 12;

/** Item types worth showing a thesis writer; excludes datasets, figures, media, posters, software. */
const WANTED_TYPES = new Set([
  "journal contribution", "thesis", "conference contribution", "preprint",
  "book chapter", "monograph", "report",
]);

interface FigshareSummary {
  id: number;
  title?: string;
  defined_type_name?: string;
  published_date?: string;
}

interface FigshareDetail {
  title?: string;
  doi?: string;
  description?: string;
  authors?: { full_name?: string }[];
  published_date?: string;
  tags?: string[];
  url_public_html?: string;
}

export async function searchFigshare(
  query: string,
  opts: { fromYear?: number; perSource?: number } = {}
): Promise<Paper[]> {
  const { fromYear, perSource = 15 } = opts;

  const body: Record<string, unknown> = {
    search_for: query,
    // Over-fetch: many hits are datasets/figures we'll filter out below.
    page_size: Math.min(perSource * 3, 40),
  };
  if (fromYear && fromYear > 0) body.published_since = `${fromYear}-01-01`;

  const res = await fetchWithTimeout(SEARCH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": USER_AGENT },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Figshare ${res.status}`);
  const summaries = (await safeJson<FigshareSummary[]>(res)) ?? [];

  const candidates = summaries
    .filter((s) => s.title && WANTED_TYPES.has(s.defined_type_name ?? ""))
    .slice(0, Math.min(perSource, MAX_DETAIL));
  if (candidates.length === 0) return [];

  const details = await Promise.allSettled(
    candidates.map((c) =>
      fetchWithTimeout(`${ARTICLE_URL}/${c.id}`, { headers: { "User-Agent": USER_AGENT } }, 7000)
        .then((r) => (r.ok ? safeJson<FigshareDetail>(r) : null))
    )
  );

  const papers: Paper[] = [];
  for (const result of details) {
    if (result.status !== "fulfilled" || !result.value) continue;
    const d = result.value;
    if (!d.title) continue;

    const doi = d.doi || null;
    const year = d.published_date ? Number(d.published_date.slice(0, 4)) : null;

    papers.push({
      id: paperId(doi, d.title),
      title: stripHtml(d.title),
      authors: (d.authors ?? []).map((a) => a.full_name ?? "").filter(Boolean).slice(0, 10),
      year: year && Number.isFinite(year) ? year : null,
      publishedDate: d.published_date?.slice(0, 10) ?? null,
      venue: "Figshare",
      doi,
      abstract: d.description ? stripHtml(d.description) : null,
      // Every Figshare record is publicly downloadable, regardless of its item's license.
      openAccessUrl: d.url_public_html ?? (doi ? `https://doi.org/${doi}` : null),
      isOpenAccess: true,
      keywords: (d.tags ?? []).slice(0, 5),
      sources: ["figshare"],
    });
  }
  return papers;
}

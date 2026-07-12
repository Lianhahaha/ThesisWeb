import { fetchWithTimeout, safeJson, paperId } from "@/lib/utils";
import type { Paper } from "@/lib/types";

/**
 * DOAJ (Directory of Open Access Journals) adapter.
 * - 100% open access.
 * - Good for global diversity.
 */

const BASE = "https://doaj.org/api/search/articles";

export async function searchDoaj(
  query: string,
  opts: { fromYear?: number; perSource?: number } = {}
): Promise<Paper[]> {
  const { fromYear, perSource = 15 } = opts;
  // Quote the query for better relevance if it contains spaces
  const q = query.includes(" ") ? `"${query}"` : query;
  const url = `${BASE}/${encodeURIComponent(q)}?pageSize=${perSource}`;

  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`DOAJ ${res.status}`);
  const data = await safeJson<{ results: any[] }>(res);
  if (!data?.results) return [];

  const papers: Paper[] = [];

  for (const r of data.results) {
    const bib = r.bibjson;
    if (!bib) continue;
    
    // Filter by year if requested
    const year = bib.year ? parseInt(bib.year, 10) : null;
    if (fromYear && year && year < fromYear) continue;

    const title = bib.title || "Untitled";
    const doiObj = bib.identifier?.find((id: any) => id.type === "doi");
    const doi = doiObj ? doiObj.id : null;
    const abstract = bib.abstract || null;
    const authors = (bib.author || []).map((a: any) => a.name).filter(Boolean).slice(0, 10);
    const venue = bib.journal?.title || null;
    const keywords = (bib.subject || []).map((s: any) => s.term).slice(0, 5);
    const linkObj = bib.link?.find((l: any) => l.type === "fulltext");
    const openAccessUrl = linkObj ? linkObj.url : null;

    papers.push({
      id: paperId(doi, title),
      title,
      authors,
      year,
      publishedDate: bib.month && year ? `${year}-${bib.month.padStart(2, "0")}-01` : null,
      venue,
      doi,
      abstract,
      openAccessUrl,
      isOpenAccess: true, // DOAJ is fully open access
      citedByCount: 0, // DOAJ does not provide citation counts
      keywords,
      sources: ["doaj"],
    });
  }

  return papers;
}

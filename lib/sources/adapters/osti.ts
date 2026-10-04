import { fetchWithTimeout, safeJson, paperId } from "@/lib/utils";
import { USER_AGENT } from "@/lib/config";
import { extractDoi, flipName, stripHtml } from "@/lib/text";
import type { Paper } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * OSTI.GOV adapter (U.S. Department of Energy, Office of Scientific and
 * Technical Information).
 * - Journal articles, technical reports, theses and conference papers from
 *   DOE-funded research: energy, engineering, physics, chemistry, materials,
 *   environment and computing. Most reports have free full text.
 * - Free, no API key.
 * Docs: https://www.osti.gov/api/v1/docs
 */

const BASE = "https://www.osti.gov/api/v1/records";

interface OstiRecord {
  osti_id?: string;
  title?: string;
  authors?: string[];
  publication_date?: string;
  doi?: string;
  description?: string;
  journal_name?: string;
  product_type?: string;
  subjects?: string[];
  links?: { rel?: string; href?: string }[];
}

/** "Smith, Jane A. [Sandia National Labs] (ORCID:0000...)" -> "Jane A. Smith". */
function cleanAuthor(raw: string): string {
  return flipName(raw.replace(/\[[^\]]*\]/g, "").replace(/\([^)]*\)/g, "").trim());
}

export async function searchOsti(
  query: string,
  opts: AdapterOptions = {}
): Promise<Paper[]> {
  const { fromYear, perSource = 15, openAccessOnly } = opts;

  const params = new URLSearchParams({ q: query, rows: String(perSource) });
  if (fromYear && fromYear > 0) params.set("publication_date_start", `01/01/${fromYear}`);
  if (openAccessOnly) params.set("has_fulltext", "true");

  const res = await fetchWithTimeout(`${BASE}?${params}`, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`OSTI ${res.status}`);
  // No matches come back as an empty body, not "[]".
  const records = await safeJson<OstiRecord[]>(res);
  if (!Array.isArray(records)) return [];

  const papers: Paper[] = [];
  for (const r of records) {
    if (!r.title) continue;
    const title = stripHtml(r.title);
    const doi = extractDoi(r.doi);
    const fulltext = r.links?.find((l) => l.rel === "fulltext")?.href ?? null;
    const year = r.publication_date ? Number(r.publication_date.slice(0, 4)) || null : null;
    // Subject codes like "14 SOLAR ENERGY" are categories, not keywords.
    const keywords = (r.subjects ?? []).filter((s) => !/^\d+\s/.test(s)).slice(0, 5);

    papers.push({
      id: paperId(doi, title),
      title,
      authors: (r.authors ?? []).map(cleanAuthor).filter(Boolean).slice(0, 10),
      year,
      publishedDate: r.publication_date ?? null,
      venue: r.journal_name || r.product_type || "OSTI.GOV",
      doi,
      abstract: r.description ? stripHtml(r.description) : null,
      openAccessUrl: fulltext,
      isOpenAccess: !!fulltext,
      keywords,
      url: r.links?.find((l) => l.rel === "citation")?.href ?? null,
      sources: ["osti"],
    });
  }
  return papers;
}

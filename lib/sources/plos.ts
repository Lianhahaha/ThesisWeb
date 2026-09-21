import { fetchWithTimeout, safeJson, paperId } from "@/lib/utils";
import { USER_AGENT } from "@/lib/config";
import { stripHtml } from "@/lib/text";
import type { Paper } from "@/lib/types";

/**
 * PLOS adapter (PLOS ONE, Biology, Medicine, Computational Biology, Genetics,
 * Climate, Global Public Health, Mental Health, ...).
 * - Every PLOS article is open access (CC BY), with full text and abstracts.
 * - Free, no API key.
 * Docs: https://api.plos.org/solr/search-fields/
 */

const BASE = "https://api.plos.org/search";
const FIELDS = "id,title_display,author_display,journal,publication_date,abstract,article_type";

interface PlosDoc {
  id?: string;
  title_display?: string;
  author_display?: string[];
  journal?: string;
  publication_date?: string;
  abstract?: string[];
  article_type?: string;
}

/** Keep letters/digits only so user text can't inject Solr syntax. */
function words(query: string): string[] {
  return query
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !/^(and|or|not)$/i.test(w));
}

export async function searchPlos(
  query: string,
  opts: { fromYear?: number; perSource?: number } = {}
): Promise<Paper[]> {
  const { fromYear, perSource = 15 } = opts;

  const ws = words(query);
  if (ws.length === 0) return [];
  const all = ws.join(" AND ");

  // Match in the title or abstract rather than the whole body: full-text
  // matches drag in papers that only mention the topic in passing.
  // Requiring an abstract keeps research and review articles while dropping
  // corrections, retractions and other notices that have none.
  const filters = ["abstract:[* TO *]"];
  if (fromYear && fromYear > 0) filters.push(`publication_date:[${fromYear}-01-01T00:00:00Z TO NOW]`);

  const params = new URLSearchParams({
    q: `title:(${all}) OR abstract:(${all})`,
    rows: String(perSource),
    wt: "json",
    fl: FIELDS,
  });
  for (const fq of filters) params.append("fq", fq);

  const res = await fetchWithTimeout(`${BASE}?${params}`, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`PLOS ${res.status}`);
  const data = await safeJson<{ response?: { docs?: PlosDoc[] } }>(res);
  const docs = data?.response?.docs ?? [];

  const papers: Paper[] = [];
  for (const d of docs) {
    if (!d.id || !d.title_display) continue;
    const year = d.publication_date ? Number(d.publication_date.slice(0, 4)) : null;
    const doi = d.id;

    papers.push({
      id: paperId(doi, d.title_display),
      title: stripHtml(d.title_display),
      authors: (d.author_display ?? []).slice(0, 10),
      year: year && Number.isFinite(year) ? year : null,
      publishedDate: d.publication_date?.slice(0, 10) ?? null,
      venue: d.journal ?? "PLOS",
      doi,
      abstract: d.abstract?.[0] ? stripHtml(d.abstract[0]) : null,
      // All PLOS content is open access; the DOI resolves to the article page.
      openAccessUrl: `https://doi.org/${doi}`,
      isOpenAccess: true,
      sources: ["plos"],
    });
  }
  return papers;
}

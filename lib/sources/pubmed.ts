import { fetchWithTimeout, safeJson, paperId } from "@/lib/utils";
import type { Paper } from "@/lib/types";

/**
 * PubMed / NCBI E-utilities adapter.
 * - 37M+ biomedical citations — essential for nursing, medicine, biology, psychology.
 * - Free. No key required (<3 req/s). Set NCBI_API_KEY env var for 10 req/s.
 * - Two-step: esearch → esummary.
 * Docs: https://www.ncbi.nlm.nih.gov/books/NBK25499/
 */

const TOOL   = "ThesisWeb";
const EMAIL  = "thesisweb-researcher@example.com";
const BASE   = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";

export async function searchPubMed(
  query: string,
  opts: { fromYear?: number; perSource?: number; openAccessOnly?: boolean } = {}
): Promise<Paper[]> {
  const { fromYear, perSource = 15, openAccessOnly } = opts;

  // Step 1 — esearch: get PMIDs
  const searchParams = new URLSearchParams({
    db: "pubmed",
    term: buildTerm(query, fromYear, openAccessOnly),
    retmax: String(perSource),
    retmode: "json",
    sort: "relevance",
    tool: TOOL,
    email: EMAIL,
  });
  if (process.env.NCBI_API_KEY) searchParams.set("api_key", process.env.NCBI_API_KEY);

  const searchRes = await fetchWithTimeout(`${BASE}/esearch.fcgi?${searchParams}`);
  if (!searchRes.ok) throw new Error(`PubMed esearch ${searchRes.status}`);
  const searchData = await safeJson<{ esearchresult?: { idlist?: string[] } }>(searchRes);
  const ids = searchData?.esearchresult?.idlist ?? [];
  if (ids.length === 0) return [];

  // Step 2 — esummary: get metadata for PMIDs
  const summaryParams = new URLSearchParams({
    db: "pubmed",
    id: ids.join(","),
    retmode: "json",
    tool: TOOL,
    email: EMAIL,
  });
  if (process.env.NCBI_API_KEY) summaryParams.set("api_key", process.env.NCBI_API_KEY);

  const summaryRes = await fetchWithTimeout(`${BASE}/esummary.fcgi?${summaryParams}`);
  if (!summaryRes.ok) throw new Error(`PubMed esummary ${summaryRes.status}`);
  const summaryData = await safeJson<{ result?: Record<string, any> }>(summaryRes);
  const result = summaryData?.result ?? {};

  const papers: Paper[] = [];
  for (const pmid of ids) {
    const item = result[pmid];
    if (!item || item.error) continue;

    const title = (item.title as string)?.replace(/\.$/, "") || "Untitled";
    const authors: string[] = ((item.authors as any[]) ?? [])
      .map((a: any) => a.name as string)
      .filter(Boolean)
      .slice(0, 10);
    const year = item.pubdate ? parseInt((item.pubdate as string).slice(0, 4), 10) : null;
    const journal = item.fulljournalname || item.source || null;

    // DOI from articleids
    const articleIds: any[] = item.articleids ?? [];
    const doiObj = articleIds.find((a: any) => a.idtype === "doi");
    const doi = doiObj ? (doiObj.value as string) : null;
    const pmcObj = articleIds.find((a: any) => a.idtype === "pmc");
    const pmcId: string | null = pmcObj ? (pmcObj.value as string) : null;

    const isOA = !!pmcId;
    const openAccessUrl = pmcId
      ? `https://www.ncbi.nlm.nih.gov/pmc/articles/${pmcId}/`
      : doi
      ? `https://doi.org/${doi}`
      : null;

    papers.push({
      id: paperId(doi, title),
      title,
      authors,
      year: isNaN(year as number) ? null : year,
      publishedDate: year ? `${year}-01-01` : null,
      venue: journal,
      doi,
      abstract: null, // esummary doesn't include abstracts; detail page fetches via efetch
      openAccessUrl: isOA ? openAccessUrl : null,
      isOpenAccess: isOA,
      citedByCount: 0,
      keywords: [],
      sources: ["pubmed"],
    });
  }

  return papers;
}

function buildTerm(query: string, fromYear?: number, openAccessOnly?: boolean): string {
  let term = query;
  if (fromYear) term += ` AND ${fromYear}:3000[pdat]`;
  if (openAccessOnly) term += " AND free full text[sb]";
  return term;
}

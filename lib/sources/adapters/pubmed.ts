import { paperId } from "@/lib/utils";
import type { Paper } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";
import { articleId, eSearch, eSummary, ncbiAuthors, ncbiYear } from "@/lib/sources/platforms/ncbi";

/**
 * PubMed / NCBI E-utilities adapter.
 * - 37M+ biomedical citations — essential for nursing, medicine, biology, psychology.
 * - Free. No key required (<3 req/s). Set NCBI_API_KEY env var for 10 req/s.
 * - Two-step: esearch → esummary, through the shared, rate-paced NCBI client.
 * Docs: https://www.ncbi.nlm.nih.gov/books/NBK25499/
 */
export async function searchPubMed(query: string, opts: AdapterOptions = {}): Promise<Paper[]> {
  const { fromYear, perSource = 15, openAccessOnly } = opts;

  const ids = await eSearch("pubmed", buildTerm(query, fromYear, openAccessOnly), perSource);
  const result = await eSummary("pubmed", ids);

  const papers: Paper[] = [];
  for (const pmid of ids) {
    const item = result[pmid];
    if (!item || item.error) continue;

    const title = (item.title as string)?.replace(/\.$/, "") || "Untitled";
    const year = ncbiYear(item.pubdate);
    const doi = articleId(item, "doi");
    const pmcId = articleId(item, "pmc");

    papers.push({
      id: paperId(doi, title),
      title,
      authors: ncbiAuthors(item.authors),
      year,
      publishedDate: year ? `${year}-01-01` : null,
      venue: item.fulljournalname || item.source || null,
      doi,
      abstract: null, // esummary doesn't include abstracts; detail page fetches via efetch
      // A PMC copy is the free full text.
      openAccessUrl: pmcId ? `https://www.ncbi.nlm.nih.gov/pmc/articles/${pmcId}/` : null,
      isOpenAccess: !!pmcId,
      citedByCount: 0,
      keywords: [],
      preprint: false,
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

import { paperId } from "@/lib/utils";
import type { Paper } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";
import { articleId, eSearch, eSummary, ncbiAuthors, ncbiYear } from "@/lib/sources/platforms/ncbi";

/**
 * PubMed Central (U.S. National Library of Medicine): 10M+ full-text
 * biomedical and life-science articles, every one free to read. Overlaps
 * PubMed, but a PMC hit guarantees a free copy and reaches full texts
 * whose abstract alone would not match.
 * https://pmc.ncbi.nlm.nih.gov
 */
export async function searchPmc(query: string, opts: AdapterOptions = {}): Promise<Paper[]> {
  const { fromYear, perSource = 15 } = opts;

  let term = query;
  if (fromYear) term += ` AND ${fromYear}:3000[pdat]`;

  const ids = await eSearch("pmc", term, perSource);
  const result = await eSummary("pmc", ids);

  const papers: Paper[] = [];
  for (const id of ids) {
    const item = result[id];
    if (!item || item.error || !item.title) continue;

    const title = String(item.title).replace(/\.$/, "");
    const doi = articleId(item, "doi");
    const pmcid = articleId(item, "pmcid") ?? `PMC${id}`;
    const year = ncbiYear(item.pubdate);

    papers.push({
      id: paperId(doi, title),
      title,
      authors: ncbiAuthors(item.authors),
      year,
      publishedDate: year ? `${year}-01-01` : null,
      venue: item.fulljournalname || item.source || null,
      doi,
      abstract: null,
      openAccessUrl: `https://pmc.ncbi.nlm.nih.gov/articles/${pmcid}/`,
      isOpenAccess: true,
      sources: ["pmc"],
    });
  }
  return papers;
}

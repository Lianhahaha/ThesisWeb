import { fetchWithTimeout, safeJson, paperId } from "@/lib/utils";
import type { Paper } from "@/lib/types";

/**
 * Europe PubMed Central (Europe PMC) adapter.
 * - Free, no API key required.
 * - 47M+ abstracts from life sciences, biomedical, social sciences.
 * - Includes PubMed, PubMed Central, and preprints.
 * - Many open-access full texts with PMC links.
 * Docs: https://europepmc.org/RestfulWebService
 */

const BASE = "https://www.ebi.ac.uk/europepmc/webservices/rest/search";

interface EPMCResult {
  id?: string;
  pmid?: string;
  pmcid?: string;
  doi?: string;
  title?: string;
  authorString?: string;
  journalTitle?: string;
  pubYear?: string;
  abstractText?: string;
  isOpenAccess?: string;
  hasPDF?: string;
  citedByCount?: number;
  keywordList?: { keyword: string[] };
}

export async function searchEuropePMC(
  query: string,
  opts: { fromYear?: number; perSource?: number; openAccessOnly?: boolean } = {}
): Promise<Paper[]> {
  const { fromYear, perSource = 15, openAccessOnly } = opts;

  let q = `"${query}"`;
  if (fromYear) q += ` AND (PUB_YEAR:[${fromYear} TO 9999])`;
  if (openAccessOnly) q += " AND OPEN_ACCESS:y";

  const params = new URLSearchParams({
    query: q,
    format: "json",
    pageSize: String(perSource),
    resultType: "core",
    sort: "RELEVANCE",
  });

  const res = await fetchWithTimeout(`${BASE}?${params}`);
  if (!res.ok) throw new Error(`EuropePMC ${res.status}`);
  const data = await safeJson<{ resultList?: { result: EPMCResult[] } }>(res);
  if (!data?.resultList?.result) return [];

  return data.resultList.result.map<Paper>((r) => {
    const title = r.title?.replace(/\.$/, "") || "Untitled";
    const doi = r.doi || null;
    const year = r.pubYear ? parseInt(r.pubYear, 10) : null;
    const authors = r.authorString
      ? r.authorString.split(",").map((a) => a.trim()).slice(0, 10)
      : [];
    const pmcId = r.pmcid;
    const openAccessUrl = pmcId
      ? `https://europepmc.org/articles/${pmcId}`
      : doi
      ? `https://doi.org/${doi}`
      : null;
    const isOA = r.isOpenAccess === "Y" || r.hasPDF === "Y";
    const keywords = r.keywordList?.keyword?.slice(0, 5) ?? [];

    return {
      id: paperId(doi, title),
      title,
      authors,
      year,
      publishedDate: year ? `${year}-01-01` : null,
      venue: r.journalTitle || null,
      doi,
      abstract: r.abstractText || null,
      openAccessUrl: isOA ? openAccessUrl : null,
      isOpenAccess: isOA,
      citedByCount: r.citedByCount ?? 0,
      keywords,
      sources: ["europepmc"],
    };
  });
}

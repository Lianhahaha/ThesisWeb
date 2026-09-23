import { fetchWithTimeout, safeJson, paperId, sleep } from "@/lib/utils";
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

  // Don't wrap the query in quotes: that turns it into an exact-phrase search
  // (nothing matches a multi-word topic) and breaks the country clause
  // `AND ("A" OR "B")`. Unquoted terms are ANDed, which is what we want.
  let q = `(${query})`;
  if (fromYear) q += ` AND (PUB_YEAR:[${fromYear} TO 9999])`;
  if (openAccessOnly) q += " AND OPEN_ACCESS:y";

  const params = new URLSearchParams({
    query: q,
    format: "json",
    pageSize: String(perSource),
    resultType: "core",
    // No `sort`: results are relevance-ranked by default, and "RELEVANCE" is not
    // a valid value — Europe PMC answers it with an error, so every search
    // through this adapter used to come back empty.
  });

  // Europe PMC occasionally answers 200 with an error body instead of results.
  // A real response always has `resultList`; retry once, then report an error
  // rather than silently showing the source as "empty".
  async function fetchOnce() {
    const res = await fetchWithTimeout(`${BASE}?${params}`);
    if (!res.ok) throw new Error(`EuropePMC ${res.status}`);
    return safeJson<{ resultList?: { result?: EPMCResult[] } }>(res);
  }
  let data = await fetchOnce();
  if (!data?.resultList) {
    await sleep(400);
    data = await fetchOnce();
  }
  if (!data?.resultList) throw new Error("EuropePMC returned no result list");
  if (!data.resultList.result) return [];

  return data.resultList.result.map<Paper>((r) => {
    const title = r.title?.replace(/\.$/, "") || "Untitled";
    const doi = r.doi || null;
    const year = r.pubYear ? parseInt(r.pubYear, 10) : null;
    // Europe PMC gives "Smith J, Doe A." — family name first, then initials.
    // Every other adapter yields "Given Family", and the citation formatters
    // take the last word as the surname, so reorder here or APA renders
    // "Smith J" as "J, S.".
    const authors = r.authorString
      ? r.authorString
          .split(",")
          .map((a) => a.trim().replace(/\.$/, ""))
          .filter(Boolean)
          .map((a) => a.replace(/^(.+?)\s+([A-Za-z]{1,3})$/, "$2 $1"))
          .slice(0, 10)
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

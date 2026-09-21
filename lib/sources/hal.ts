import { fetchWithTimeout, safeJson, paperId } from "@/lib/utils";
import { USER_AGENT } from "@/lib/config";
import { stripHtml } from "@/lib/text";
import type { Paper } from "@/lib/types";

/**
 * HAL (Hyper Articles en Ligne) adapter.
 * - The French national open archive: articles, conference papers, theses
 *   (including habilitations), reports and preprints from French and
 *   international institutions. Multilingual (English and French).
 * - Free, no API key.
 * Docs: https://api.archives-ouvertes.fr/docs/search
 */

const BASE = "https://api.archives-ouvertes.fr/search/";
const FIELDS = [
  "halId_s", "title_s", "authFullName_s", "producedDateY_i", "doiId_s", "abstract_s",
  "uri_s", "journalTitle_s", "conferenceTitle_s", "openAccess_bool", "docType_s",
  "keyword_s", "fileMain_s",
].join(",");

/** HAL document type codes -> readable labels, used when there's no journal. */
const DOC_TYPES: Record<string, string> = {
  ART: "Journal article", COMM: "Conference paper", THESE: "Thesis", HDR: "Habilitation thesis",
  REPORT: "Report", UNDEFINED: "Preprint", COUV: "Book chapter", OUV: "Book", MEM: "Master's thesis",
};

interface HalDoc {
  halId_s?: string;
  title_s?: string[];
  authFullName_s?: string[];
  producedDateY_i?: number;
  doiId_s?: string;
  abstract_s?: string[];
  uri_s?: string;
  journalTitle_s?: string;
  conferenceTitle_s?: string;
  openAccess_bool?: boolean;
  docType_s?: string;
  keyword_s?: string[];
  fileMain_s?: string;
}

export async function searchHal(
  query: string,
  opts: { fromYear?: number; perSource?: number; openAccessOnly?: boolean } = {}
): Promise<Paper[]> {
  const { fromYear, perSource = 15, openAccessOnly } = opts;

  const params = new URLSearchParams({
    q: query,
    wt: "json",
    rows: String(perSource),
    fl: FIELDS,
  });
  // Repeated fq params are ANDed by Solr.
  if (fromYear && fromYear > 0) params.append("fq", `producedDateY_i:[${fromYear} TO *]`);
  if (openAccessOnly) params.append("fq", "openAccess_bool:true");

  const res = await fetchWithTimeout(`${BASE}?${params}`, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`HAL ${res.status}`);
  const data = await safeJson<{ response?: { docs?: HalDoc[] } }>(res);
  const docs = data?.response?.docs ?? [];

  const papers: Paper[] = [];
  for (const d of docs) {
    const rawTitle = d.title_s?.[0];
    if (!rawTitle) continue;
    const title = stripHtml(rawTitle);
    const doi = d.doiId_s ?? null;
    const isOA = d.openAccess_bool === true;

    papers.push({
      id: paperId(doi, title),
      title,
      authors: (d.authFullName_s ?? []).slice(0, 10), // already "Given Family"
      year: d.producedDateY_i ?? null,
      venue: d.journalTitle_s ?? d.conferenceTitle_s ?? (d.docType_s ? DOC_TYPES[d.docType_s] : null) ?? "HAL",
      doi,
      abstract: d.abstract_s?.[0] ? stripHtml(d.abstract_s[0]) : null,
      openAccessUrl: isOA ? d.fileMain_s ?? d.uri_s ?? null : null,
      isOpenAccess: isOA,
      keywords: (d.keyword_s ?? []).slice(0, 5),
      sources: ["hal"],
    });
  }
  return papers;
}

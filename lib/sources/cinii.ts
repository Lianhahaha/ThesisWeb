import { fetchWithTimeout, safeJson, paperId } from "@/lib/utils";
import { USER_AGENT } from "@/lib/config";
import { extractDoi, stripHtml } from "@/lib/text";
import type { Paper } from "@/lib/types";

/**
 * CiNii Research adapter (National Institute of Informatics, Japan).
 * - Articles, theses, books and research data from Japanese universities
 *   and publishers, plus international journals indexed alongside them.
 *   Strong on Asian research; many records are in English.
 * - Free, no API key for the OpenSearch endpoint.
 * Docs: https://support.nii.ac.jp/en/cir/r_opensearch
 */

const BASE = "https://cir.nii.ac.jp/opensearch/articles";

interface CiniiItem {
  title?: string;
  link?: { "@id"?: string };
  "dc:creator"?: string | string[];
  "dc:publisher"?: string;
  "prism:publicationName"?: string;
  "prism:publicationDate"?: string;
  description?: string;
  "dc:identifier"?: { "@type"?: string; "@value"?: string } | { "@type"?: string; "@value"?: string }[];
}

/** JSON-LD gives a single value or an array depending on the record. */
const asArray = <T,>(v: T | T[] | undefined): T[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

export async function searchCinii(
  query: string,
  opts: { fromYear?: number; perSource?: number; openAccessOnly?: boolean } = {}
): Promise<Paper[]> {
  const { fromYear, perSource = 15 } = opts;

  const params = new URLSearchParams({ q: query, format: "json", count: String(perSource) });
  if (fromYear && fromYear > 0) params.set("from", String(fromYear));

  const res = await fetchWithTimeout(`${BASE}?${params}`, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`CiNii ${res.status}`);
  const data = await safeJson<{ items?: CiniiItem[] }>(res);

  const papers: Paper[] = [];
  for (const it of data?.items ?? []) {
    if (!it.title) continue;
    const title = stripHtml(it.title);
    const ids = asArray(it["dc:identifier"]);
    const doi = extractDoi(ids.find((i) => i["@type"] === "cir:DOI")?.["@value"]);
    const date = it["prism:publicationDate"] ?? null;
    const year = date ? Number(date.slice(0, 4)) || null : null;

    papers.push({
      id: paperId(doi, title),
      title,
      authors: asArray(it["dc:creator"]).filter(Boolean).slice(0, 10),
      year,
      publishedDate: date,
      venue: it["prism:publicationName"] || it["dc:publisher"] || "CiNii Research",
      doi,
      abstract: it.description ? stripHtml(it.description) : null,
      // CiNii does not say whether the full text is free.
      openAccessUrl: null,
      isOpenAccess: false,
      sources: ["cinii"],
    });
  }
  return papers;
}

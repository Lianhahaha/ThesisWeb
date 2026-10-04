import { fetchWithTimeout, safeJson, paperId } from "@/lib/utils";
import { USER_AGENT } from "@/lib/config";
import { extractDoi, stripHtml } from "@/lib/text";
import type { Paper } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * GBIF Literature (Global Biodiversity Information Facility): research that
 * uses or cites biodiversity data, on species, ecosystems, conservation,
 * fisheries and agriculture, tagged with whether it was peer-reviewed.
 * Free, no API key. Docs: https://techdocs.gbif.org/en/openapi/v1/literature
 */

const BASE = "https://api.gbif.org/v1/literature/search";

interface GbifRecord {
  title?: string;
  authors?: { firstName?: string; lastName?: string }[];
  year?: number;
  source?: string;
  publisher?: string;
  identifiers?: { doi?: string };
  websites?: string[];
  abstract?: string;
  keywords?: string[];
  openAccess?: boolean;
  peerReview?: boolean;
  literatureType?: string;
}

export async function searchGbif(query: string, opts: AdapterOptions = {}): Promise<Paper[]> {
  const { fromYear, perSource = 15, openAccessOnly } = opts;

  const params = new URLSearchParams({ q: query, limit: String(perSource) });
  if (fromYear && fromYear > 0) params.set("year", `${fromYear},${new Date().getFullYear() + 1}`);
  if (openAccessOnly) params.set("openAccess", "true");

  const res = await fetchWithTimeout(`${BASE}?${params}`, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`GBIF ${res.status}`);
  const data = await safeJson<{ results?: GbifRecord[] }>(res);

  const papers: Paper[] = [];
  for (const r of data?.results ?? []) {
    if (!r.title) continue;
    const doi = extractDoi(r.identifiers?.doi);
    const title = stripHtml(r.title);
    const link = r.websites?.[0] ?? (doi ? `https://doi.org/${doi}` : null);

    papers.push({
      id: paperId(doi, title),
      title,
      authors: (r.authors ?? [])
        .map((a) => [a.firstName, a.lastName].filter(Boolean).join(" "))
        .filter(Boolean)
        .slice(0, 10),
      year: r.year ?? null,
      venue: r.source || r.publisher || "GBIF Literature",
      doi,
      // Some publishers prefix the text with the word "Abstract".
      abstract: r.abstract ? stripHtml(r.abstract).replace(/^Abstract(?=[A-Z])/, "") : null,
      openAccessUrl: r.openAccess ? link : null,
      isOpenAccess: r.openAccess === true,
      keywords: (r.keywords ?? []).slice(0, 5),
      // GBIF records whether a work went through peer review.
      preprint: r.literatureType === "JOURNAL" && r.peerReview ? false : undefined,
      sources: ["gbif"],
    });
  }
  return papers;
}

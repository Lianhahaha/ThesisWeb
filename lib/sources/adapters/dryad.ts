import { paperId } from "@/lib/utils";
import { fetchWithTimeout, readJson } from "@/lib/server/http";
import { USER_AGENT } from "@/lib/server/config";
import { extractDoi, stripHtml } from "@/lib/text";
import type { Paper } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * Dryad: open research-data packages across ecology, agriculture, fisheries,
 * earth and environmental science, each with a citable DOI. Useful when a
 * thesis needs the dataset behind a paper, or a data citation.
 * Docs: https://datadryad.org/api/v2/docs/
 */

const BASE = "https://datadryad.org/api/v2/search";

interface DryadAuthor {
  firstName?: string;
  lastName?: string;
}

interface DryadDataset {
  identifier?: string;
  title?: string;
  authors?: DryadAuthor[];
  abstract?: string | null;
  publicationDate?: string | null;
  keywords?: string[];
  fieldOfScience?: string | null;
  visibility?: string;
}

interface DryadResponse {
  total?: number;
  _embedded?: Record<string, DryadDataset[] | undefined>;
}

/** Map the API's datasets to papers. Exported for tests. */
export function parseDryadDatasets(data: DryadResponse): Paper[] {
  const datasets = data?._embedded?.["stash:datasets"] ?? [];
  const papers: Paper[] = [];
  const maxYear = new Date().getFullYear() + 1;

  for (const d of datasets) {
    if (!d.title) continue;
    const doi = extractDoi(d.identifier);
    const rawYear = d.publicationDate ? Number(d.publicationDate.slice(0, 4)) : null;
    const year = rawYear && rawYear >= 1000 && rawYear <= maxYear ? rawYear : null;
    const url = doi ? `https://doi.org/${doi}` : null;

    papers.push({
      id: paperId(doi, d.title),
      title: stripHtml(d.title),
      authors: (d.authors ?? [])
        .map((a) => [a.firstName, a.lastName].filter(Boolean).join(" ").trim())
        .filter(Boolean)
        .slice(0, 10),
      year,
      publishedDate: d.publicationDate?.slice(0, 10) || null,
      venue: "Dryad",
      type: "other",
      doi,
      abstract: d.abstract ? stripHtml(d.abstract) : null,
      openAccessUrl: url,
      isOpenAccess: true,
      keywords: [...(d.keywords ?? []), ...(d.fieldOfScience ? [d.fieldOfScience] : [])].slice(0, 5),
      url,
      sources: ["dryad"],
    });
  }
  return papers;
}

export async function searchDryad(query: string, opts: AdapterOptions = {}): Promise<Paper[]> {
  const { fromYear, perSource = 15 } = opts;
  const params = new URLSearchParams({ q: query, per_page: String(Math.max(1, perSource)) });

  const res = await fetchWithTimeout(
    `${BASE}?${params}`,
    { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } },
    12000
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await readJson<DryadResponse>(res);
  return parseDryadDatasets(data).filter(
    (p) => !(fromYear && fromYear > 0 && p.year != null && p.year < fromYear)
  );
}

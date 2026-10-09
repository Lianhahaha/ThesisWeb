import { fetchWithTimeout, safeJson, paperId } from "@/lib/utils";
import { USER_AGENT } from "@/lib/server/config";
import { extractDoi, stripHtml } from "@/lib/text";
import type { Paper } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * USGS Publications Warehouse (U.S. Geological Survey): its own report
 * series plus journal articles by USGS scientists on earthquakes,
 * volcanoes, water, minerals, ecosystems and climate. Series reports are
 * free PDFs. Free, no API key. Docs: https://pubs.usgs.gov/documentation/web_service_documentation
 */

const ORIGIN = "https://pubs.usgs.gov";

interface UsgsRecord {
  indexId?: string;
  title?: string;
  docAbstract?: string;
  publicationYear?: string;
  doi?: string;
  publicationType?: { text?: string };
  seriesTitle?: { text?: string };
  largerWorkTitle?: string;
  publisher?: string;
  links?: { type?: { text?: string }; url?: string }[];
  contributors?: { authors?: { given?: string; family?: string; text?: string; corporation?: boolean; organization?: string }[] };
}

export async function searchUsgs(query: string, opts: AdapterOptions = {}): Promise<Paper[]> {
  const { fromYear, perSource = 15, openAccessOnly } = opts;

  const params = new URLSearchParams({ q: query, page_size: String(perSource) });
  if (fromYear && fromYear > 0) params.set("startYear", String(fromYear));

  const res = await fetchWithTimeout(`${ORIGIN}/pubs-services/publication/?${params}`, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`USGS ${res.status}`);
  const data = await safeJson<{ records?: UsgsRecord[] }>(res);

  const papers: Paper[] = [];
  for (const r of data?.records ?? []) {
    if (!r.title) continue;
    const pdf = r.links?.find((l) => l.type?.text === "Document" && l.url)?.url ?? null;
    if (openAccessOnly && !pdf) continue;
    const doi = extractDoi(r.doi);
    const title = stripHtml(r.title);
    const year = Number(r.publicationYear) || null;

    papers.push({
      id: paperId(doi, title),
      title,
      authors: (r.contributors?.authors ?? [])
        .map((a) => (a.corporation ? a.organization ?? a.text ?? "" : [a.given, a.family].filter(Boolean).join(" ")))
        .filter(Boolean)
        .slice(0, 10),
      year,
      venue: r.largerWorkTitle || r.seriesTitle?.text || r.publisher || "USGS",
      doi,
      abstract: r.docAbstract ? stripHtml(r.docAbstract) : null,
      openAccessUrl: pdf,
      isOpenAccess: !!pdf,
      url: r.indexId ? `${ORIGIN}/publication/${r.indexId}` : null,
      sources: ["usgs"],
    });
  }
  return papers;
}

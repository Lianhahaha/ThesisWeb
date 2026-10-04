import { fetchWithTimeout, safeJson, paperId } from "@/lib/utils";
import { USER_AGENT } from "@/lib/config";
import { extractDoi, stripHtml } from "@/lib/text";
import type { Paper } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * NASA Technical Reports Server: technical reports, conference papers,
 * journal reprints and theses from NASA research in aeronautics, space,
 * Earth science, materials and engineering. Public records only.
 * Free, no API key. Docs: https://ntrs.nasa.gov/api/openapi/
 */

const ORIGIN = "https://ntrs.nasa.gov";

interface NtrsRecord {
  id?: number;
  title?: string;
  abstract?: string;
  stiType?: string;
  keywords?: string[];
  distribution?: string;
  authorAffiliations?: { meta?: { author?: { name?: string } } }[];
  publications?: { publicationDate?: string; doi?: string; publicationName?: string }[];
  downloads?: { links?: { pdf?: string; original?: string } }[];
}

export async function searchNtrs(query: string, opts: AdapterOptions = {}): Promise<Paper[]> {
  const { fromYear, perSource = 15, openAccessOnly } = opts;

  const params = new URLSearchParams({ q: query, "page.size": String(perSource) });
  if (fromYear && fromYear > 0) params.set("published.gte", `${fromYear}-01-01`);

  const res = await fetchWithTimeout(`${ORIGIN}/api/citations/search?${params}`, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`NTRS ${res.status}`);
  const data = await safeJson<{ results?: NtrsRecord[] }>(res);

  const papers: Paper[] = [];
  for (const r of data?.results ?? []) {
    if (!r.title || (r.distribution && r.distribution !== "PUBLIC")) continue;
    const pub = r.publications?.[0];
    const doi = extractDoi(pub?.doi);
    const date = pub?.publicationDate?.slice(0, 10) ?? null;
    const pdfPath = r.downloads?.find((d) => d.links?.pdf)?.links?.pdf;
    const pdf = pdfPath ? `${ORIGIN}${pdfPath}` : null;
    if (openAccessOnly && !pdf) continue;
    const title = stripHtml(r.title);

    papers.push({
      id: paperId(doi, title),
      title,
      authors: (r.authorAffiliations ?? [])
        .map((a) => a.meta?.author?.name?.trim() ?? "")
        .filter(Boolean)
        .slice(0, 10),
      year: date ? Number(date.slice(0, 4)) || null : null,
      publishedDate: date,
      venue: pub?.publicationName || "NASA Technical Reports Server",
      doi,
      abstract: r.abstract ? stripHtml(r.abstract) : null,
      openAccessUrl: pdf,
      isOpenAccess: !!pdf,
      keywords: (r.keywords ?? []).slice(0, 5),
      url: r.id ? `${ORIGIN}/citations/${r.id}` : null,
      // NTRS labels journal reprints REPRINT and unreviewed manuscripts PREPRINT.
      preprint: r.stiType === "PREPRINT" ? true : r.stiType === "REPRINT" ? false : undefined,
      sources: ["ntrs"],
    });
  }
  return papers;
}

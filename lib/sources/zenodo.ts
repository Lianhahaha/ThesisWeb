import { fetchWithTimeout, safeJson, paperId } from "@/lib/utils";
import { USER_AGENT } from "@/lib/config";
import { flipName, stripHtml } from "@/lib/text";
import type { Paper } from "@/lib/types";

/**
 * Zenodo adapter (CERN / OpenAIRE).
 * - Free, no API key for search. Hosts open articles, preprints, theses,
 *   reports, conference papers and datasets from every discipline.
 * - Strong for grey literature and theses that publishers don't index.
 * Docs: https://developers.zenodo.org/#records
 */

const BASE = "https://zenodo.org/api/records";

interface ZenodoHit {
  id: number;
  doi?: string;
  links?: { self_html?: string; doi?: string };
  files?: { key?: string; links?: { self?: string } }[];
  metadata?: {
    title?: string;
    doi?: string;
    publication_date?: string;
    description?: string;
    access_right?: string;
    creators?: { name?: string }[];
    keywords?: string[];
    resource_type?: { type?: string; subtype?: string; title?: string };
    journal?: { title?: string };
    imprint?: { publisher?: string };
  };
}

export async function searchZenodo(
  query: string,
  opts: { fromYear?: number; perSource?: number; openAccessOnly?: boolean } = {}
): Promise<Paper[]> {
  const { fromYear, perSource = 15, openAccessOnly } = opts;

  // Zenodo uses an Elasticsearch query string; range clauses narrow by date.
  let q = query;
  if (fromYear && fromYear > 0) q += ` AND publication_date:[${fromYear}-01-01 TO *]`;

  const params = new URLSearchParams({
    q,
    size: String(perSource),
    type: "publication",
    sort: "bestmatch",
  });
  if (openAccessOnly) params.set("access_status", "open");

  const res = await fetchWithTimeout(`${BASE}?${params}`, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`Zenodo ${res.status}`);
  const data = await safeJson<{ hits?: { hits?: ZenodoHit[] } }>(res);
  const hits = data?.hits?.hits ?? [];

  const papers: Paper[] = [];
  for (const h of hits) {
    const m = h.metadata;
    if (!m?.title) continue;

    const doi = m.doi ?? h.doi ?? null;
    const year = m.publication_date ? Number(m.publication_date.slice(0, 4)) : null;
    const isOpen = m.access_right === "open";
    const pdf = h.files?.find((f) => f.key?.toLowerCase().endsWith(".pdf"))?.links?.self ?? null;

    papers.push({
      id: paperId(doi, m.title),
      title: stripHtml(m.title),
      authors: (m.creators ?? []).map((c) => flipName(c.name ?? "")).filter(Boolean).slice(0, 10),
      year: year && Number.isFinite(year) ? year : null,
      publishedDate: m.publication_date ?? null,
      // Journal name if it has one, else the kind of record ("Thesis", "Report"...).
      venue: m.journal?.title ?? m.imprint?.publisher ?? m.resource_type?.title ?? "Zenodo",
      doi,
      abstract: m.description ? stripHtml(m.description) : null,
      openAccessUrl: isOpen ? pdf ?? h.links?.self_html ?? null : null,
      isOpenAccess: isOpen,
      keywords: (m.keywords ?? []).slice(0, 5),
      sources: ["zenodo"],
    });
  }
  return papers;
}

import { paperId } from "@/lib/utils";
import { fetchWithTimeout, readJson } from "@/lib/server/http";
import { USER_AGENT } from "@/lib/server/config";
import type { Paper } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * Papers with Code: machine-learning papers linked to code, tasks and
 * benchmarks. Useful for computing and engineering students who want the
 * implementation, not just the abstract. Records are mostly arXiv preprints.
 *
 * Free, no API key (beta endpoint). Live-tested before adding; if the beta
 * changes, the source reports as unavailable and the rest of the search is
 * unaffected.
 */

const BASE = "https://paperswithcode.co/api/v1/papers/search";

interface PwcPaper {
  id?: string;
  title?: string;
  arxiv_id?: string | null;
  source?: string;
  source_url?: string | null;
  authors?: string[];
  published?: string;
  url_abs?: string | null;
  citation_count?: number;
}

function yearOf(date: string | undefined): number | null {
  const m = date?.match(/^(\d{4})/);
  return m ? Number(m[1]) : null;
}

export async function searchPapersWithCode(query: string, opts: AdapterOptions = {}): Promise<Paper[]> {
  const { fromYear, perSource = 15 } = opts;
  const params = new URLSearchParams({ q: query, page_size: String(Math.min(perSource, 50)) });

  const res = await fetchWithTimeout(`${BASE}?${params}`, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } }, 12000);
  if (!res.ok) throw new Error(`Papers with Code ${res.status}`);
  const data = await readJson<{ results?: PwcPaper[] }>(res);

  const papers: Paper[] = [];
  for (const p of data?.results ?? []) {
    if (!p.title) continue;
    const year = yearOf(p.published);
    if (fromYear && year && year < fromYear) continue;
    const arxivId = p.arxiv_id?.replace(/v\d+$/i, "") || null;
    // arXiv assigns DOIs of the form 10.48550/arXiv.<id>, which lets these
    // records dedupe with the same paper from other sources.
    const doi = arxivId ? `10.48550/arXiv.${arxivId}` : null;
    const url = p.url_abs || p.source_url || (arxivId ? `https://arxiv.org/abs/${arxivId}` : null);

    papers.push({
      id: paperId(doi, p.title),
      title: p.title,
      authors: (p.authors ?? []).filter(Boolean).slice(0, 10),
      year,
      publishedDate: p.published?.slice(0, 10) ?? null,
      venue: "Papers with Code",
      type: "preprint",
      doi,
      abstract: null,
      openAccessUrl: arxivId ? url : null,
      isOpenAccess: !!arxivId,
      url,
      citedByCount: typeof p.citation_count === "number" ? p.citation_count : undefined,
      keywords: [],
      sources: ["paperswithcode"],
    });
    if (papers.length >= perSource) break;
  }
  return papers;
}

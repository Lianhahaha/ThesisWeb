import { fetchWithTimeout, safeJson, paperId } from "@/lib/utils";
import { USER_AGENT } from "@/lib/config";
import { extractDoi, stripHtml } from "@/lib/text";
import type { Paper } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * OpenAIRE adapter (Graph API v1).
 * - The European open-science graph: publications aggregated from thousands
 *   of repositories, publishers and funders, de-duplicated across copies.
 * - Free, no API key. The older /search/publications API stopped answering
 *   (40 s timeouts), so this uses the Graph API, which answers in ~2 s.
 * Docs: https://graph.openaire.eu/docs/apis/graph-api/
 */

const BASE = "https://api.openaire.eu/graph/v1/researchProducts";

interface Pid {
  scheme?: string;
  value?: string;
}

interface Product {
  mainTitle?: string;
  authors?: { fullName?: string; rank?: number }[] | null;
  publicationDate?: string;
  publisher?: string;
  descriptions?: string[];
  pids?: Pid[] | null;
  bestAccessRight?: { label?: string } | null;
  container?: { name?: string } | null;
  subjects?: { subject?: { scheme?: string; value?: string } }[] | null;
  instances?: { urls?: string[]; license?: string; refereed?: string }[] | null;
  indicators?: { citationImpact?: { citationCount?: number } };
}

export async function searchOpenAire(query: string, opts: AdapterOptions = {}): Promise<Paper[]> {
  const { fromYear, perSource = 15, openAccessOnly } = opts;

  const params = new URLSearchParams({ search: query, type: "publication", pageSize: String(perSource) });
  if (fromYear && fromYear > 0) params.set("fromPublicationDate", `${fromYear}-01-01`);
  if (openAccessOnly) params.set("bestOpenAccessRightLabel", "OPEN");

  const res = await fetchWithTimeout(`${BASE}?${params}`, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`OpenAIRE ${res.status}`);
  const data = await safeJson<{ results?: Product[] | null }>(res);

  const papers: Paper[] = [];
  for (const r of data?.results ?? []) {
    if (!r.mainTitle) continue;
    const title = stripHtml(r.mainTitle);
    const doi = extractDoi(r.pids?.find((p) => p.scheme === "doi")?.value);
    const year = r.publicationDate ? Number(r.publicationDate.slice(0, 4)) || null : null;

    const isOA = r.bestAccessRight?.label === "OPEN";
    // Prefer a copy outside doi.org (repository / PMC), else the DOI link.
    const urls = (r.instances ?? []).flatMap((i) => i.urls ?? []);
    const openUrl = isOA ? urls.find((u) => !/doi\.org/i.test(u)) ?? urls[0] ?? null : null;
    const abstract = r.descriptions?.find(Boolean);
    const refereed = (r.instances ?? []).some((i) => i.refereed === "peerReviewed");

    papers.push({
      id: paperId(doi, title),
      title,
      authors: [...(r.authors ?? [])]
        .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
        .map((a) => a.fullName?.trim() ?? "")
        .filter(Boolean)
        .slice(0, 10),
      year,
      publishedDate: r.publicationDate ?? null,
      venue: r.container?.name || r.publisher || null,
      doi,
      // JATS abstracts start with an <jats:title>Abstract</jats:title> heading.
      abstract: abstract ? stripHtml(abstract).replace(/^abstract\s*[:.]?\s+/i, "") || null : null,
      openAccessUrl: openUrl,
      isOpenAccess: isOA,
      citedByCount: r.indicators?.citationImpact?.citationCount ?? undefined,
      keywords: (r.subjects ?? [])
        .filter((s) => s.subject?.scheme === "keyword")
        .map((s) => s.subject?.value ?? "")
        .filter(Boolean)
        .slice(0, 5),
      // A peer-reviewed copy anywhere means a reviewed version exists.
      preprint: refereed ? false : undefined,
      sources: ["openaire"],
    });
  }
  return papers;
}

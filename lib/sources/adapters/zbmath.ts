import { paperId } from "@/lib/utils";
import { fetchWithTimeout, readJson } from "@/lib/server/http";
import { extractDoi, flipName, stripHtml } from "@/lib/text";
import type { Paper, WorkType } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * zbMATH Open: the mathematical reviews database run by FIZ Karlsruhe and
 * the European Mathematical Society. It covers pure and applied mathematics,
 * statistics, mathematical computer science and mathematical physics, with
 * author-written titles and third-party reviews.
 * https://zbmath.org
 */

const BASE = "https://api.zbmath.org/v1/document/_search";

interface ZbMathDoc {
  id?: number;
  title?: { title?: string };
  year?: string;
  source?: { source?: string; pages?: string; book?: { publisher?: string }[] };
  contributors?: { authors?: { name?: string }[] };
  keywords?: string[];
  document_type?: { description?: string };
  zbmath_url?: string;
  links?: { type?: string; url?: string }[];
}

const WORK_TYPE: Record<string, WorkType> = {
  "serial article": "article",
  book: "book",
  "book chapter": "chapter",
  thesis: "thesis",
  dissertation: "thesis",
  "conference paper": "conference",
  report: "report",
};

function documentType(description: string | undefined): WorkType | undefined {
  return description ? WORK_TYPE[description.toLowerCase()] : undefined;
}

export async function searchZbmath(query: string, opts: AdapterOptions = {}): Promise<Paper[]> {
  const { fromYear, perSource = 15, openAccessOnly } = opts;
  // zbMATH does not mark open-access copies.
  if (openAccessOnly) return [];

  // Relevance order is old-heavy; ask for more and filter by year here.
  const pageSize = fromYear ? Math.min(perSource * 6, 100) : perSource;
  const params = new URLSearchParams({
    search_string: query,
    results_per_page: String(pageSize),
    page: "1",
  });
  const res = await fetchWithTimeout(`${BASE}?${params}`, { headers: { Accept: "application/json" } }, 12000);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await readJson<{ result?: ZbMathDoc[] }>(res, {});
  const papers: Paper[] = [];

  for (const doc of data?.result ?? []) {
    const title = stripHtml(doc.title?.title ?? "");
    if (!title) continue;
    const year = doc.year ? Number(doc.year) || null : null;
    if (fromYear && year && year < fromYear) continue;
    const linkDoi = doc.links?.find((l) => /doi/i.test(`${l.type ?? ""} ${l.url ?? ""}`))?.url;
    papers.push({
      id: paperId(extractDoi(linkDoi ?? null), title),
      title,
      authors: (doc.contributors?.authors ?? [])
        .map((a) => flipName(stripHtml(a.name ?? "")))
        .filter(Boolean)
        .slice(0, 10),
      year,
      venue: stripHtml(doc.source?.source ?? "") || doc.source?.book?.[0]?.publisher || "zbMATH Open",
      type: documentType(doc.document_type?.description),
      pages: doc.source?.pages ?? null,
      doi: extractDoi(linkDoi ?? null),
      abstract: null,
      openAccessUrl: null,
      isOpenAccess: false,
      keywords: (doc.keywords ?? []).map((k) => stripHtml(k)).filter(Boolean).slice(0, 10),
      url: doc.zbmath_url ?? (doc.id ? `https://zbmath.org/${doc.id}` : null),
      preprint: false,
      sources: ["zbmath"],
    });
  }
  return papers.slice(0, perSource);
}

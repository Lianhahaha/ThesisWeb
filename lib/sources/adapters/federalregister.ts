import { paperId } from "@/lib/utils";
import { fetchWithTimeout, readJson } from "@/lib/server/http";
import { USER_AGENT } from "@/lib/server/config";
import { stripHtml } from "@/lib/text";
import type { Paper } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * Federal Register (U.S. National Archives): rules, proposed rules, notices
 * and executive orders, with abstracts and free PDFs. For law, public policy,
 * governance and social-science work this is primary-source material that
 * journal indexes do not cover.
 *
 * Free, no API key. Docs: https://www.federalregister.gov/developers/documentation/api/v1
 */

const BASE = "https://www.federalregister.gov/api/v1/documents.json";

interface FrDocument {
  title?: string;
  abstract?: string;
  publication_date?: string;
  document_number?: string;
  html_url?: string;
  pdf_url?: string;
  type?: string;
  agencies?: { name?: string }[];
  citation?: string;
}

function yearOf(date: string | undefined): number | null {
  const m = date?.match(/^(\d{4})/);
  return m ? Number(m[1]) : null;
}

export async function searchFederalRegister(query: string, opts: AdapterOptions = {}): Promise<Paper[]> {
  const { fromYear, perSource = 15 } = opts;
  const params = new URLSearchParams({
    "conditions[term]": query,
    per_page: String(Math.min(perSource * 2, 50)),
    order: "newest",
  });
  for (const field of ["title", "abstract", "publication_date", "document_number", "html_url", "pdf_url", "type", "agencies", "citation"]) {
    params.append("fields[]", field);
  }

  const res = await fetchWithTimeout(`${BASE}?${params}`, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } }, 12000);
  if (!res.ok) throw new Error(`Federal Register ${res.status}`);
  const data = await readJson<{ results?: FrDocument[] }>(res);

  const papers: Paper[] = [];
  for (const d of data?.results ?? []) {
    if (!d.title) continue;
    const title = stripHtml(d.title);
    const year = yearOf(d.publication_date);
    if (fromYear && year && year < fromYear) continue;

    const authors = (d.agencies ?? []).map((a) => a.name ?? "").filter(Boolean).slice(0, 10);
    const pdf = d.pdf_url ?? null;

    papers.push({
      id: paperId(null, `${d.document_number ?? ""} ${title}`),
      title,
      authors,
      year,
      publishedDate: d.publication_date ?? null,
      venue: "Federal Register",
      type: "report",
      doi: null,
      abstract: d.abstract ? stripHtml(d.abstract) : null,
      openAccessUrl: pdf,
      isOpenAccess: !!pdf,
      url: d.html_url ?? (d.document_number ? `https://www.federalregister.gov/d/${d.document_number}` : null),
      keywords: [d.type, d.citation].filter((x): x is string => !!x).slice(0, 5),
      sources: ["federalregister"],
    });
    if (papers.length >= perSource) break;
  }
  return papers;
}

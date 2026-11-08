import { paperId } from "@/lib/utils";
import { fetchWithTimeout, readJson } from "@/lib/server/http";
import { USER_AGENT } from "@/lib/server/config";
import { stripHtml } from "@/lib/text";
import type { Paper, WorkType } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * CaltechAUTHORS: Caltech's open-access repository of papers, preprints,
 * theses and technical reports, strong in AI, robotics, physics and
 * electrical, mechanical and aerospace engineering.
 * https://authors.library.caltech.edu
 */

const BASE = "https://authors.library.caltech.edu/api/records";

interface CaltechRecord {
  id?: string;
  links?: { self_html?: string };
  metadata?: {
    title?: string;
    publisher?: string;
    publication_date?: string;
    description?: string;
    resource_type?: { id?: string; title?: { en?: string } };
    creators?: { person_or_org?: { name?: string } }[];
    subjects?: { subject?: string }[];
    identifiers?: { identifier?: string; scheme?: string }[];
  };
}

function yearOf(date: string | undefined): number | null {
  const m = date?.match(/^(\d{4})/);
  return m ? Number(m[1]) : null;
}

function workType(id: string | undefined): WorkType | undefined {
  const t = (id ?? "").toLowerCase();
  if (/thesis|dissertation/.test(t)) return "thesis";
  if (/preprint|working/.test(t)) return "preprint";
  if (/conference/.test(t)) return "conference";
  if (/report|techreport/.test(t)) return "report";
  if (/book/.test(t)) return "book";
  if (/article/.test(t)) return "article";
  return undefined;
}

export async function searchCaltech(query: string, opts: AdapterOptions = {}): Promise<Paper[]> {
  const { fromYear, perSource = 15 } = opts;
  const params = new URLSearchParams({ q: query, size: String(Math.min(perSource * 2, 50)) });

  const res = await fetchWithTimeout(`${BASE}?${params}`, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } }, 14000);
  if (!res.ok) throw new Error(`CaltechAUTHORS ${res.status}`);
  const data = await readJson<{ hits?: { hits?: CaltechRecord[] } }>(res);

  const papers: Paper[] = [];
  for (const r of data?.hits?.hits ?? []) {
    const m = r.metadata;
    const title = stripHtml(m?.title ?? "");
    if (!r.id || !title) continue;
    const year = yearOf(m?.publication_date);
    if (fromYear && year && year < fromYear) continue;

    const doi = m?.identifiers?.find((i) => i.scheme?.toLowerCase() === "doi")?.identifier ?? null;
    const url = r.links?.self_html ?? `https://authors.library.caltech.edu/records/${r.id}`;

    papers.push({
      id: paperId(doi, title),
      title,
      authors: (m?.creators ?? []).map((c) => c.person_or_org?.name ?? "").filter(Boolean).slice(0, 10),
      year,
      publishedDate: m?.publication_date ?? null,
      venue: m?.publisher || "CaltechAUTHORS",
      type: workType(m?.resource_type?.id),
      doi,
      abstract: m?.description ? stripHtml(m.description) : null,
      openAccessUrl: url,
      // CaltechAUTHORS is an open-access repository.
      isOpenAccess: true,
      url,
      keywords: (m?.subjects ?? []).flatMap((s) => (s.subject ?? "").split(/\s*,\s*/)).filter(Boolean).slice(0, 8),
      sources: ["caltech"],
    });
    if (papers.length >= perSource) break;
  }
  return papers;
}

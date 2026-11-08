import { paperId } from "@/lib/utils";
import { fetchWithTimeout, readJson } from "@/lib/server/http";
import { USER_AGENT } from "@/lib/server/config";
import { stripHtml } from "@/lib/text";
import type { Paper } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * Google Patents: published patents and applications worldwide. For hardware,
 * electronics, mechanical and materials engineering, patents are often the
 * only place a design is described in full, and they are not indexed by the
 * journal databases.
 *
 * This uses Google Patents' public XHR search endpoint. It is not a documented
 * API, so it may change; if it does, the source reports as unavailable and the
 * rest of the search is unaffected.
 */

const BASE = "https://patents.google.com/xhr/query";

interface PatentRecord {
  id?: string;
  patent?: {
    title?: string;
    snippet?: string;
    publication_date?: string;
    inventor?: string;
    assignee?: string;
    publication_number?: string;
    pdf?: string;
  };
}

interface PatentResponse {
  results?: { cluster?: { result?: PatentRecord[] }[] };
}

function yearOf(date: string | undefined): number | null {
  const m = date?.match(/^(\d{4})/);
  return m ? Number(m[1]) : null;
}

function people(value: string | undefined): string[] {
  return (value ?? "")
    .split(/\s*;\s*|\s+and\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 10);
}

export async function searchGooglePatents(query: string, opts: AdapterOptions = {}): Promise<Paper[]> {
  const { fromYear, perSource = 15 } = opts;
  const inner = new URLSearchParams({ q: query }).toString();
  const url = `${BASE}?url=${encodeURIComponent(inner)}&exp=`;

  const res = await fetchWithTimeout(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } }, 12000);
  if (!res.ok) throw new Error(`Google Patents ${res.status}`);
  const data = await readJson<PatentResponse>(res);
  const records = (data?.results?.cluster ?? []).flatMap((c) => c.result ?? []);

  const papers: Paper[] = [];
  for (const r of records) {
    const p = r.patent;
    const number = p?.publication_number;
    const rawTitle = p?.title;
    if (!number || !rawTitle) continue;
    const title = stripHtml(rawTitle);
    const year = yearOf(p?.publication_date);
    if (fromYear && year && year < fromYear) continue;

    const pdf = p?.pdf ? `https://patentimages.storage.googleapis.com/${p.pdf}` : null;

    papers.push({
      // Patent publication numbers are unique and stable.
      id: paperId(null, `${number} ${title}`),
      title,
      authors: people(p?.inventor),
      year,
      publishedDate: p?.publication_date ?? null,
      venue: "Google Patents",
      type: "report",
      publisher: p?.assignee?.trim() || null,
      abstract: p?.snippet ? stripHtml(p.snippet) : null,
      openAccessUrl: pdf,
      // Published patents are public documents.
      isOpenAccess: true,
      url: `https://patents.google.com/patent/${number}/en`,
      keywords: [],
      sources: ["googlepatents"],
    });
    if (papers.length >= perSource) break;
  }
  return papers;
}

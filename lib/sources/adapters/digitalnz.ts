import { paperId } from "@/lib/utils";
import { fetchWithTimeout, readJson } from "@/lib/server/http";
import { USER_AGENT } from "@/lib/server/config";
import { stripHtml } from "@/lib/text";
import type { Paper } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * DigitalNZ, the National Library of New Zealand's discovery service:
 * archives, newspapers, magazines, images, government documents and some
 * theses from libraries, museums and cultural institutions. Keyless at a
 * shared 10,000-call daily limit.
 * https://digitalnz.org
 */

const BASE = "https://api.digitalnz.org/v3/records.json";

interface DigitalNzRecord {
  id?: number;
  title?: string;
  description?: string;
  creator?: string[];
  date?: string[];
  display_date?: string;
  landing_url?: string;
  display_content_partner?: string;
  display_collection?: string;
  category?: string[];
  subject?: string[];
  usage?: string[];
}

interface DigitalNzResponse {
  search?: { results?: DigitalNzRecord[]; result_count?: number };
}

/** Map the API's records to papers. Exported for tests. */
export function parseDigitalNz(data: DigitalNzResponse): Paper[] {
  const papers: Paper[] = [];
  const maxYear = new Date().getFullYear() + 1;

  for (const r of data?.search?.results ?? []) {
    if (!r.title) continue;
    const rawYear = (r.date?.[0] ?? r.display_date)?.slice(0, 4);
    const year = rawYear && /^\d{4}$/.test(rawYear) && Number(rawYear) <= maxYear ? Number(rawYear) : null;
    const url = r.landing_url ?? null;

    papers.push({
      id: paperId(null, r.title),
      title: stripHtml(r.title),
      authors: (r.creator ?? []).filter(Boolean).slice(0, 10),
      year,
      venue: r.display_content_partner ?? r.display_collection ?? "DigitalNZ",
      type: "other",
      doi: null,
      abstract: r.description ? stripHtml(r.description) : null,
      openAccessUrl: null,
      isOpenAccess: false,
      keywords: [...(r.category ?? []), ...(r.subject ?? [])].slice(0, 5),
      url,
      sources: ["digitalnz"],
    });
  }
  return papers;
}

export async function searchDigitalNz(query: string, opts: AdapterOptions = {}): Promise<Paper[]> {
  const { fromYear, perSource = 15 } = opts;
  const params = new URLSearchParams({ text: query, per_page: String(Math.max(1, perSource)) });

  const res = await fetchWithTimeout(
    `${BASE}?${params}`,
    { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } },
    12000
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return parseDigitalNz(await readJson<DigitalNzResponse>(res)).filter(
    (p) => !(fromYear && fromYear > 0 && p.year != null && p.year < fromYear)
  );
}

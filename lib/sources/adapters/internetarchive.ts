import { paperId } from "@/lib/utils";
import { fetchWithTimeout, readJson } from "@/lib/server/http";
import { USER_AGENT } from "@/lib/server/config";
import { stripHtml } from "@/lib/text";
import type { Paper } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * Internet Archive: books, texts, reports and historical primary sources from
 * libraries and archives worldwide. Complements Open Library and Google Books
 * for humanities, history and area studies, where the item record (not the
 * journal article) is what a student needs to cite.
 *
 * Free, no API key. Docs: https://archive.org/advancedsearch.php
 */

const BASE = "https://archive.org/advancedsearch.php";

interface IaDoc {
  identifier?: string;
  title?: string | string[];
  creator?: string | string[];
  year?: string | number;
  date?: string;
  description?: string | string[];
  mediatype?: string;
  subject?: string | string[];
}

/** Some IA fields are a string, some an array of strings. */
function first(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

function list(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return (Array.isArray(v) ? v : [v]).map((s) => stripHtml(String(s))).filter(Boolean);
}

function yearOf(d: IaDoc): number | null {
  const explicit = typeof d.year === "number" ? d.year : Number(d.year);
  if (Number.isInteger(explicit) && explicit >= 1000) return explicit;
  const m = d.date?.match(/^(\d{4})/);
  return m ? Number(m[1]) : null;
}

export async function searchInternetArchive(query: string, opts: AdapterOptions = {}): Promise<Paper[]> {
  const { fromYear, perSource = 15 } = opts;
  const params = new URLSearchParams({ q: query, rows: String(Math.min(perSource * 2, 50)), page: "1", output: "json" });
  for (const field of ["identifier", "title", "creator", "year", "date", "description", "mediatype", "subject"]) {
    params.append("fl[]", field);
  }

  const res = await fetchWithTimeout(`${BASE}?${params}`, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } }, 12000);
  if (!res.ok) throw new Error(`Internet Archive ${res.status}`);
  const data = await readJson<{ response?: { docs?: IaDoc[] } }>(res);

  const papers: Paper[] = [];
  for (const d of data?.response?.docs ?? []) {
    const title = stripHtml(first(d.title));
    if (!d.identifier || !title) continue;
    const year = yearOf(d);
    if (fromYear && year && year < fromYear) continue;

    papers.push({
      id: paperId(null, `${d.identifier} ${title}`),
      title,
      authors: list(d.creator).slice(0, 10),
      year,
      publishedDate: d.date?.slice(0, 10) ?? null,
      venue: "Internet Archive",
      // Most items are texts; other media are still worth listing.
      type: d.mediatype === "texts" ? "book" : "other",
      doi: null,
      abstract: list(d.description).join(" ").slice(0, 40000) || null,
      // Archive.org may lend rather than serve every item, so it is not
      // claimed as open access.
      isOpenAccess: false,
      url: `https://archive.org/details/${d.identifier}`,
      keywords: list(d.subject).slice(0, 8),
      sources: ["internetarchive"],
    });
    if (papers.length >= perSource) break;
  }
  return papers;
}

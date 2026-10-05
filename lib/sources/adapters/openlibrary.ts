import { fetchWithTimeout, safeJson, paperId } from "@/lib/utils";
import { USER_AGENT } from "@/lib/config";
import type { Paper } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * Open Library (Internet Archive): a catalogue of 30M+ books built from
 * library records, for the textbooks and monographs an RRL also cites.
 * Public-domain scans read free online; newer books link to their
 * catalogue page (some can be borrowed there).
 * Docs: https://openlibrary.org/dev/docs/api/search
 */

const FIELDS = "key,title,subtitle,author_name,first_publish_year,publisher,ebook_access,subject";

interface OpenLibraryDoc {
  /** "/works/OL21439278W". */
  key?: string;
  title?: string;
  subtitle?: string;
  author_name?: string[];
  first_publish_year?: number;
  publisher?: string[];
  /** "public" (free scan), "borrowable", "printdisabled" or "no_ebook". */
  ebook_access?: string;
  subject?: string[];
}

export async function searchOpenLibrary(query: string, opts: AdapterOptions = {}): Promise<Paper[]> {
  const { fromYear, perSource = 15, openAccessOnly } = opts;

  let q = query;
  if (fromYear && fromYear > 0) q += ` first_publish_year:[${fromYear} TO *]`;
  if (openAccessOnly) q += " ebook_access:public";
  const params = new URLSearchParams({ q, limit: String(perSource), fields: FIELDS });

  const res = await fetchWithTimeout(`https://openlibrary.org/search.json?${params}`, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await safeJson<{ docs?: OpenLibraryDoc[] }>(res);

  const papers: Paper[] = [];
  for (const d of data?.docs ?? []) {
    if (!d.title || !d.key) continue;
    const title = d.subtitle ? `${d.title}: ${d.subtitle}` : d.title;
    const link = `https://openlibrary.org${d.key}`;
    const isOpen = d.ebook_access === "public";

    papers.push({
      id: paperId(null, title),
      title,
      authors: (d.author_name ?? []).slice(0, 10),
      year: d.first_publish_year ?? null,
      venue: d.publisher?.[0] ?? "Book",
      doi: null,
      abstract: null,
      openAccessUrl: isOpen ? link : null,
      isOpenAccess: isOpen,
      keywords: (d.subject ?? []).slice(0, 5),
      url: link,
      sources: ["openlibrary"],
    });
  }
  return papers;
}

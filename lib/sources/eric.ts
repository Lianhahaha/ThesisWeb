import { fetchWithTimeout, safeJson, paperId } from "@/lib/utils";
import { USER_AGENT } from "@/lib/config";
import type { Paper } from "@/lib/types";

/**
 * ERIC (Education Resources Information Center) adapter.
 * - U.S. Department of Education's index of education research: journal
 *   articles, theses/dissertations, reports and conference papers.
 * - Free, no API key. ~1.5M records — essential for education, teaching,
 *   curriculum, counselling and educational-psychology theses.
 * Docs: https://eric.ed.gov/?api
 */

const BASE = "https://api.ies.ed.gov/eric/";
const FIELDS = [
  "id", "title", "author", "description", "subject", "publicationdateyear",
  "publicationdate", "source", "url", "peerreviewed", "e_fulltextauth", "publicationtype",
].join(",");

interface EricDoc {
  id?: string;
  title?: string;
  author?: string[];
  description?: string;
  subject?: string[];
  publicationdateyear?: number;
  publicationdate?: string;
  source?: string;
  url?: string;
  peerreviewed?: string;
  /** 1 when ERIC hosts the full text as a PDF, else 0. */
  e_fulltextauth?: number | string;
  publicationtype?: string[];
}

/** ERIC returns HTML entities in text fields ("Students&apos; ..."). */
function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#0?39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&");
}

/** ERIC lists authors "Family, Given"; the rest of the app stores "Given Family". */
function flipName(name: string): string {
  const [family, given] = name.split(",").map((s) => s.trim());
  return given ? `${given} ${family}` : name.trim();
}

export async function searchEric(
  query: string,
  opts: { fromYear?: number; perSource?: number; openAccessOnly?: boolean } = {}
): Promise<Paper[]> {
  const { fromYear, perSource = 15 } = opts;

  let search = query;
  if (fromYear && fromYear > 0) search += ` AND publicationdateyear:[${fromYear} TO 3000]`;

  const params = new URLSearchParams({
    search,
    format: "json",
    rows: String(perSource),
    fields: FIELDS,
  });

  const res = await fetchWithTimeout(`${BASE}?${params}`, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`ERIC ${res.status}`);
  const data = await safeJson<{ response?: { docs?: EricDoc[] } }>(res);
  const docs = data?.response?.docs ?? [];

  const papers: Paper[] = [];
  for (const d of docs) {
    if (!d.title) continue;
    const hasFullText = Number(d.e_fulltextauth) === 1;
    if (opts.openAccessOnly && !hasFullText) continue;

    const title = decodeEntities(d.title);
    // Journal articles (EJ...) carry their DOI in `url` ("http://dx.doi.org/10...").
    // Keeping it lets the record merge with the same paper from other sources.
    const doi = d.url?.match(/doi\.org\/(10\.\S+)/i)?.[1] ?? null;
    const pdf = d.id && hasFullText ? `https://files.eric.ed.gov/fulltext/${d.id}.pdf` : null;

    papers.push({
      id: paperId(doi, title),
      title,
      authors: (d.author ?? []).map(flipName).slice(0, 10),
      year: d.publicationdateyear ?? null,
      publishedDate: d.publicationdate ?? null,
      venue: d.source ? decodeEntities(d.source) : null,
      doi,
      abstract: d.description ? decodeEntities(d.description) : null,
      openAccessUrl: pdf ?? null,
      isOpenAccess: hasFullText,
      keywords: (d.subject ?? []).map(decodeEntities).slice(0, 5),
      sources: ["eric"],
    });
  }
  return papers;
}

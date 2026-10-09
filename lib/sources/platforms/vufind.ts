import { fetchWithTimeout, safeJson, paperId } from "@/lib/utils";
import { USER_AGENT } from "@/lib/server/config";
import { extractDoi, flipName, stripHtml } from "@/lib/text";
import type { Paper } from "@/lib/types";
import type { Adapter, AdapterOptions } from "@/lib/sources/types";

/**
 * Shared client for VuFind discovery portals (La Referencia, Brazil's BDTD
 * and many national library catalogues). All expose the same REST API.
 * Docs: https://vufind.org/wiki/development:architecture:rest_api
 */

export interface VufindConfig {
  /** Source id, as in lib/sources/meta.ts. */
  id: string;
  /** API root, e.g. "https://www.lareferencia.info/vufind/api/v1". */
  api: string;
  /** Venue shown when a record names none. */
  fallbackVenue: string;
  /** Record page for an id, used when a record carries no link. */
  recordUrl: (id: string) => string;
}

interface VufindRecord {
  id?: string;
  title?: string;
  authors?: { primary?: Record<string, unknown>; secondary?: Record<string, unknown>; corporate?: Record<string, unknown> | unknown[] };
  publicationDates?: string[];
  urls?: { url?: string }[];
  summary?: string[];
  formats?: string[];
  /** Lists of heading parts on some portals, plain strings on others. */
  subjects?: (string | string[])[];
  dois?: string[];
}

const FIELDS = ["id", "title", "authors", "publicationDates", "urls", "summary", "formats", "subjects", "dois"];

/** Readable labels for VuFind format codes, used as the venue of theses. */
const FORMATS: Record<string, string> = {
  masterThesis: "Master's thesis",
  doctoralThesis: "Doctoral thesis",
  bachelorThesis: "Bachelor's thesis",
  book: "Book",
  bookPart: "Book chapter",
  conferenceObject: "Conference paper",
  report: "Report",
};

export function vufindAdapter(cfg: VufindConfig): Adapter {
  return async (query: string, opts: AdapterOptions = {}): Promise<Paper[]> => {
    const { fromYear, perSource = 15 } = opts;

    const params = new URLSearchParams({ lookfor: query, limit: String(perSource) });
    for (const f of FIELDS) params.append("field[]", f);
    if (fromYear && fromYear > 0) params.append("filter[]", `publishDate:"[${fromYear} TO *]"`);

    const res = await fetchWithTimeout(`${cfg.api}/search?${params}`, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await safeJson<{ records?: VufindRecord[] }>(res);

    const papers: Paper[] = [];
    for (const r of data?.records ?? []) {
      if (!r.title) continue;
      const title = stripHtml(r.title);
      const doi = extractDoi(r.dois?.[0]) ?? (r.urls ?? []).map((u) => extractDoi(u.url)).find(Boolean) ?? null;
      // A repository link is the free copy; the portal's own record page is only a catalogue entry.
      const link = r.urls?.find((u) => u.url && /^https?:/i.test(u.url))?.url ?? null;
      const people = [...Object.keys(r.authors?.primary ?? {}), ...Object.keys(r.authors?.secondary ?? {})];
      const format = r.formats?.[0];

      papers.push({
        id: paperId(doi, title),
        title,
        authors: people.map(flipName).slice(0, 10),
        year: Number(r.publicationDates?.[0]?.slice(0, 4)) || null,
        venue: (format && FORMATS[format]) || cfg.fallbackVenue,
        doi,
        abstract: r.summary?.[0] ? stripHtml(r.summary[0]) : null,
        // These portals index open repositories; the link is the repository copy.
        openAccessUrl: link,
        isOpenAccess: !!link,
        keywords: (r.subjects ?? [])
          .map((s) => (Array.isArray(s) ? s.join(" ") : typeof s === "string" ? s : ""))
          .filter(Boolean)
          .slice(0, 5),
        url: r.id ? cfg.recordUrl(r.id) : link,
        sources: [cfg.id],
      });
    }
    return papers;
  };
}

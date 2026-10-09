import { fetchWithTimeout, paperId } from "@/lib/utils";
import { USER_AGENT } from "@/lib/server/config";
import { decodeEntities, flipName, stripHtml } from "@/lib/text";
import type { Paper } from "@/lib/types";
import type { Adapter, AdapterOptions } from "@/lib/sources/types";

/**
 * Shared client for DSpace 5 and 6 repositories, which predate the DSpace 7
 * REST search (see dspace7.ts) but all answer the same OpenSearch feed.
 * Many Philippine university and agency repositories still run these
 * versions. The feed gives title, authors, date and a summary; the summary
 * repeats the title and author lines before the abstract, so those are cut.
 * Docs: https://wiki.lyrasis.org/display/DSDOC6x/OpenSearch+Support
 */

export interface Dspace6Config {
  /** Source id, as in lib/sources/meta.ts. */
  id: string;
  /** Site root, e.g. "https://repository.seafdec.org.ph". */
  base: string;
  /** Venue shown on every record; the feed names no journal or publisher. */
  publisher: string;
  /**
   * True if everything in the repository is free to read. Otherwise the
   * feed can't tell, and the record page says whether the files are open.
   */
  allOpen?: boolean;
  /** Fetch timeout; some of these servers are slow. */
  timeoutMs?: number;
}

const tag = (xml: string, name: string): string | null => {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return m ? decodeEntities(m[1]).trim() : null;
};

/** "Family, Given; Family, Given" — a contributor line, not abstract text. */
const isNameList = (line: string) =>
  line.length < 500 && line.split(";").every((part) => part.includes(",") && part.trim().length < 80);

/** The abstract part of a feed summary: everything after the title and name lines. */
export function dspace6Abstract(summary: string | null, title: string, authors: string[]): string | null {
  if (!summary) return null;
  const lines = summary.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let i = 0;
  if (lines[i] && stripHtml(lines[i]) === title) i++;
  while (lines[i] && (authors.includes(lines[i]) || isNameList(lines[i]))) i++;
  const rest = stripHtml(lines.slice(i).join(" "));
  return rest || null;
}

export function dspace6Adapter(cfg: Dspace6Config): Adapter {
  return async (query: string, opts: AdapterOptions = {}): Promise<Paper[]> => {
    const { fromYear, perSource = 15 } = opts;

    // Words are ANDed. The year range goes into the Solr query itself, as the
    // feed has no separate date filter.
    const q = fromYear && fromYear > 0
      ? `${query} AND dateIssued.year:[${fromYear} TO ${new Date().getFullYear() + 1}]`
      : query;
    const params = new URLSearchParams({ query: q, rpp: String(perSource), format: "atom" });

    const res = await fetchWithTimeout(
      `${cfg.base}/open-search/discover?${params}`,
      { headers: { "User-Agent": USER_AGENT, Accept: "application/atom+xml" } },
      cfg.timeoutMs ?? 10000
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    if (!xml.includes("<feed")) throw new Error("not an OpenSearch feed");

    const papers: Paper[] = [];
    for (const [, entry] of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
      const rawTitle = tag(entry, "title");
      if (!rawTitle) continue;
      const title = stripHtml(rawTitle);
      const authors = [...entry.matchAll(/<author>\s*<name>([\s\S]*?)<\/name>/g)].map((m) => decodeEntities(m[1]).trim());
      const date = tag(entry, "published") ?? tag(entry, "dc:date");
      const year = date ? Number(date.slice(0, 4)) || null : null;
      if (fromYear && year && year < fromYear) continue;
      const href = entry.match(/<link href="([^"]+)"/)?.[1] ?? tag(entry, "id");
      const link = href ? href.replace(/^http:\/\/hdl\.handle\.net/, "https://hdl.handle.net") : null;

      papers.push({
        id: paperId(null, title),
        title,
        authors: authors.map(flipName).slice(0, 10),
        year,
        publishedDate: date?.slice(0, 10) ?? null,
        venue: cfg.publisher,
        doi: null,
        abstract: dspace6Abstract(tag(entry, "summary"), title, authors),
        openAccessUrl: cfg.allOpen ? link : null,
        isOpenAccess: !!cfg.allOpen,
        keywords: [],
        url: link,
        sources: [cfg.id],
      });
    }
    return papers;
  };
}

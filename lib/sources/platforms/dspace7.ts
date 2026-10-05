import { fetchWithTimeout, safeJson, paperId } from "@/lib/utils";
import { USER_AGENT } from "@/lib/config";
import { flipName, stripHtml } from "@/lib/text";
import type { Paper } from "@/lib/types";
import type { Adapter, AdapterOptions } from "@/lib/sources/types";

/**
 * Shared client for DSpace 7+ repositories (the software behind WHO IRIS,
 * the World Bank Open Knowledge Repository, CGSpace and many university
 * repositories). They all answer the same discovery API; only the base URL
 * and a few defaults differ, so each repository's adapter is one call to
 * dspace7Adapter().
 * Docs: https://github.com/DSpace/RestContract/blob/main/search-endpoint.md
 */

export interface Dspace7Config {
  /** Source id, as in lib/sources/meta.ts. */
  id: string;
  /** API root, e.g. "https://iris.who.int/server/api". */
  api: string;
  /** Venue shown when a record names no journal or publisher. */
  publisher: string;
  /**
   * True if everything in the repository is free to read (WHO, World Bank).
   * Otherwise a record counts as open only when it says so.
   */
  allOpen: boolean;
  /** Fetch timeout; some of these servers are slow. */
  timeoutMs?: number;
  /**
   * Extra discovery filters sent with every search, as [facet, value] pairs,
   * e.g. ["itemtype", "Speeches,notequals"] to leave out a record type.
   */
  filters?: [string, string][];
  /**
   * ISO 639-1 code. Records tagged with another language are dropped, for
   * repositories that hold each document once per language.
   */
  language?: string;
}

type Metadata = Record<string, { value?: string }[] | undefined>;

interface DspaceItem {
  name?: string;
  handle?: string;
  withdrawn?: boolean;
  metadata?: Metadata;
}

interface DiscoverResponse {
  _embedded?: {
    searchResult?: {
      _embedded?: { objects?: { _embedded?: { indexableObject?: DspaceItem } }[] };
    };
  };
}

/** Values of the first key that has any (repositories name fields differently). */
function values(m: Metadata, ...keys: string[]): string[] {
  for (const k of keys) {
    const v = (m[k] ?? []).map((x) => x.value?.trim() ?? "").filter(Boolean);
    if (v.length) return v;
  }
  return [];
}
const first = (m: Metadata, ...keys: string[]) => values(m, ...keys)[0] ?? null;

export function dspace7Adapter(cfg: Dspace7Config): Adapter {
  return async (query: string, opts: AdapterOptions = {}): Promise<Paper[]> => {
    const { fromYear, perSource = 15, openAccessOnly } = opts;

    const params = new URLSearchParams({ query, size: String(perSource), dsoType: "ITEM" });
    if (fromYear && fromYear > 0) {
      params.set("f.dateIssued", `[${fromYear} TO ${new Date().getFullYear() + 1}],equals`);
    }
    for (const [facet, value] of cfg.filters ?? []) params.append(`f.${facet}`, value);

    const res = await fetchWithTimeout(
      `${cfg.api}/discover/search/objects?${params}`,
      { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } },
      cfg.timeoutMs ?? 10000
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await safeJson<DiscoverResponse>(res);
    const objects = data?._embedded?.searchResult?._embedded?.objects ?? [];

    const papers: Paper[] = [];
    for (const o of objects) {
      const it = o._embedded?.indexableObject;
      if (!it || it.withdrawn) continue;
      const m = it.metadata ?? {};
      const lang = first(m, "dc.language.iso");
      if (cfg.language && lang && lang !== cfg.language) continue;

      const title = first(m, "dc.title") ?? it.name;
      if (!title) continue;
      const date = first(m, "dc.date.issued", "dcterms.issued");
      const year = date ? Number(date.slice(0, 4)) || null : null;
      if (fromYear && year && year < fromYear) continue;

      const doi = first(m, "dc.identifier.doi", "cg.identifier.doi", "okr.identifier.doi");
      const landing = first(m, "dc.identifier.uri") ?? (it.handle ? `https://hdl.handle.net/${it.handle}` : null);
      const access = first(m, "dcterms.accessRights", "dc.rights.accessRights")?.toLowerCase() ?? "";
      const isOpen = cfg.allOpen || access.includes("open");
      if (openAccessOnly && !isOpen) continue;

      papers.push({
        id: paperId(doi, title),
        title: stripHtml(title),
        authors: values(m, "dc.contributor.author", "dc.creator").map(flipName).slice(0, 10),
        year,
        publishedDate: date,
        venue:
          first(m, "dc.relation.ispartof", "dcterms.isPartOf", "cg.journal", "dc.source") ??
          first(m, "dc.publisher", "dcterms.publisher") ??
          cfg.publisher,
        doi,
        abstract: (() => {
          const a = first(m, "dc.description.abstract", "dcterms.abstract");
          return a ? stripHtml(a) : null;
        })(),
        openAccessUrl: isOpen ? landing : null,
        isOpenAccess: isOpen,
        keywords: values(m, "dc.subject", "dcterms.subject").slice(0, 5),
        url: landing,
        sources: [cfg.id],
      });
    }
    return papers;
  };
}

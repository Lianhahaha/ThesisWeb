import { paperId } from "@/lib/utils";
import { fetchWithTimeout, readJson } from "@/lib/server/http";
import { USER_AGENT } from "@/lib/server/config";
import { extractDoi, flipName, stripHtml } from "@/lib/text";
import type { Paper, WorkType } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * The USDA National Agricultural Library's shared Primo index. PubAg covers
 * peer-reviewed agricultural literature; AGRICOLA adds the NAL catalogue and
 * older grey literature. Both answer the same public JSON endpoint, so one
 * parser serves both sources.
 * https://pubag.nal.usda.gov and https://search.nal.usda.gov
 */

const BASE = "https://search.nal.usda.gov/primaws/rest/pub/pnxs";

interface NalDoc {
  pnx?: {
    display?: Record<string, string[]>;
    addata?: Record<string, string[]>;
    control?: Record<string, string[]>;
  };
}

const first = (m: Record<string, string[]> | undefined, ...keys: string[]): string | null => {
  for (const key of keys) {
    const v = m?.[key]?.find((x) => x?.trim());
    if (v) return v.trim();
  }
  return null;
};

function nalType(genre: string | null): WorkType | undefined {
  const t = genre?.toLowerCase() ?? "";
  if (/thesis|dissertation/.test(t)) return "thesis";
  if (/chapter/.test(t)) return "chapter";
  if (/book/.test(t)) return "book";
  if (/conference|proceeding/.test(t)) return "conference";
  if (/report/.test(t)) return "report";
  if (/article|journal/.test(t)) return "article";
  return undefined;
}

/** Map one Primo record list to papers. Exported for tests. */
export function parseNalDocs(docs: NalDoc[], id: "pubag" | "agricola"): Paper[] {
  const papers: Paper[] = [];
  const maxYear = new Date().getFullYear() + 1;

  for (const doc of docs) {
    const addata = doc.pnx?.addata;
    const display = doc.pnx?.display;
    const title = first(addata, "atitle") ?? first(display, "title") ?? first(addata, "title");
    if (!title) continue;

    const rawDate = first(addata, "date", "dateissued") ?? first(display, "creationdate");
    const rawYear = rawDate ? Number(rawDate.slice(0, 4)) : null;
    const year = rawYear && rawYear >= 1000 && rawYear <= maxYear ? rawYear : null;

    const doi = extractDoi(first(addata, "doi"));
    const recordId = doc.pnx?.control?.recordid?.[0];
    const url =
      first(addata, "url") ??
      (recordId
        ? `https://search.nal.usda.gov/discovery/fulldisplay?docid=${encodeURIComponent(recordId)}&context=L&vid=01NAL_INST:MAIN`
        : null);

    papers.push({
      id: paperId(doi, title),
      title: stripHtml(title),
      authors: [...(addata?.au ?? []), ...(addata?.addau ?? [])]
        .map(flipName)
        .filter(Boolean)
        .slice(0, 10),
      year,
      venue: stripHtml(first(addata, "jtitle") ?? first(display, "ispartof") ?? "USDA National Agricultural Library"),
      type: nalType(first(addata, "genre") ?? first(display, "type")),
      doi,
      abstract: (() => {
        const a = first(addata, "abstract") ?? first(display, "description");
        return a ? stripHtml(a) : null;
      })(),
      openAccessUrl: null,
      isOpenAccess: false,
      keywords: (display?.subject ?? []).slice(0, 5),
      url,
      sources: [id],
    });
  }
  return papers;
}

function searchNal(id: "pubag" | "agricola", scope: string) {
  return async (query: string, opts: AdapterOptions = {}): Promise<Paper[]> => {
    const { fromYear, perSource = 15 } = opts;
    const params = new URLSearchParams({
      blendFacetsSeparately: "false",
      disableCache: "false",
      getMore: "0",
      inst: "01NAL_INST",
      lang: "en",
      limit: String(Math.min(Math.max(perSource, 1), 50)),
      mode: "Basic",
      offset: "0",
      pcAvailability: "false",
      q: `any,contains,${query}`,
      qExclude: "",
      qInclude: "",
      refEntryActive: "false",
      rtaLinks: "true",
      scope,
      skipDelivery: "Y",
      sort: "rank",
      tab: "MAIN",
      vid: "01NAL_INST:MAIN",
    });

    const res = await fetchWithTimeout(
      `${BASE}?${params}`,
      { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } },
      15000
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await readJson<{ docs?: NalDoc[] }>(res);
    return parseNalDocs(data?.docs ?? [], id).filter(
      (p) => !(fromYear && fromYear > 0 && p.year != null && p.year < fromYear)
    );
  };
}

export const searchPubag = searchNal("pubag", "pubag");
export const searchAgricola = searchNal("agricola", "agricola");

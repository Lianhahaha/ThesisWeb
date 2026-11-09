import { paperId } from "@/lib/utils";
import { fetchWithTimeout, readJson } from "@/lib/server/http";
import { USER_AGENT } from "@/lib/server/config";
import { stripHtml } from "@/lib/text";
import type { Paper } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * Europeana: European cultural heritage from museums, libraries and archives:
 * books, newspapers, manuscripts, images and sound recordings. A free API key
 * is required; the demo key is only for testing.
 * Docs: https://europeana.atlassian.net/wiki/spaces/EF/pages/2326528056/API+keys
 */

const BASE = "https://api.europeana.eu/record/v2/search.json";

interface EuropeanaItem {
  title?: string[];
  dcCreator?: string[];
  year?: string[];
  guid?: string;
  dcDescription?: string[];
  dataProvider?: string[];
  type?: string;
}

interface EuropeanaResponse {
  items?: EuropeanaItem[];
}

const first = (v: string[] | undefined): string | null => v?.find((x) => x?.trim()) ?? null;

/** Map Europeana items to records. Exported for tests. */
export function parseEuropeana(data: EuropeanaResponse): Paper[] {
  const papers: Paper[] = [];
  const maxYear = new Date().getFullYear() + 1;

  for (const item of data?.items ?? []) {
    const title = first(item.title);
    if (!title) continue;
    const rawYear = first(item.year)?.match(/\d{4}/)?.[0];
    const year = rawYear && Number(rawYear) <= maxYear ? Number(rawYear) : null;

    papers.push({
      id: paperId(null, title),
      title: stripHtml(title),
      authors: (item.dcCreator ?? []).filter(Boolean).slice(0, 10),
      year,
      venue: first(item.dataProvider) ?? "Europeana",
      type: "other",
      doi: null,
      abstract: first(item.dcDescription) ? stripHtml(first(item.dcDescription)!) : null,
      openAccessUrl: null,
      isOpenAccess: false,
      keywords: item.type ? [item.type] : [],
      url: item.guid ?? null,
      sources: ["europeana"],
    });
  }
  return papers;
}

export async function searchEuropeana(query: string, opts: AdapterOptions = {}): Promise<Paper[]> {
  const key = process.env.EUROPEANA_API_KEY?.trim();
  if (!key) return [];
  const { fromYear, perSource = 15 } = opts;
  const params = new URLSearchParams({
    query,
    rows: String(Math.max(1, perSource)),
    profile: "standard",
    wskey: key,
  });

  const res = await fetchWithTimeout(
    `${BASE}?${params}`,
    { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } },
    12000
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return parseEuropeana(await readJson<EuropeanaResponse>(res)).filter(
    (p) => !(fromYear && fromYear > 0 && p.year != null && p.year < fromYear)
  );
}

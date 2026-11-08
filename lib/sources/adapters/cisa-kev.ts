import { paperId } from "@/lib/utils";
import { fetchWithTimeout, readJson } from "@/lib/server/http";
import { USER_AGENT } from "@/lib/server/config";
import { stripHtml } from "@/lib/text";
import type { Paper } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * CISA Known Exploited Vulnerabilities (KEV) catalog: CVEs confirmed exploited
 * in the wild, with the required remediation action. The whole feed is one
 * public JSON file, cached here for six hours and filtered locally by keyword.
 *
 * Free, no API key. https://www.cisa.gov/known-exploited-vulnerabilities-catalog
 */

const FEED = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";
const CACHE_MS = 6 * 60 * 60 * 1000;

interface Kev {
  cveID?: string;
  vendorProject?: string;
  product?: string;
  vulnerabilityName?: string;
  dateAdded?: string;
  shortDescription?: string;
  requiredAction?: string;
  knownRansomwareCampaignUse?: string;
}

let cache: { at: number; items: Kev[] } | null = null;

async function feed(): Promise<Kev[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.items;
  const res = await fetchWithTimeout(FEED, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } }, 16000);
  if (!res.ok) throw new Error(`CISA KEV ${res.status}`);
  const data = await readJson<{ vulnerabilities?: Kev[] }>(res);
  const items = data?.vulnerabilities ?? [];
  cache = { at: Date.now(), items };
  return items;
}

function yearOf(date: string | undefined): number | null {
  const m = date?.match(/^(\d{4})/);
  return m ? Number(m[1]) : null;
}

export async function searchCisaKev(query: string, opts: AdapterOptions = {}): Promise<Paper[]> {
  const { fromYear, perSource = 15 } = opts;
  const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 1);
  if (terms.length === 0) return [];

  const items = await feed();
  const papers: Paper[] = [];
  for (const v of items) {
    const id = v.cveID;
    if (!id) continue;
    const haystack = `${id} ${v.vendorProject ?? ""} ${v.product ?? ""} ${v.vulnerabilityName ?? ""} ${v.shortDescription ?? ""}`.toLowerCase();
    if (!terms.every((t) => haystack.includes(t))) continue;
    const year = yearOf(v.dateAdded);
    if (fromYear && year && year < fromYear) continue;

    papers.push({
      id: paperId(null, id),
      title: `${id}: ${stripHtml(v.vulnerabilityName ?? "Known exploited vulnerability").slice(0, 300)}`,
      authors: [],
      year,
      publishedDate: v.dateAdded ?? null,
      venue: "CISA KEV Catalog",
      type: "report",
      publisher: "CISA",
      doi: null,
      abstract: v.shortDescription ? stripHtml(v.shortDescription) : null,
      openAccessUrl: `https://nvd.nist.gov/vuln/detail/${id}`,
      isOpenAccess: true,
      url: `https://nvd.nist.gov/vuln/detail/${id}`,
      keywords: [v.vendorProject, v.product, v.knownRansomwareCampaignUse === "Known" ? "ransomware" : null]
        .filter((x): x is string => !!x)
        .slice(0, 5),
      sources: ["cisakev"],
    });
    if (papers.length >= perSource) break;
  }
  return papers;
}

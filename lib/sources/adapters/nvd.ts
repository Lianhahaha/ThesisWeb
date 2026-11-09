import { paperId } from "@/lib/utils";
import { fetchWithTimeout, readJson } from "@/lib/server/http";
import { USER_AGENT } from "@/lib/server/config";
import { stripHtml } from "@/lib/text";
import type { Paper } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * NVD (National Vulnerability Database, NIST): CVE records for software and
 * hardware vulnerabilities, with descriptions, severity metrics, CWE classes
 * and references. Primary technical material for cybersecurity students.
 *
 * Free, no API key (rate-limited). Docs: https://nvd.nist.gov/developers/vulnerabilities
 */

const BASE = "https://services.nvd.nist.gov/rest/json/cves/2.0";

interface Cve {
  id?: string;
  published?: string;
  descriptions?: { lang?: string; value?: string }[];
  weaknesses?: { description?: { value?: string }[] }[];
}

function yearOf(date: string | undefined): number | null {
  const m = date?.match(/^(\d{4})/);
  return m ? Number(m[1]) : null;
}

export async function searchNvd(query: string, opts: AdapterOptions = {}): Promise<Paper[]> {
  const { fromYear, perSource = 15 } = opts;
  const params = new URLSearchParams({
    keywordSearch: query,
    resultsPerPage: String(Math.min(perSource * 2, 50)),
  });
  // NVD rejects a pubStartDate/pubEndDate range wider than 120 days with a
  // bare 404. Filter by year after parsing instead of asking NVD for the range.

  const res = await fetchWithTimeout(`${BASE}?${params}`, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } }, 15000);
  if (!res.ok) throw new Error(`NVD ${res.status}`);
  const data = await readJson<{ vulnerabilities?: { cve?: Cve }[] }>(res);

  const papers: Paper[] = [];
  for (const item of data?.vulnerabilities ?? []) {
    const cve = item.cve;
    const id = cve?.id;
    const description = cve?.descriptions?.find((d) => d.lang === "en")?.value;
    if (!id || !description) continue;
    const year = yearOf(cve.published);
    if (fromYear && year && year < fromYear) continue;
    const summary = stripHtml(description);
    const weakness = (cve.weaknesses ?? [])
      .flatMap((w) => w.description ?? [])
      .map((d) => d.value ?? "")
      .filter(Boolean);

    papers.push({
      id: paperId(null, id),
      title: `${id}: ${summary.slice(0, 300)}`,
      authors: [],
      year,
      publishedDate: cve.published?.slice(0, 10) ?? null,
      venue: "NVD (NIST)",
      type: "report",
      publisher: "NIST",
      doi: null,
      abstract: summary,
      openAccessUrl: `https://nvd.nist.gov/vuln/detail/${id}`,
      isOpenAccess: true,
      url: `https://nvd.nist.gov/vuln/detail/${id}`,
      keywords: ["CVE", ...weakness].slice(0, 8),
      sources: ["nvd"],
    });
    if (papers.length >= perSource) break;
  }
  return papers;
}

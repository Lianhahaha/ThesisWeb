import { paperId } from "@/lib/utils";
import { fetchWithTimeout, readJson } from "@/lib/server/http";
import { USER_AGENT } from "@/lib/server/config";
import type { Paper } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * SEC EDGAR full-text search: annual, quarterly and current reports, proxy
 * statements and other U.S. corporate filings. For business, finance,
 * accounting and governance research these are primary sources that journal
 * indexes do not carry.
 *
 * Free, no API key; the SEC asks every client to identify itself, which
 * USER_AGENT does. Docs: https://www.sec.gov/edgar/sec-api-documentation
 */

const BASE = "https://efts.sec.gov/LATEST/search-index";

interface FilingSource {
  ciks?: string[];
  display_names?: string[];
  form?: string;
  file_date?: string;
  file_type?: string;
  adsh?: string;
}

function yearOf(date: string | undefined): number | null {
  const m = date?.match(/^(\d{4})/);
  return m ? Number(m[1]) : null;
}

export async function searchSecEdgar(query: string, opts: AdapterOptions = {}): Promise<Paper[]> {
  const { fromYear, perSource = 15 } = opts;
  const params = new URLSearchParams({ q: query });

  const res = await fetchWithTimeout(`${BASE}?${params}`, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } }, 14000);
  if (!res.ok) throw new Error(`SEC EDGAR ${res.status}`);
  const data = await readJson<{ hits?: { hits?: { _source?: FilingSource }[] } }>(res);

  const papers: Paper[] = [];
  for (const hit of data?.hits?.hits ?? []) {
    const s = hit._source;
    const company = s?.display_names?.[0]?.replace(/\s+\(CIK\s+\d+\)\s*$/, "").trim();
    const adsh = s?.adsh;
    if (!company || !adsh) continue;
    const year = yearOf(s.file_date);
    if (fromYear && year && year < fromYear) continue;

    const cik = s.ciks?.[0]?.replace(/^0+/, "");
    const url =
      cik && adsh
        ? `https://www.sec.gov/Archives/edgar/data/${cik}/${adsh.replace(/-/g, "")}-index.htm`
        : null;
    const form = s.form?.trim() || "filing";

    papers.push({
      id: paperId(null, `${adsh} ${company}`),
      title: `${company} — ${form} filing${s.file_date ? ` (${s.file_date})` : ""}`,
      authors: [company],
      year,
      publishedDate: s.file_date ?? null,
      venue: "SEC EDGAR",
      type: "report",
      publisher: company,
      doi: null,
      abstract: null,
      openAccessUrl: url,
      // SEC filings are public documents.
      isOpenAccess: true,
      url,
      keywords: [form, s.file_type].filter((x): x is string => !!x).slice(0, 5),
      sources: ["secedgar"],
    });
    if (papers.length >= perSource) break;
  }
  return papers;
}

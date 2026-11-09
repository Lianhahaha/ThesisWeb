import { paperId } from "@/lib/utils";
import { fetchWithTimeout, readJson } from "@/lib/server/http";
import { USER_AGENT } from "@/lib/server/config";
import { stripHtml } from "@/lib/text";
import type { Paper } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * CTIS, the EU Clinical Trials Information System: authorised trials under
 * the EU Clinical Trials Regulation (2022 onwards), with status, sponsor,
 * conditions, phase and participating countries. The public JSON search is
 * keyless and documented only by the portal's own frontend.
 * https://euclinicaltrials.eu/ctis-public/search
 */

const BASE = "https://euclinicaltrials.eu/ctis-public-api";

interface CtisTrial {
  ctNumber?: string;
  ctTitle?: string;
  shortTitle?: string;
  conditions?: string;
  sponsor?: string;
  trialPhase?: string;
  decisionDateOverall?: string;
  therapeuticAreas?: string[];
  trialCountries?: string[];
}

const yearFrom = (date: string | undefined): number | null => {
  if (!date) return null;
  const m = date.match(/(\d{4})/);
  const year = m ? Number(m[1]) : null;
  return year && year >= 1000 && year <= new Date().getFullYear() + 1 ? year : null;
};

/** Map the API's trials to records. Exported for tests. */
export function parseCtis(data: { data?: CtisTrial[] }): Paper[] {
  const papers: Paper[] = [];
  for (const t of data?.data ?? []) {
    const title = (t.ctTitle || t.shortTitle || "").trim();
    if (!title || !t.ctNumber) continue;

    const url = `https://euclinicaltrials.eu/ctis-public/view/${t.ctNumber}`;
    const summary = [
      t.conditions ? `Conditions: ${t.conditions}` : null,
      t.trialPhase ? `Phase: ${t.trialPhase}` : null,
      t.sponsor ? `Sponsor: ${t.sponsor}` : null,
      t.trialCountries?.length ? `Countries: ${t.trialCountries.join(", ")}` : null,
    ]
      .filter(Boolean)
      .join(" ");

    papers.push({
      id: paperId(null, title),
      title: stripHtml(title),
      authors: [],
      year: yearFrom(t.decisionDateOverall),
      venue: "CTIS (EU)",
      type: "report",
      doi: null,
      abstract: summary || null,
      openAccessUrl: null,
      isOpenAccess: false,
      keywords: (t.therapeuticAreas ?? []).slice(0, 5),
      url,
      sources: ["ctis"],
    });
  }
  return papers;
}

export async function searchCtis(query: string, opts: AdapterOptions = {}): Promise<Paper[]> {
  const { fromYear, perSource = 15 } = opts;
  const body = {
    pagination: { page: 1, size: Math.min(Math.max(perSource, 1), 50) },
    sort: { property: "decisionDate", direction: "DESC" },
    searchCriteria: { containAll: query, containAny: null, containNot: null },
  };

  const res = await fetchWithTimeout(
    `${BASE}/search`,
    {
      method: "POST",
      headers: { "User-Agent": USER_AGENT, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    },
    15000
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return parseCtis(await readJson<{ data?: CtisTrial[] }>(res)).filter(
    (p) => !(fromYear && fromYear > 0 && p.year != null && p.year < fromYear)
  );
}

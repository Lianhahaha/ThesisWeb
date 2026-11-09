import { paperId } from "@/lib/utils";
import { fetchWithTimeout, readText } from "@/lib/server/http";
import { USER_AGENT } from "@/lib/server/config";
import { stripHtml } from "@/lib/text";
import type { Paper } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * EU Clinical Trials Register (EudraCT): trials authorised in the EU/EEA
 * before CTIS took over, with sponsor, condition, population, start date and
 * results links. The search page is server-rendered HTML.
 * https://www.clinicaltrialsregister.eu
 */

const BASE = "https://www.clinicaltrialsregister.eu";
const SEARCH = `${BASE}/ctr-search/search`;

const field = (part: string, label: string): string | null => {
  const m = part.match(
    new RegExp(`<span class="label">${label}(?:<span[^>]*>[\\s\\S]*?</span>)?:\\s*</span>\\s*([\\s\\S]*?)</td>`, "i")
  );
  return m ? stripHtml(m[1]) || null : null;
};

/** Parse the server-rendered result tables. Exported for tests. */
export function parseEuCtr(html: string): Paper[] {
  const papers: Paper[] = [];
  const maxYear = new Date().getFullYear() + 1;

  for (const part of html.split('<table class="result">').slice(1)) {
    const id = part.match(/name="enchx" value="([^"]+)"/)?.[1];
    const title = field(part, "Full Title");
    if (!id || !title) continue;

    const start = field(part, "Start Date");
    const rawYear = start ? Number(start.slice(0, 4)) : null;
    const year = rawYear && rawYear >= 1000 && rawYear <= maxYear ? rawYear : null;
    const sponsor = field(part, "Sponsor Name");
    const condition = field(part, "Medical condition");
    const age = field(part, "Population Age");
    const link = part.match(/href="(\/ctr-search\/trial\/[^"]+)"/)?.[1];
    const url = link ? `${BASE}${link}` : `${BASE}/ctr-search/trial/${id}/`;

    const summary = [
      condition ? `Conditions: ${condition}` : null,
      sponsor ? `Sponsor: ${sponsor}` : null,
      age ? `Population: ${age}` : null,
    ]
      .filter(Boolean)
      .join(" ");

    papers.push({
      id: paperId(null, title),
      title,
      authors: [],
      year,
      venue: "EU Clinical Trials Register",
      type: "report",
      doi: null,
      abstract: summary || null,
      openAccessUrl: null,
      isOpenAccess: false,
      keywords: condition ? [condition] : [],
      url,
      sources: ["euctr"],
    });
  }
  return papers;
}

export async function searchEuCtr(query: string, opts: AdapterOptions = {}): Promise<Paper[]> {
  const { fromYear, perSource = 15 } = opts;
  const params = new URLSearchParams({ query });
  const res = await fetchWithTimeout(
    `${SEARCH}?${params}`,
    { headers: { "User-Agent": USER_AGENT, Accept: "text/html" } },
    15000
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return parseEuCtr(await readText(res))
    .filter((p) => !(fromYear && fromYear > 0 && p.year != null && p.year < fromYear))
    .slice(0, Math.max(1, perSource));
}

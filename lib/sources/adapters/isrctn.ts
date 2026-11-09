import { paperId } from "@/lib/utils";
import { fetchWithTimeout, readText } from "@/lib/server/http";
import { USER_AGENT } from "@/lib/server/config";
import { decodeEntities, extractDoi, stripHtml } from "@/lib/text";
import type { Paper } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * ISRCTN registry: the UK-based international register of randomised
 * controlled trials, with status, sponsor, conditions, interventions and
 * outcomes. Metadata is CC0 and a WHO-compatible XML feed is public.
 * https://www.isrctn.com
 */

const BASE = "https://isrctn.com/api/query/format/default";

const tag = (xml: string, name: string): string | null => {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return m ? stripHtml(decodeEntities(m[1])) || null : null;
};

/** Parse the registry's XML feed. Exported for tests. */
export function parseIsrctn(xml: string): Paper[] {
  const papers: Paper[] = [];
  const maxYear = new Date().getFullYear() + 1;

  for (const [, trial] of xml.matchAll(/<fullTrial>([\s\S]*?)<\/fullTrial>/g)) {
    const canonical = trial.match(/publicIdentifierCanonical="([^"]+)"/)?.[1];
    const title = tag(trial, "title") ?? tag(trial, "scientificTitle");
    if (!canonical || !title) continue;

    const assigned = trial.match(/publicIdentifierDateAssigned="([^"]+)"/)?.[1]
      ?? trial.match(/lastUpdated="([^"]+)"/)?.[1];
    const rawYear = assigned ? Number(assigned.slice(0, 4)) : null;
    const year = rawYear && rawYear >= 1000 && rawYear <= maxYear ? rawYear : null;
    const url = `https://www.isrctn.com/${canonical}`;
    const doi = extractDoi(tag(trial, "doi"));
    const conditions = [...trial.matchAll(/<condition[^>]*>([\s\S]*?)<\/condition>/g)]
      .map((m) => stripHtml(decodeEntities(m[1])))
      .filter(Boolean)
      .slice(0, 5);

    papers.push({
      id: paperId(doi, title),
      title,
      authors: [],
      year,
      venue: "ISRCTN Registry",
      type: "report",
      doi,
      abstract: tag(trial, "plainEnglishSummary") ?? tag(trial, "studyHypothesis"),
      openAccessUrl: null,
      isOpenAccess: false,
      keywords: conditions,
      url,
      sources: ["isrctn"],
    });
  }
  return papers;
}

export async function searchIsrctn(query: string, opts: AdapterOptions = {}): Promise<Paper[]> {
  const { fromYear, perSource = 15 } = opts;
  const params = new URLSearchParams({ q: query, limit: String(Math.max(1, perSource)) });

  const res = await fetchWithTimeout(
    `${BASE}?${params}`,
    { headers: { "User-Agent": USER_AGENT, Accept: "application/xml" } },
    12000
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return parseIsrctn(await readText(res)).filter(
    (p) => !(fromYear && fromYear > 0 && p.year != null && p.year < fromYear)
  );
}

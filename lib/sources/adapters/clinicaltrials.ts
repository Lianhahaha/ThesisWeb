import { paperId } from "@/lib/utils";
import { fetchWithTimeout, readJson } from "@/lib/server/http";
import { USER_AGENT } from "@/lib/server/config";
import { stripHtml } from "@/lib/text";
import type { Paper } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * ClinicalTrials.gov (U.S. National Library of Medicine): the world's largest
 * registry of clinical studies. Trials are not journal articles, but for
 * medicine, nursing and public health they are often the most direct evidence
 * that a study exists, and many trials have no matching paper yet.
 *
 * Free, no API key. Docs: https://clinicaltrials.gov/data-api/api
 */

const BASE = "https://clinicaltrials.gov/api/v2/studies";

interface Study {
  protocolSection?: {
    identificationModule?: { nctId?: string; briefTitle?: string; officialTitle?: string };
    statusModule?: { startDateStruct?: { date?: string } };
    descriptionModule?: { briefSummary?: string };
    sponsorCollaboratorsModule?: { leadSponsor?: { name?: string } };
    conditionsModule?: { conditions?: string[] };
    armsInterventionsModule?: { interventions?: { name?: string }[] };
  };
}

function yearOf(date: string | undefined): number | null {
  const m = date?.match(/^(\d{4})/);
  return m ? Number(m[1]) : null;
}

export async function searchClinicalTrials(query: string, opts: AdapterOptions = {}): Promise<Paper[]> {
  const { fromYear, perSource = 15 } = opts;
  const params = new URLSearchParams({
    "query.term": query,
    pageSize: String(Math.min(perSource * 2, 50)),
  });

  const res = await fetchWithTimeout(`${BASE}?${params}`, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } }, 12000);
  if (!res.ok) throw new Error(`ClinicalTrials.gov ${res.status}`);
  const data = await readJson<{ studies?: Study[] }>(res);

  const papers: Paper[] = [];
  for (const s of data?.studies ?? []) {
    const p = s.protocolSection;
    const nct = p?.identificationModule?.nctId;
    const rawTitle = p?.identificationModule?.briefTitle || p?.identificationModule?.officialTitle;
    if (!nct || !rawTitle) continue;
    const title = stripHtml(rawTitle);
    const start = p?.statusModule?.startDateStruct?.date;
    const year = yearOf(start);
    if (fromYear && year && year < fromYear) continue;

    const sponsor = p?.sponsorCollaboratorsModule?.leadSponsor?.name?.trim() || null;
    const conditions = (p?.conditionsModule?.conditions ?? []).filter(Boolean);
    const interventions = (p?.armsInterventionsModule?.interventions ?? []).map((i) => i.name ?? "").filter(Boolean);

    papers.push({
      // The NCT number keeps the id stable and unique even when two trials
      // share a short title.
      id: paperId(null, `${nct} ${title}`),
      title,
      authors: sponsor ? [sponsor] : [],
      year,
      publishedDate: start ?? null,
      venue: "ClinicalTrials.gov",
      type: "report",
      publisher: sponsor,
      abstract: p?.descriptionModule?.briefSummary ? stripHtml(p.descriptionModule.briefSummary) : null,
      url: `https://clinicaltrials.gov/study/${nct}`,
      isOpenAccess: false,
      keywords: [...conditions, ...interventions].slice(0, 8),
      sources: ["clinicaltrials"],
    });
    if (papers.length >= perSource) break;
  }
  return papers;
}

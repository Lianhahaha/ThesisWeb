import { paperId } from "@/lib/utils";
import { fetchWithTimeout, readJson } from "@/lib/server/http";
import { USER_AGENT } from "@/lib/server/config";
import { extractDoi } from "@/lib/text";
import type { Paper } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * OpenReview: open peer review for AI/ML conferences and workshops (ICLR,
 * NeurIPS, ICML, CoRL and many others). Search returns submitted and accepted
 * papers; accepted/reviewed venues are kept and withdrawn/rejected ones are
 * dropped.
 * Docs: https://docs.openreview.net/reference/api-v1
 */

const BASE = "https://api.openreview.net/notes/search";

interface OpenReviewNote {
  id?: string;
  forum?: string;
  invitation?: string;
  cdate?: number;
  pdate?: number;
  odate?: number;
  content?: {
    title?: string;
    authors?: string[];
    abstract?: string;
    keywords?: string[];
    venue?: string;
    venueid?: string;
    pdf?: string;
    doi?: string;
  };
}

function acceptedVenue(note: OpenReviewNote): string | null {
  const venue = note.content?.venue?.trim() ?? "";
  const venueid = note.content?.venueid?.trim() ?? "";
  const invitation = note.invitation ?? "";
  if (!venue) return null;
  const status = `${venue} ${venueid} ${invitation}`;
  if (/submitted|withdrawn|rejected|desk rejected/i.test(status)) return null;
  return venue;
}

export async function searchOpenReview(query: string, opts: AdapterOptions = {}): Promise<Paper[]> {
  const { fromYear = 0, perSource = 15 } = opts;
  const limit = Math.min(Math.max(perSource * (fromYear ? 4 : 2), 1), 100);
  const params = new URLSearchParams({
    term: query,
    limit: String(limit),
    offset: "0",
    source: "forum",
  });

  const res = await fetchWithTimeout(`${BASE}?${params}`, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await readJson<{ notes?: OpenReviewNote[] }>(res);

  const papers: Paper[] = [];
  for (const note of data?.notes ?? []) {
    const title = note.content?.title?.trim();
    const venue = acceptedVenue(note);
    if (!title || !venue) continue;

    const timestamp = note.pdate ?? note.cdate ?? note.odate;
    const date = timestamp ? new Date(timestamp) : null;
    const year = date && !Number.isNaN(date.valueOf()) ? date.getFullYear() : null;
    if (fromYear > 0 && year != null && year < fromYear) continue;

    const doi = extractDoi(note.content?.doi ?? null);
    const forum = note.forum ?? note.id;
    const page = forum ? `https://openreview.net/forum?id=${encodeURIComponent(forum)}` : null;
    const pdf = note.content?.pdf;

    papers.push({
      id: paperId(doi, title),
      title,
      authors: (note.content?.authors ?? []).map((a) => a.trim()).filter(Boolean).slice(0, 10),
      year,
      publishedDate: date && !Number.isNaN(date.valueOf()) ? date.toISOString().slice(0, 10) : null,
      venue,
      doi,
      abstract: note.content?.abstract ?? null,
      openAccessUrl: pdf ? `https://openreview.net${pdf}` : page,
      isOpenAccess: true,
      keywords: (note.content?.keywords ?? []).map((k) => k.trim()).filter(Boolean).slice(0, 5),
      url: page,
      type: "conference",
      preprint: false,
      sources: ["openreview"],
    });
    if (papers.length >= perSource) break;
  }
  return papers;
}

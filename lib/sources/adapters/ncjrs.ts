import { paperId } from "@/lib/utils";
import { fetchWithTimeout } from "@/lib/server/http";
import { USER_AGENT } from "@/lib/server/config";
import { extractYear, stripHtml } from "@/lib/text";
import type { Paper } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * NCJRS Virtual Library (U.S. National Criminal Justice Reference Service):
 * research reports, statistics, program evaluations and federal publications
 * on policing, courts, corrections, victims, drugs and crime prevention.
 * https://www.ojp.gov/ncjrs
 */

const BASE = "https://www.ojp.gov";
const SEARCH = `${BASE}/ncjrs/virtual-library/search`;

export function parseNcjrs(html: string): Paper[] {
  const papers: Paper[] = [];
  for (const block of html.split('<article class="listing-item').slice(1)) {
    const link = block.match(/<h3 class="listing-item__title">\s*<a href="([^"]+)">([\s\S]*?)<\/a>/);
    if (!link) continue;
    const title = stripHtml(link[2]);
    if (!title) continue;
    const date = block.match(/<div class="field__label">Date Published<\/div>\s*<div class="field__item">([\s\S]*?)<\/div>/);
    const agency = block.match(/<div class="field__label">Agencies<\/div>[\s\S]*?<span class="field__item">([\s\S]*?)<\/span>/);
    const pdf = block.match(/<a href="([^"]+)">Full Report \(PDF\)<\/a>/);
    const url = link[1].startsWith("http") ? link[1] : `${BASE}${link[1]}`;
    const publisher = agency ? stripHtml(agency[1]) || null : null;
    const pdfUrl = pdf ? (pdf[1].startsWith("http") ? pdf[1] : `${BASE}${pdf[1]}`) : null;

    papers.push({
      id: paperId(null, title),
      title,
      authors: [],
      year: extractYear(date ? stripHtml(date[1]) : null),
      venue: publisher ?? "NCJRS Virtual Library",
      type: "report",
      publisher,
      doi: null,
      abstract: null,
      openAccessUrl: pdfUrl,
      isOpenAccess: Boolean(pdfUrl),
      keywords: [],
      url,
      sources: ["ncjrs"],
    });
  }
  return papers;
}

export async function searchNcjrs(query: string, opts: AdapterOptions = {}): Promise<Paper[]> {
  const { fromYear, perSource = 15, openAccessOnly } = opts;
  const params = new URLSearchParams({ searchterm: query });
  const res = await fetchWithTimeout(`${SEARCH}?${params}`, { headers: { "User-Agent": USER_AGENT } }, 12000);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  if (!html.includes("listing-item")) throw new Error("unexpected page");

  return parseNcjrs(html)
    .filter((p) => !fromYear || !p.year || p.year >= fromYear)
    .filter((p) => !openAccessOnly || p.isOpenAccess)
    .slice(0, perSource);
}

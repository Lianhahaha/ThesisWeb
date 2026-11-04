import { paperId } from "@/lib/utils";
import { fetchWithTimeout } from "@/lib/server/http";
import { USER_AGENT } from "@/lib/server/config";
import { flipName, stripHtml } from "@/lib/text";
import type { Paper, WorkType } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * PCAARRD eLibrary, the DOST-PCAARRD online library for agriculture,
 * aquatic and natural resources research. It searches the collections of
 * the regional research consortia and state universities: theses and
 * dissertations, research papers, books, manuals and reports, with the
 * abstract and authors on each record page.
 * https://elibrary.pcaarrd.dost.gov.ph
 */

const BASE = "https://elibrary.pcaarrd.dost.gov.ph";
const CONCURRENCY = 6;
const PAGE_MS = 6000;
const BUDGET_MS = 10000;

export interface PcaarrdHit {
  id: string;
  url: string;
  title: string;
  source: string | null;
}

/** A field value in the record page's "Other Details" table. */
function detail(html: string, label: string): string | null {
  const m = html.match(new RegExp(`<strong>${label}\\s*</strong>\\s*</div>\\s*<div class="col text-center">([\\s\\S]*?)</div>`));
  const text = m ? stripHtml(m[1]) : "";
  return text && !/^information not provided$/i.test(text) ? text : null;
}

export function parsePcaarrdList(html: string): PcaarrdHit[] {
  const hits: PcaarrdHit[] = [];
  for (const block of html.split('<div class="col-md-4">').slice(1)) {
    const link = block.match(/href="([^"]*\/full-description\/(\d+))"/);
    if (!link) continue;
    const title = block.match(/<h5>([\s\S]*?)<\/h5>/);
    const source = block.match(/<b>Source : <\/b>\s*([^<]+)/);
    if (!title) continue;
    hits.push({
      id: link[2],
      url: link[1].startsWith("http") ? link[1] : `${BASE}${link[1]}`,
      title: stripHtml(title[1]),
      source: source ? stripHtml(source[1]) || null : null,
    });
  }
  return hits;
}

function workType(material: string | null): WorkType | undefined {
  const t = material?.toLowerCase() ?? "";
  if (/thesis|dissertation/.test(t)) return "thesis";
  if (/conference|proceeding/.test(t)) return "conference";
  if (/book/.test(t)) return "book";
  if (/report|monograph/.test(t)) return "report";
  if (/article|journal|research/.test(t)) return "article";
  return undefined;
}

/** A paper from one PCAARRD record page; the list hit fills what the page omits. */
export function parsePcaarrdDetail(html: string, hit: PcaarrdHit): Paper | null {
  const title = stripHtml(html.match(/<h5>([\s\S]*?)<\/h5>/)?.[1] ?? hit.title).replace(/\s*\/\s*$/, "");
  if (!title) return null;

  const year = Number(html.match(/<small>c?(\d{4})\.<\/small>/)?.[1]) || null;
  const authors = (detail(html, "Authors") ?? "")
    .split(/\s*;\s*/)
    .map((a) => a.replace(/,\s*$/, "").trim())
    .filter(Boolean)
    .map(flipName)
    .slice(0, 10);

  const material = detail(html, "Material Type");
  const publisher = detail(html, "Publisher") ?? hit.source;
  const summary = html.match(/SUMMARY[\s\S]*?<div class="wrapper_indent">([\s\S]*?)<\/div>/)?.[1];
  const abstract = summary ? stripHtml(summary) || null : null;

  return {
    id: paperId(null, title),
    title,
    authors,
    year,
    publishedDate: year ? String(year) : null,
    venue: hit.source ?? "PCAARRD eLibrary",
    type: workType(material),
    publisher,
    doi: null,
    abstract,
    // The library asks visitors to inquire about most items; it is not a PDF archive.
    openAccessUrl: null,
    isOpenAccess: false,
    keywords: [],
    url: hit.url,
    sources: ["pcaarrd"],
  };
}

export async function searchPcaarrd(query: string, opts: AdapterOptions = {}): Promise<Paper[]> {
  const { fromYear, perSource = 15, openAccessOnly } = opts;
  // No record claims a free PDF, so this filter leaves nothing.
  if (openAccessOnly) return [];

  const params = new URLSearchParams({
    query,
    page: "1",
    layout: "grid",
    series_statement_id: "0",
    "seachtype[]": "0",
  });
  const res = await fetchWithTimeout(
    `${BASE}/results?${params}`,
    { headers: { "User-Agent": USER_AGENT } },
    10000
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  if (!html.includes("box_list") && !/no (?:results|materials)/i.test(html)) throw new Error("unexpected page");

  const hits = parsePcaarrdList(html);
  const pages: (string | null)[] = new Array(hits.length).fill(null);
  const started = Date.now();
  let next = 0;

  async function worker() {
    while (next < hits.length && Date.now() - started < BUDGET_MS) {
      const i = next++;
      pages[i] = await fetchWithTimeout(hits[i].url, { headers: { "User-Agent": USER_AGENT } }, PAGE_MS)
        .then((r) => (r.ok ? r.text() : null))
        .catch(() => null);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const papers = hits.map((hit, i) => (pages[i] ? parsePcaarrdDetail(pages[i]!, hit) : null)).filter((p): p is Paper => p !== null);
  return papers
    .filter((p) => !fromYear || !p.year || p.year >= fromYear)
    .slice(0, perSource);
}

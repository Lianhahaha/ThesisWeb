import { paperId } from "@/lib/utils";
import { fetchWithTimeout, readJson } from "@/lib/server/http";
import { USER_AGENT } from "@/lib/server/config";
import { extractYear, stripHtml } from "@/lib/text";
import type { Paper } from "@/lib/types";
import type { AdapterOptions } from "@/lib/sources/types";

/**
 * Saliksik, the University of the Philippines Diliman journals portal: one
 * search across the peer-reviewed journals published by UPD colleges and
 * units (Philippine Journal of Public Administration, Humanities Diliman,
 * Social Science Diliman, Science Diliman, Plaridel, Daluyan and more).
 *
 * Its public JSON API returns titles only; each article page carries the
 * authors, journal title, publication date and the free PDF.
 * https://saliksik.upd.edu.ph
 */

const BASE = "https://saliksik.upd.edu.ph";
const JOURNALS_TTL_MS = 24 * 60 * 60 * 1000;
const CONCURRENCY = 6;
const PAGE_MS = 6000;
const BUDGET_MS = 10000;

interface SaliksikHit {
  id: number;
  title?: string;
  abstract?: string | null;
  keywords?: string | string[] | null;
  journal_id?: string;
  status?: string;
  manuscript?: string | null;
}

interface SaliksikSearch {
  publications?: SaliksikHit[];
}

interface SaliksikJournal {
  journal_title?: string;
  journal_code?: string;
}

const meta = (html: string, name: string): string | null => {
  const m = html.match(new RegExp(`<meta name="${name}" content="([^"]*)"`));
  const text = m ? stripHtml(m[1]) : "";
  return text || null;
};

/** Authors as the article page lists them under "Author(s)", as links. */
function pageAuthors(html: string): string[] {
  const names = [...html.matchAll(/href="\/authors\/([^"]+)"/g)]
    .map((m) => {
      try {
        return stripHtml(decodeURIComponent(m[1]));
      } catch {
        return stripHtml(m[1]);
      }
    })
    .filter(Boolean);
  if (names.length) return [...new Set(names)].slice(0, 10);

  // Fallback: the citation_author meta tags some pages carry.
  return [...html.matchAll(/<meta name="citation_author" content="([^"]*)"/g)]
    .map((m) => stripHtml(m[1]).replace(/,\s*$/, ""))
    .filter(Boolean)
    .slice(0, 10);
}

/** Title, authors, journal and year from one Saliksik article page. */
export function parseSaliksikArticle(html: string): { title: string | null; authors: string[]; year: number | null; venue: string | null } {
  return {
    title: meta(html, "citation_title"),
    authors: pageAuthors(html),
    year: extractYear(meta(html, "citation_publication_date")),
    venue: meta(html, "citation_journal_title"),
  };
}

export function parseSaliksikSearch(data: SaliksikSearch): SaliksikHit[] {
  return (data?.publications ?? []).filter((p) => p?.title && (!p.status || /published/i.test(p.status)));
}

/** Journal code -> title, kept because it changes only when a journal is added. */
let journalCache: { at: number; map: Map<string, string> } | null = null;

async function journalNames(): Promise<Map<string, string>> {
  if (journalCache && Date.now() - journalCache.at < JOURNALS_TTL_MS) return journalCache.map;
  const map = new Map<string, string>();
  try {
    const res = await fetchWithTimeout(
      `${BASE}/api/journals/search_journals?keyword=`,
      { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } },
      7000
    );
    if (res.ok) {
      for (const j of (await readJson<SaliksikJournal[]>(res, [])) ?? []) {
        if (j.journal_code && j.journal_title) map.set(j.journal_code, j.journal_title);
      }
    }
  } catch {
    // The journal code still gives the record a stable identity.
  }
  journalCache = { at: Date.now(), map };
  return map;
}

async function encryptedId(id: number): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(
      `${BASE}/api/articles/encrypted-id?id=${id}`,
      { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } },
      4000
    );
    if (!res.ok) return null;
    return (await readJson<{ encryptedId?: string }>(res, {})).encryptedId ?? null;
  } catch {
    return null;
  }
}

function keywordsOf(value: SaliksikHit["keywords"]): string[] {
  if (!value) return [];
  const list = Array.isArray(value) ? value : String(value).split(/[,;]/);
  return [...new Set(list.map((k) => k.trim()).filter(Boolean))].slice(0, 10);
}

export async function searchSaliksik(query: string, opts: AdapterOptions = {}): Promise<Paper[]> {
  const { fromYear, perSource = 15, openAccessOnly } = opts;
  const params = new URLSearchParams({
    search: query,
    filterBy: "all",
    page: "1",
    pageSize: String(Math.min(perSource, 15)),
  });

  const [res, journals] = await Promise.all([
    fetchWithTimeout(
      `${BASE}/api/publication/search_publication?${params}`,
      { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } },
      10000
    ),
    journalNames(),
  ]);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const hits = parseSaliksikSearch(await readJson<SaliksikSearch>(res, {}));

  const started = Date.now();
  const pages: (string | null)[] = new Array(hits.length).fill(null);
  const ids: (string | null)[] = new Array(hits.length).fill(null);
  let next = 0;

  async function worker() {
    while (next < hits.length && Date.now() - started < BUDGET_MS) {
      const i = next++;
      const id = await encryptedId(hits[i].id);
      ids[i] = id;
      if (!id) continue;
      pages[i] = await fetchWithTimeout(
        `${BASE}/journals/${encodeURIComponent(hits[i].journal_id ?? "")}/article/${encodeURIComponent(id)}`,
        { headers: { "User-Agent": USER_AGENT } },
        PAGE_MS
      )
        .then((r) => (r.ok ? r.text() : null))
        .catch(() => null);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const papers: Paper[] = [];
  for (let i = 0; i < hits.length; i++) {
    const hit = hits[i];
    const article = pages[i] ? parseSaliksikArticle(pages[i]!) : null;
    const title = article?.title || stripHtml(hit.title ?? "");
    if (!title) continue;

    const journal = article?.venue || (hit.journal_id ? journals.get(hit.journal_id) ?? hit.journal_id : null);
    const year = article?.year ?? null;
    if (fromYear && year && year < fromYear) continue;

    const manuscript = hit.manuscript?.trim();
    const pdf = manuscript ? `${BASE}/${manuscript.replace(/^\/+/, "")}` : null;
    if (openAccessOnly && !pdf) continue;

    const url = ids[i]
      ? `${BASE}/journals/${encodeURIComponent(hit.journal_id ?? "")}/article/${encodeURIComponent(ids[i]!)}`
      : pdf ?? (hit.journal_id ? `${BASE}/journals/${encodeURIComponent(hit.journal_id)}` : null);

    papers.push({
      id: paperId(null, title),
      title,
      authors: article?.authors ?? [],
      year,
      publishedDate: null,
      venue: journal,
      type: "article",
      doi: null,
      abstract: hit.abstract?.trim() || null,
      openAccessUrl: pdf,
      isOpenAccess: Boolean(pdf),
      keywords: keywordsOf(hit.keywords),
      url,
      sources: ["saliksik"],
    });
  }

  return papers.slice(0, perSource);
}

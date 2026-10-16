import { fetchWithTimeout, readJson, sleep, waitTurn } from "@/lib/server/http";
import { CONTACT_EMAIL } from "@/lib/server/config";

/**
 * Shared NCBI E-utilities client for the PubMed and PubMed Central adapters.
 * Docs: https://www.ncbi.nlm.nih.gov/books/NBK25499/
 *
 * NCBI allows 3 requests per second without a key (10 with NCBI_API_KEY),
 * counted across every database. A search makes two calls per NCBI source
 * at the same moment, so calls are spaced out here instead of risking 429s.
 * The pacing is per server instance, like the Semantic Scholar one.
 */

const BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
const KEY = process.env.NCBI_API_KEY?.trim() || "";
const GAP_MS = KEY ? 110 : 350;

/**
 * Hosting platforms share outgoing addresses between many apps, and NCBI
 * counts per address, so a 429 can arrive even with our own pacing. Retry
 * it a couple of times with a growing wait.
 */
const MAX_ATTEMPTS = 3;

async function eutils(path: string, params: Record<string, string>): Promise<Response> {
  // JSON unless the call asks otherwise (efetch only answers in XML).
  const q = new URLSearchParams({ retmode: "json", ...params, tool: "ThesisWeb", email: CONTACT_EMAIL });
  if (KEY) q.set("api_key", KEY);

  for (let attempt = 1; ; attempt++) {
    await waitTurn("ncbi", GAP_MS);
    const res = await fetchWithTimeout(`${BASE}/${path}?${q}`);
    if (res.status !== 429 || attempt >= MAX_ATTEMPTS) return res;
    await sleep(700 * attempt + Math.random() * 300);
  }
}

/** Ids of the best matches in `db`, most relevant first. */
export async function eSearch(db: string, term: string, retmax: number): Promise<string[]> {
  const res = await eutils("esearch.fcgi", { db, term, retmax: String(retmax), sort: "relevance" });
  if (!res.ok) throw new Error(`esearch ${res.status}`);
  const data = await readJson<{ esearchresult?: { idlist?: string[] } }>(res);
  return data?.esearchresult?.idlist ?? [];
}

/** Full records as XML (PubmedArticleSet for PubMed); "" for no ids. */
export async function eFetchXml(db: string, ids: string[]): Promise<string> {
  if (ids.length === 0) return "";
  const res = await eutils("efetch.fcgi", { db, id: ids.join(","), retmode: "xml" });
  if (!res.ok) throw new Error(`efetch ${res.status}`);
  return res.text();
}

/** Summary records keyed by id (missing ids are simply absent). */
export async function eSummary(db: string, ids: string[]): Promise<Record<string, any>> {
  if (ids.length === 0) return {};
  const res = await eutils("esummary.fcgi", { db, id: ids.join(",") });
  if (!res.ok) throw new Error(`esummary ${res.status}`);
  const data = await readJson<{ result?: Record<string, any> }>(res);
  return data?.result ?? {};
}

/**
 * esummary names authors "Surname Initials" ("Polack FP"). Citations expect
 * given names first, as every other source gives them; group authors
 * (authtype "CollectiveName") are left as they are.
 */
export function ncbiAuthors(list: any[] | undefined): string[] {
  return (list ?? [])
    .filter((a) => a?.name)
    .map((a) =>
      a.authtype === "CollectiveName" ? String(a.name) : String(a.name).replace(/^(.+?)\s+([A-Z]{1,3})$/, "$2 $1")
    )
    .slice(0, 10);
}

/** Value of one article id type ("doi", "pmcid", "pmc"...), or null. */
export function articleId(item: any, type: string): string | null {
  const hit = ((item?.articleids ?? []) as any[]).find((a) => a.idtype === type);
  return hit?.value ? String(hit.value) : null;
}

/** Volume, issue and pages of an esummary record (blank fields come back as ""). */
export function ncbiCitation(item: any): { volume: string | null; issue: string | null; pages: string | null } {
  const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  return { volume: text(item?.volume), issue: text(item?.issue), pages: text(item?.pages) };
}

/** Year from "2021 Mar 4" / "2021/03/04", or null. */
export function ncbiYear(date: unknown): number | null {
  const y = typeof date === "string" ? parseInt(date.slice(0, 4), 10) : NaN;
  return Number.isFinite(y) ? y : null;
}

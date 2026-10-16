import { fetchWithTimeout, readJson } from "@/lib/server/http";
import { CONTACT_EMAIL, USER_AGENT } from "@/lib/server/config";
import { SOURCE_META } from "@/lib/sources/meta";
import { decodeEntities, doiUrlPath, stripHtml } from "@/lib/text";

/**
 * The abstract of a paper whose database didn't send one (PubMed Central,
 * HERDIN, SERP-P, the OJS journals, J-STAGE, theses.fr, EconBiz ...), looked
 * up when a student opens it: by DOI from OpenAlex or Crossref, by PMC id from
 * Europe PMC, or read from the record's own page.
 */

export interface AbstractResult {
  abstract: string | null;
  /** Where it came from, for the note under it. */
  source: string | null;
}

/** Shorter than this is a tagline or a teaser, not an abstract. */
const MIN_LENGTH = 120;
const MAX_LENGTH = 40_000;
/** Most of a page read; abstracts sit near the top. */
const MAX_PAGE_BYTES = 2_000_000;

/** Pages may only be fetched from the databases' own sites (never a link a visitor makes up). */
const ALLOWED_HOSTS = new Set(
  Object.values(SOURCE_META).map((m) => new URL(m.url).hostname.replace(/^www\./, ""))
);
export function isAllowedUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return (u.protocol === "https:" || u.protocol === "http:") && ALLOWED_HOSTS.has(u.hostname.replace(/^www\./, ""));
  } catch {
    return false;
  }
}

const usable = (s: string | null | undefined) => {
  const text = s ? stripHtml(s).replace(/^abstract[:.\s-]*/i, "").trim() : "";
  return text.length >= MIN_LENGTH ? text.slice(0, MAX_LENGTH) : null;
};

/** OpenAlex keeps abstracts as word positions. */
function deinvert(idx: Record<string, number[]> | null | undefined): string {
  if (!idx) return "";
  const words: [number, string][] = [];
  for (const [word, positions] of Object.entries(idx)) for (const p of positions) words.push([p, word]);
  return words.sort((a, b) => a[0] - b[0]).map(([, w]) => w).join(" ");
}

async function byDoi(doi: string): Promise<AbstractResult | null> {
  const oa = await fetchWithTimeout(`https://api.openalex.org/works/doi:${doiUrlPath(doi)}?select=abstract_inverted_index&mailto=${encodeURIComponent(CONTACT_EMAIL)}`, {}, 6000)
    .then((r) => (r.ok ? readJson<{ abstract_inverted_index?: Record<string, number[]> }>(r) : null))
    .catch(() => null);
  const fromOpenAlex = usable(deinvert(oa?.abstract_inverted_index));
  if (fromOpenAlex) return { abstract: fromOpenAlex, source: "OpenAlex" };

  const cr = await fetchWithTimeout(`https://api.crossref.org/works/${doiUrlPath(doi)}?mailto=${encodeURIComponent(CONTACT_EMAIL)}`, {}, 6000)
    .then((r) => (r.ok ? readJson<{ message?: { abstract?: string } }>(r) : null))
    .catch(() => null);
  const fromCrossref = usable(cr?.message?.abstract);
  return fromCrossref ? { abstract: fromCrossref, source: "Crossref" } : null;
}

async function byPmcId(pmcid: string): Promise<AbstractResult | null> {
  const params = new URLSearchParams({ query: `PMCID:${pmcid}`, format: "json", resultType: "core", pageSize: "1" });
  const data = await fetchWithTimeout(`https://www.ebi.ac.uk/europepmc/webservices/rest/search?${params}`, {}, 6000)
    .then((r) => (r.ok ? readJson<{ resultList?: { result?: { abstractText?: string }[] } }>(r) : null))
    .catch(() => null);
  const text = usable(data?.resultList?.result?.[0]?.abstractText);
  return text ? { abstract: text, source: "Europe PMC" } : null;
}

/** The content of a <meta> tag by name or property. */
function meta(html: string, name: string): string | null {
  const re = new RegExp(`<meta\\s+[^>]*(?:name|property)="${name.replace(/\./g, "\\.")}"[^>]*content="([^"]*)"`, "i");
  const alt = new RegExp(`<meta\\s+[^>]*content="([^"]*)"[^>]*(?:name|property)="${name.replace(/\./g, "\\.")}"`, "i");
  return html.match(re)?.[1] ?? html.match(alt)?.[1] ?? null;
}

/** Page text with block elements as line breaks, so one paragraph is one line. */
function blockText(html: string): string {
  return decodeEntities(
    html
      .replace(/<(script|style|noscript|select|nav|footer|header)\b[\s\S]*?<\/\1>/gi, " ")
      .replace(/<\/?(p|div|section|article|li|td|tr|h[1-6]|br|dd|dt|blockquote)\b[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

/**
 * The abstract on a record page: from the citation or Dublin Core meta tags
 * (OJS, most repositories), else the text under an "Abstract" heading
 * (HERDIN, Philippine E-Journals), else the whole paragraph that the page's
 * shortened og:description begins (SERP-P, J-STAGE). Null if none is there.
 */
export function abstractFromHtml(html: string): string | null {
  for (const name of ["citation_abstract", "DC.Description", "dcterms.abstract", "DCTERMS.abstract", "eprints.abstract"]) {
    const found = usable(meta(html, name));
    if (found) return found;
  }

  const text = blockText(html);
  const lines = text.split("\n");
  for (let i = 0; i < lines.length - 1; i++) {
    if (/^abstract[:.]?$/i.test(lines[i])) {
      const found = usable(lines[i + 1]);
      if (found) return found;
    }
  }

  // og:description is the abstract cut short ("... the assurance system …"); find where it continues.
  for (const name of ["og:description", "description", "twitter:description"]) {
    const teaser = decodeEntities(meta(html, name) ?? "").replace(/(\.{3}|…)\s*$/, "").replace(/\s+/g, " ").trim();
    if (teaser.length < 80) continue;
    const line = lines.find((l) => l.startsWith(teaser.slice(0, 80)) && l.length > teaser.length);
    const found = usable(line);
    if (found) return found;
  }
  return null;
}

/** The first `max` bytes of a page as text. */
async function readStart(res: Response, max: number): Promise<string> {
  if (!res.body) return res.text();
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  try {
    while (text.length < max) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
    }
  } finally {
    reader.cancel().catch(() => {});
  }
  return text;
}

async function byPage(url: string): Promise<AbstractResult | null> {
  if (!isAllowedUrl(url)) return null;
  const res = await fetchWithTimeout(url, { headers: { "User-Agent": USER_AGENT, Accept: "text/html" } }, 12000).catch(() => null);
  // A redirect may only land on another of the databases' sites.
  if (!res?.ok || !isAllowedUrl(res.url || url)) return null;
  // A page that stalls part-way through is a page without an abstract, not an error.
  const html = await readStart(res, MAX_PAGE_BYTES).catch(() => "");
  const text = abstractFromHtml(html);
  return text ? { abstract: text, source: new URL(url).hostname.replace(/^www\./, "") } : null;
}

/** Look up a missing abstract by DOI, PMC id or record page, in that order. */
export async function findAbstract({ doi, url }: { doi?: string | null; url?: string | null }): Promise<AbstractResult> {
  if (doi) {
    const found = await byDoi(doi);
    if (found) return found;
  }
  const pmcid = url?.match(/\/(PMC\d+)\/?/)?.[1];
  if (pmcid) {
    const found = await byPmcId(pmcid);
    if (found) return found;
  }
  if (url) {
    const found = await byPage(url);
    if (found) return found;
  }
  return { abstract: null, source: null };
}

import { WORK_TYPES, type Paper, type WorkType } from "@/lib/types";
import { paperId } from "@/lib/utils";
import { extractDoi, stripHtml } from "@/lib/text";

/**
 * Last line of defence between the independently written adapters and the
 * UI. Every record passes through here, so one adapter's bug (an array where
 * a string belongs, a year of 20231, a `javascript:` link, a DOI as a URL)
 * can't break rendering, deduping or saving for every other result.
 */

const str = (v: unknown, max: number): string | null =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;

/** Text as plain text: repositories often send HTML entities or JATS tags. */
const cleanText = (v: unknown, max: number): string | null => {
  const s = str(v, max);
  if (!s) return null;
  return stripHtml(s).slice(0, max) || null;
};

/** Like str(), but also takes a number: APIs give volumes and issues either way. */
const label = (v: unknown, max: number): string | null =>
  typeof v === "number" && Number.isFinite(v) ? String(v) : str(v, max);

const strings = (v: unknown, max: number, each = 300): string[] =>
  Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string" && !!x.trim()).map((x) => x.trim().slice(0, each)).slice(0, max)
    : [];

/** Only http(s) links reach an <a href>; anything else (javascript:, data:) is dropped. */
function safeUrl(v: unknown): string | null {
  const s = str(v, 2000);
  if (!s) return null;
  try {
    const u = new URL(s);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

function safeYear(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isInteger(n)) return null;
  return n >= 1000 && n <= new Date().getFullYear() + 1 ? n : null;
}

/**
 * A bare DOI stays exactly as given (some legitimately end in ")"); a URL or
 * "doi:" form is reduced to the bare DOI; anything else is dropped.
 */
function cleanDoi(v: unknown): string | null {
  const s = str(v, 300);
  if (!s) return null;
  if (/^10\.\d{4,9}\/\S+$/.test(s)) return s;
  return extractDoi(s);
}

/** Words that say nothing about what a record is about. */
const FILLER = new Set([
  "the", "a", "an", "of", "and", "in", "on", "for", "to", "with", "at", "by", "from",
  "its", "their", "this", "that", "as", "is", "are", "was", "were", "be", "or",
]);

const contentWords = (s: string): string[] =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(/\s+/)
    .filter((w) => w && !FILLER.has(w));

const squash = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/**
 * Some repositories put the whole record in the abstract field: the journal
 * line, then the title again, then the author list. That is not a summary, and
 * a paper page that shows it looks broken. Trim the echoes, and drop the field
 * when what is left is the metadata restated rather than a description.
 */
export function cleanAbstract(
  raw: string | null,
  record: { title: string; venue?: string | null; authors?: string[] }
): string | null {
  if (!raw) return null;
  let text = raw.replace(/^\s*abstract[:\s\-–—]+/i, "").trim();
  const original = text.length;

  const stripEcho = (prefix?: string | null) => {
    const want = prefix?.trim();
    // Short fragments match too much to be an echo worth removing.
    if (!want || want.length < 8) return;
    if (squash(text.slice(0, want.length)) === squash(want)) {
      text = text.slice(want.length).replace(/^[\s.,:;–—-]+/, "").trim();
    }
  };
  stripEcho(record.title);
  stripEcho(record.venue);

  // "Vol. V, Issue XII (December 2025), pp.68-76" — the citation line a
  // repository prepends before repeating the title.
  text = text.replace(/^\s*(?:vol\.?|volume|no\.?|issue)\s[^.]{0,80}?\bpp?\.\s*\d+[-–]?\d*\s*/i, "").trim();
  stripEcho(record.title);

  // "…Gerald S. Berdida Emily Espinosa Janine N. Olis" — the author list.
  for (const author of record.authors ?? []) stripEcho(author);

  if (!text) return null;
  // Most of the field was other fields repeated: this is a record, not a summary.
  if (original >= 80 && text.length / original < 0.4) return null;

  // A short field made mostly of words already in the title, venue and author
  // list is the record again, not an abstract.
  const metadata = new Set(contentWords([record.title, record.venue ?? "", ...(record.authors ?? [])].join(" ")));
  const own = contentWords(text);
  if (own.length >= 8) {
    const overlap = own.filter((w) => metadata.has(w)).length / own.length;
    if (overlap > 0.6) return null;
  }
  return text;
}

/** A clean copy of `p`, or null if it has no usable title. */
export function normalizePaper(p: Paper, sourceId: string): Paper | null {
  const title = cleanText(p?.title, 1000);
  // Several adapters fall back to "Untitled"; such a record can't be cited or found again.
  if (!title || /^untitled$/i.test(title)) return null;

  const doi = cleanDoi(p.doi);
  const sources = strings(p.sources, 50, 50);
  if (!sources.includes(sourceId)) sources.push(sourceId);
  const authors = strings(p.authors, 50).map(stripHtml).filter(Boolean);
  const venue = cleanText(p.venue, 500);

  return {
    ...p,
    // The id follows the DOI and title, so a DOI fixed up here keeps the same
    // id every other source gives the paper.
    id: paperId(doi, title),
    title,
    authors,
    year: safeYear(p.year),
    publishedDate: str(p.publishedDate, 40),
    venue,
    type: WORK_TYPES.includes(p.type as WorkType) ? p.type : undefined,
    volume: label(p.volume, 40),
    issue: label(p.issue, 40),
    pages: label(p.pages, 40),
    publisher: cleanText(p.publisher, 300),
    doi,
    abstract: cleanAbstract(cleanText(p.abstract, 40000), { title, venue, authors }),
    tldr: cleanText(p.tldr, 2000),
    // A record counts as free only with a link to the free copy, and a link is
    // shown as free only when the source says it is: "Free full text only"
    // and the "Free PDF" button rely on both agreeing.
    openAccessUrl: p.isOpenAccess === true ? safeUrl(p.openAccessUrl) : null,
    url: safeUrl(p.url) ?? (p.isOpenAccess === true ? null : safeUrl(p.openAccessUrl)),
    isOpenAccess: p.isOpenAccess === true && safeUrl(p.openAccessUrl) !== null,
    citedByCount:
      typeof p.citedByCount === "number" && Number.isFinite(p.citedByCount) && p.citedByCount >= 0
        ? Math.floor(p.citedByCount)
        : undefined,
    keywords: strings(p.keywords, 20, 120).map(stripHtml).filter(Boolean),
    sources,
    retracted: p.retracted === true || undefined,
    concern: p.concern === true || undefined,
    preprint: typeof p.preprint === "boolean" ? p.preprint : undefined,
  };
}

import type { Paper } from "@/lib/types";
import { paperId } from "@/lib/utils";
import { extractDoi } from "@/lib/text";

/**
 * Last line of defence between ~20 independently written adapters and the
 * UI. Every record passes through here, so one adapter's bug (an array where
 * a string belongs, a year of 20231, a `javascript:` link, a DOI as a URL)
 * can't break rendering, deduping or saving for every other result.
 */

const str = (v: unknown, max: number): string | null =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;

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

/** A clean copy of `p`, or null if it has no usable title. */
export function normalizePaper(p: Paper, sourceId: string): Paper | null {
  const title = str(p?.title, 1000)?.replace(/\s+/g, " ");
  // Several adapters fall back to "Untitled"; such a record can't be cited or found again.
  if (!title || /^untitled$/i.test(title)) return null;

  const doi = cleanDoi(p.doi);
  const sources = strings(p.sources, 50, 50);
  if (!sources.includes(sourceId)) sources.push(sourceId);

  return {
    ...p,
    // The id follows the DOI and title, so a DOI fixed up here keeps the same
    // id every other source gives the paper.
    id: paperId(doi, title),
    title,
    authors: strings(p.authors, 50),
    year: safeYear(p.year),
    publishedDate: str(p.publishedDate, 40),
    venue: str(p.venue, 500),
    doi,
    abstract: str(p.abstract, 40000),
    tldr: str(p.tldr, 2000),
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
    keywords: strings(p.keywords, 20, 120),
    sources,
    retracted: p.retracted === true || undefined,
    concern: p.concern === true || undefined,
    preprint: typeof p.preprint === "boolean" ? p.preprint : undefined,
  };
}

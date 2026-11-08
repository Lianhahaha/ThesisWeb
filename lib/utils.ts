import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes with conflict resolution. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Title-case-ish normalization for dedupe comparisons. */
export function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Unicode-aware normalization for matching (dedupe keys and ranking).
 * Folds Latin accents (é → e) but keeps other scripts (Greek, Cyrillic, CJK,
 * Arabic), so a title in any language still produces words to compare.
 * `normalizeTitle` above stays ASCII-only because `paperId` hashes it and
 * changing it would change ids that saved papers already use.
 */
export function normalizeForMatch(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Build a stable id for a paper from its DOI or title hash. */
export function paperId(doi?: string | null, title?: string | null): string {
  if (doi) return "doi:" + doi.toLowerCase();
  // FNV-1a hash of normalized title — fast, good enough for keying
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  // normalizeTitle keeps only a-z and 0-9, so every Chinese, Russian, Arabic
  // (...) title reduced to "" and all of them shared one id. Hash the raw
  // title for those; Latin titles keep their existing ids.
  const s =
    normalizeTitle(title || "") ||
    (title || "").normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
  for (let i = 0; i < s.length; i++) {
    h1 ^= s.charCodeAt(i);
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= s.charCodeAt(i);
    h2 = Math.imul(h2, 0x811c9dc5);
  }
  const hex1 = (h1 >>> 0).toString(16).padStart(8, "0");
  const hex2 = (h2 >>> 0).toString(16).padStart(8, "0");
  return "tit:" + hex1 + hex2;
}

/** Truncate text to `n` chars on a word boundary. */
export function truncate(s: string, n = 200): string {
  if (s.length <= n) return s;
  const cut = s.slice(0, n);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut) + "…";
}


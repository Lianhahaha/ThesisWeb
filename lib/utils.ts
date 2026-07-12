import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes with conflict resolution. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Promise that resolves after `ms` milliseconds. */
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Fetch with a timeout — external academic APIs can hang.
 * Aborts and throws after `ms`, so the meta-search can fall back to other sources.
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  ms = 8000
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

/** Try to parse JSON, return null on failure (instead of throwing). */
export async function safeJson<T = unknown>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Title-case-ish normalization for dedupe comparisons. */
export function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Format an ISO date string to a short "Mon YYYY" label. */
export function formatYear(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso.slice(0, 4);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short" });
}

/** Build a stable id for a paper from its DOI or title hash. */
export function paperId(doi?: string | null, title?: string | null): string {
  if (doi) return "doi:" + doi.toLowerCase();
  // FNV-1a hash of normalized title — fast, good enough for keying
  let h = 0x811c9dc5;
  const s = normalizeTitle(title || "");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return "tit:" + (h >>> 0).toString(16);
}

/** Truncate text to `n` chars on a word boundary. */
export function truncate(s: string, n = 200): string {
  if (s.length <= n) return s;
  const cut = s.slice(0, n);
  return cut.slice(0, cut.lastIndexOf(" ")) + "…";
}

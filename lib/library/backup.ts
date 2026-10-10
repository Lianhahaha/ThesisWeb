import { MATRIX_CELL_MAX, MATRIX_KEYS, type SavedPaper } from "@/lib/types";

/**
 * Reading a library backup (the JSON that Settings exports) back in. The file
 * is untrusted: it may be hand-edited, from an older version, or not a backup
 * at all, so every field is checked and capped to what the stores accept.
 */

/** Most papers one backup import may add. */
export const MAX_IMPORT = 2000;

/** Turn untrusted backup JSON into papers; skips anything malformed. */
export function parseBackup(raw: unknown): SavedPaper[] {
  const list = Array.isArray(raw) ? raw : (raw as { papers?: unknown })?.papers;
  if (!Array.isArray(list)) throw new Error("This file isn't a Thesisweb library backup.");
  const out: SavedPaper[] = [];
  for (const item of list.slice(0, MAX_IMPORT)) {
    if (!item || typeof item !== "object") continue;
    const p = item as Partial<SavedPaper>;
    if (typeof p.id !== "string" || typeof p.title !== "string" || !p.id || !p.title) continue;
    // Spreading the raw item would carry any stray keys the file happens to
    // hold, and the security rules cap a paper at 40 of them. Take only the
    // fields the app defines.
    const str = (v: unknown, max: number) =>
      typeof v === "string" && v ? v.slice(0, max) : undefined;
    // Links end up in an <a href>; a crafted file must not smuggle in javascript: URLs.
    const link = (v: unknown) => {
      const s = str(v, 2000);
      return s && /^https?:\/\//i.test(s) ? s : undefined;
    };
    out.push({
      id: p.id.slice(0, 300),
      title: p.title.slice(0, 1000),
      authors: Array.isArray(p.authors) ? p.authors.filter((a) => typeof a === "string").slice(0, 50) : [],
      year: typeof p.year === "number" ? p.year : null,
      publishedDate: str(p.publishedDate, 40),
      venue: str(p.venue, 500),
      doi: str(p.doi, 300),
      abstract: str(p.abstract, 40000),
      tldr: str(p.tldr, 2000),
      openAccessUrl: link(p.openAccessUrl),
      url: link(p.url),
      isOpenAccess: p.isOpenAccess === true,
      citedByCount: typeof p.citedByCount === "number" ? p.citedByCount : undefined,
      keywords: Array.isArray(p.keywords) ? p.keywords.filter((k) => typeof k === "string").slice(0, 50) : undefined,
      retracted: p.retracted === true || undefined,
      concern: p.concern === true || undefined,
      preprint: typeof p.preprint === "boolean" ? p.preprint : undefined,
      sources: Array.isArray(p.sources) ? p.sources.filter((s) => typeof s === "string") : [],
      savedAt: typeof p.savedAt === "number" ? p.savedAt : Date.now(),
      collection: str(p.collection, 100),
      notes: str(p.notes, 20000),
      matrix: (() => {
        // Only the four known cells, as text: an array or nested object here
        // would be rejected by Firestore or shown as "[object Object]".
        const m = p.matrix && typeof p.matrix === "object" && !Array.isArray(p.matrix) ? p.matrix : {};
        const cells = Object.fromEntries(
          MATRIX_KEYS.map((k) => [k, str((m as Record<string, unknown>)[k], MATRIX_CELL_MAX)]).filter(([, v]) => v)
        );
        return Object.keys(cells).length ? cells : undefined;
      })(),
      tags: Array.isArray(p.tags) ? p.tags.filter((t) => typeof t === "string") : [],
      readingStatus: p.readingStatus === "reading" || p.readingStatus === "done" ? p.readingStatus : "to-read",
      scope: p.scope === "local" || p.scope === "foreign" ? p.scope : undefined,
    } as SavedPaper);
  }
  return out;
}

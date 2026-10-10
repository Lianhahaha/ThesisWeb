import { MATRIX_KEYS, type Paper, type SavedPaper } from "@/lib/types";
import { normalizePaper } from "@/lib/sources/normalize";

/**
 * Group libraries. Most Philippine theses are written by groups of 3 to 5, so
 * a member can share a collection by link: shared/{id} holds a copy of the
 * papers (and, if the owner chooses, their notes and matrix). Anyone with the
 * link can read it; only the owner can update or delete it (firestore.rules).
 * The id is Firestore's random 20-character id, so links can't be guessed,
 * and the shares can't be listed by anyone but their owner.
 *
 * It is a copy, not a live view: the owner presses "Update" to refresh it.
 */

export interface SharedLibrary {
  id: string;
  owner: string;
  ownerName: string;
  name: string;
  papers: SharedPaper[];
  createdAt: number;
  updatedAt: number;
}

/** What a shared copy keeps of each paper: enough to read, cite and save it. */
export type SharedPaper = Pick<
  SavedPaper,
  | "id" | "title" | "authors" | "year" | "venue" | "doi" | "url" | "openAccessUrl" | "isOpenAccess"
  | "abstract" | "keywords" | "sources" | "preprint" | "retracted" | "concern" | "notes" | "matrix"
>;

/** Most papers in one share; the rules check the same number. */
export const MAX_SHARED = 200;
/** A Firestore document is capped at 1 MiB; stay well under it. */
const MAX_BYTES = 900_000;
const ABSTRACT_MAX = 1500;
const NOTES_MAX = 4000;
const CELL_MAX = 1500;

const cap = (s: string | null | undefined, max: number) => (s ? s.slice(0, max) : undefined);

/** Firestore rejects undefined values; leave such keys out. */
function defined<T extends object>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
}

export function toSharedPaper(p: SavedPaper, includeNotes: boolean): SharedPaper {
  const matrix: SharedPaper["matrix"] = {};
  if (includeNotes) for (const k of MATRIX_KEYS) if (p.matrix?.[k]) matrix[k] = cap(p.matrix[k], CELL_MAX);
  return defined({
    id: p.id,
    title: p.title,
    authors: p.authors.slice(0, 10),
    year: p.year ?? null,
    venue: p.venue ?? null,
    doi: p.doi ?? null,
    url: p.url ?? null,
    openAccessUrl: p.openAccessUrl ?? null,
    isOpenAccess: p.isOpenAccess === true,
    abstract: cap(p.abstract, ABSTRACT_MAX) ?? null,
    keywords: (p.keywords ?? []).slice(0, 5),
    sources: p.sources.slice(0, 10),
    preprint: p.preprint,
    retracted: p.retracted || undefined,
    concern: p.concern || undefined,
    notes: includeNotes ? cap(p.notes, NOTES_MAX) : undefined,
    matrix: Object.keys(matrix).length ? matrix : undefined,
  });
}

/**
 * The papers to store, within the document limit: abstracts are dropped if
 * the copy is too big with them. Throws when it is too big even without.
 */
export function sharedPapers(papers: SavedPaper[], includeNotes: boolean): SharedPaper[] {
  if (papers.length === 0) throw new Error("There are no papers to share.");
  if (papers.length > MAX_SHARED) {
    throw new Error(`A shared library holds up to ${MAX_SHARED} papers. Share one collection at a time.`);
  }
  let out = papers.map((p) => toSharedPaper(p, includeNotes));
  if (JSON.stringify(out).length > MAX_BYTES) out = out.map(({ abstract: _abstract, ...rest }) => rest);
  if (JSON.stringify(out).length > MAX_BYTES) {
    throw new Error("These papers are too much to share at once. Share a smaller collection, or leave out notes.");
  }
  return out;
}

/** Shared papers as library records, for "Copy to my library". Each passes normalizePaper, since the document is someone else's. */
export function fromShared(share: Pick<SharedLibrary, "name" | "papers">, now = Date.now()): SavedPaper[] {
  const out: SavedPaper[] = [];
  for (const raw of share.papers.slice(0, MAX_SHARED)) {
    const p = normalizePaper(raw as Paper, raw?.sources?.[0] ?? "shared");
    if (!p) continue;
    const matrix: SavedPaper["matrix"] = {};
    for (const k of MATRIX_KEYS) {
      const v = raw.matrix?.[k];
      if (typeof v === "string" && v) matrix[k] = v.slice(0, CELL_MAX);
    }
    out.push({
      ...p,
      id: raw.id || p.id,
      notes: typeof raw.notes === "string" && raw.notes ? raw.notes.slice(0, NOTES_MAX) : undefined,
      matrix: Object.keys(matrix).length ? matrix : undefined,
      collection: share.name.slice(0, 100),
      savedAt: now,
      tags: [],
      readingStatus: "to-read",
    });
  }
  return out;
}

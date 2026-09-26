"use client";

import Dexie, { type Table } from "dexie";
import type { SavedPaper } from "@/lib/types";
import { auth } from "@/lib/firebase";
import * as fs from "@/lib/firestore-library";

/**
 * Hybrid local + cloud persistence.
 * If user is logged in (auth.currentUser), uses Firestore.
 * If user is logged out, uses IndexedDB (Dexie).
 */

export class ThesisDB extends Dexie {
  papers!: Table<SavedPaper, string>;

  constructor() {
    super("thesisweb");
    this.version(1).stores({
      papers: "id, savedAt, collection, readingStatus, year, [collection+savedAt]",
    });
  }
}

let _db: ThesisDB | null = null;

export function getDb(): ThesisDB {
  if (typeof window === "undefined") throw new Error("DB is client-only");
  if (!_db) _db = new ThesisDB();
  return _db;
}

/**
 * Fired after any library change so counters (e.g. the header) can refresh.
 * `removed` names a paper taken out of the library; `local` marks a change
 * to this browser's copies only.
 */
export const LIBRARY_EVENT = "tw:library";
export interface LibraryChange {
  removed?: string;
  local?: boolean;
}
function changed(detail: LibraryChange = {}): void {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent<LibraryChange>(LIBRARY_EVENT, { detail }));
}

/** Fired after updatePaper, with { id, changes }, so in-memory copies can patch themselves. */
export const PAPER_UPDATED_EVENT = "tw:paper-updated";
export interface PaperUpdate {
  id: string;
  changes: Partial<SavedPaper>;
}

/**
 * Apply an update to an in-memory copy the way the stores do: dotted keys
 * ("matrix.method") set nested fields, undefined removes a field.
 */
export function applyPaperUpdate(p: SavedPaper, changes: Partial<SavedPaper>): SavedPaper {
  const next: Record<string, unknown> = { ...p };
  for (const [key, value] of Object.entries(changes)) {
    const [head, sub] = key.split(".", 2);
    if (sub) {
      next[head] = { ...((next[head] as Record<string, unknown>) ?? {}), [sub]: value };
    } else if (value === undefined) {
      delete next[head];
    } else {
      next[head] = value;
    }
  }
  return next as unknown as SavedPaper;
}

/** Number of saved papers, cheaply. */
export async function countPapers(): Promise<number> {
  const uid = auth.currentUser?.uid;
  if (uid) return fs.fsCountPapers(uid);
  return getDb().papers.count();
}

// --- CRUD wrappers (routing to correct backend) ---

/**
 * Keep what the user added to a paper that is already saved. Save buttons
 * build a fresh record, and they can show "Save" for a saved paper while its
 * state is still loading or the lookup failed; writing that record as-is
 * wiped the notes, matrix, collection, tags and reading status.
 */
function keepUserData(p: SavedPaper, existing: SavedPaper | undefined): SavedPaper {
  if (!existing) return p;
  return {
    ...existing,
    ...p,
    notes: p.notes ?? existing.notes,
    matrix: p.matrix ?? existing.matrix,
    collection: p.collection ?? existing.collection,
    tags: p.tags?.length ? p.tags : existing.tags ?? [],
    readingStatus: existing.readingStatus ?? p.readingStatus,
    savedAt: existing.savedAt ?? p.savedAt,
  };
}

export async function savePaper(p: SavedPaper): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (uid) {
    // If this read fails (offline), the save fails too rather than risk
    // overwriting a saved paper blind.
    await fs.fsSavePaper(uid, keepUserData(p, await fs.fsGetPaper(uid, p.id)));
  } else {
    const local = getDb();
    await local.transaction("rw", local.papers, async () => {
      await local.papers.put(keepUserData(p, await local.papers.get(p.id)));
    });
  }
  changed();
}

/**
 * Save many papers at once (backup import). Returns how many were written:
 * in an account, records the security rules reject are skipped.
 */
export async function savePapers(papers: SavedPaper[]): Promise<number> {
  if (papers.length === 0) return 0;
  const uid = auth.currentUser?.uid;
  let count = papers.length;
  if (uid) {
    count = (await fs.fsSaveMany(uid, papers)).length;
  } else {
    await getDb().papers.bulkPut(papers);
  }
  changed();
  return count;
}

/**
 * Move papers saved in this browser while signed out into the signed-in
 * account. A paper already in the account keeps its notes, matrix and other
 * edits, and a browser copy is deleted only once its upload succeeded.
 * Returns how many papers moved.
 */
export async function moveLocalPapersToAccount(): Promise<number> {
  const uid = auth.currentUser?.uid;
  if (!uid) return 0;
  const local = await localPapers();
  if (local.length === 0) return 0;
  const cloud = new Map((await fs.fsAllPapers(uid)).map((p) => [p.id, p]));
  const saved = await fs.fsSaveMany(uid, local.map((p) => keepUserData(p, cloud.get(p.id))));
  await removeLocalPapers(saved);
  changed();
  return saved.length;
}

/** Papers saved in this browser (IndexedDB), whatever the sign-in state. */
export async function localPapers(): Promise<SavedPaper[]> {
  return getDb().papers.toArray();
}

/**
 * Drop browser-only copies once they have been moved into an account.
 * Without this the "papers saved before you signed in" offer never clears.
 */
export async function removeLocalPapers(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await getDb().papers.bulkDelete(ids);
  changed({ local: true });
}

export async function unsavePaper(id: string): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (uid) {
    await fs.fsUnsavePaper(uid, id);
  } else {
    await getDb().papers.delete(id);
  }
  changed({ removed: id });
}

export async function getPaper(id: string): Promise<SavedPaper | undefined> {
  const uid = auth.currentUser?.uid;
  if (uid) {
    return fs.fsGetPaper(uid, id);
  }
  return getDb().papers.get(id);
}

export async function isSaved(id: string): Promise<boolean> {
  const uid = auth.currentUser?.uid;
  if (uid) {
    return fs.fsIsSaved(uid, id);
  }
  return (await getDb().papers.get(id)) !== undefined;
}

export async function updatePaper(id: string, changes: Partial<SavedPaper>): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (uid) {
    await fs.fsUpdatePaper(uid, id, changes);
  } else {
    await getDb().papers.update(id, changes);
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<PaperUpdate>(PAPER_UPDATED_EVENT, { detail: { id, changes } }));
  }
}

export async function allPapers(): Promise<SavedPaper[]> {
  const uid = auth.currentUser?.uid;
  if (uid) {
    return fs.fsAllPapers(uid);
  }
  const all = await getDb().papers.toArray();
  return all.sort((a, b) => b.savedAt - a.savedAt);
}

export async function listCollections(): Promise<string[]> {
  const uid = auth.currentUser?.uid;
  if (uid) {
    return fs.fsListCollections(uid);
  }
  const all = await getDb().papers.toArray();
  const set = new Set<string>();
  for (const p of all) if (p.collection) set.add(p.collection);
  return Array.from(set).sort();
}

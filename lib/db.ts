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

/** Fired after any library change so counters (e.g. the header) can refresh. */
export const LIBRARY_EVENT = "tw:library";
function changed(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(LIBRARY_EVENT));
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

export async function savePaper(p: SavedPaper): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (uid) {
    await fs.fsSavePaper(uid, p);
  } else {
    await getDb().papers.put(p);
  }
  changed();
}

/** Save many papers at once (backup import, moving browser papers to an account). */
export async function savePapers(papers: SavedPaper[]): Promise<void> {
  if (papers.length === 0) return;
  const uid = auth.currentUser?.uid;
  if (uid) {
    await fs.fsSaveMany(uid, papers);
  } else {
    await getDb().papers.bulkPut(papers);
  }
  changed();
}

/** Papers saved in this browser (IndexedDB), whatever the sign-in state. */
export async function localPapers(): Promise<SavedPaper[]> {
  return getDb().papers.toArray();
}

export async function unsavePaper(id: string): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (uid) {
    await fs.fsUnsavePaper(uid, id);
  } else {
    await getDb().papers.delete(id);
  }
  changed();
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

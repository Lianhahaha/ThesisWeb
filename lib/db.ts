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

// --- CRUD wrappers (routing to correct backend) ---

export async function savePaper(p: SavedPaper): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (uid) {
    await fs.fsSavePaper(uid, p);
  } else {
    await getDb().papers.put(p);
  }
}

export async function unsavePaper(id: string): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (uid) {
    await fs.fsUnsavePaper(uid, id);
  } else {
    await getDb().papers.delete(id);
  }
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

import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  updateDoc,
  deleteField,
  writeBatch,
  getCountFromServer,
} from "firebase/firestore";
import { db } from "./firebase";
import type { SavedPaper } from "./types";

/**
 * Firestore document IDs cannot contain "/" (treated as path separator).
 * DOIs always contain slashes (e.g. "doi:10.1109/tmi.2021.3090082").
 * We replace every "/" with "--" to produce a safe, reversible key.
 */
function safeId(id: string): string {
  return id.replace(/\//g, "--");
}

/**
 * Per-field caps from firestore.rules. A write past any of them is rejected by
 * the server, so trim here rather than lose the whole save: repository records
 * (Zenodo, OAPEN) routinely carry abstracts well past 40 000 characters.
 */
const LIMITS: Record<string, number> = {
  title: 1000,
  abstract: 40000,
  tldr: 2000,
  notes: 20000,
  collection: 100,
};

/** The same rules cap a document at 40 keys. */
const MAX_KEYS = 40;

function clampValue(key: string, value: unknown): unknown {
  const max = LIMITS[key.split(".")[0]];
  return max && typeof value === "string" && value.length > max ? value.slice(0, max) : value;
}

/** A copy of the paper that the security rules will accept. */
function forFirestore(p: SavedPaper, id: string): Record<string, unknown> {
  const out: Record<string, unknown> = { _fsId: id };
  for (const [k, v] of Object.entries(p)) {
    if (v === undefined) continue;
    if (Object.keys(out).length >= MAX_KEYS) break;
    out[k] = clampValue(k, v);
  }
  return out;
}

export async function fsSavePaper(uid: string, p: SavedPaper): Promise<void> {
  const id = safeId(p.id);
  await setDoc(doc(db, "users", uid, "papers", id), forFirestore(p, id));
}

export async function fsUnsavePaper(uid: string, id: string): Promise<void> {
  const ref = doc(db, "users", uid, "papers", safeId(id));
  await deleteDoc(ref);
}

export async function fsGetPaper(uid: string, id: string): Promise<SavedPaper | undefined> {
  const ref = doc(db, "users", uid, "papers", safeId(id));
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data() as SavedPaper;
  return undefined;
}

export async function fsIsSaved(uid: string, id: string): Promise<boolean> {
  const ref = doc(db, "users", uid, "papers", safeId(id));
  const snap = await getDoc(ref);
  return snap.exists();
}

export async function fsUpdatePaper(uid: string, id: string, changes: Partial<SavedPaper>): Promise<void> {
  const ref = doc(db, "users", uid, "papers", safeId(id));
  // undefined means "clear this field" (e.g. remove from a collection). The
  // SDK is set to ignore undefined, so say so explicitly.
  const patch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(changes)) {
    patch[k] = v === undefined ? deleteField() : clampValue(k, v);
  }
  await updateDoc(ref, patch);
}

/**
 * Save many papers; Firestore batches hold at most 500 writes. A batch is
 * atomic, so one record the rules reject would lose the other 399 — on failure,
 * retry the chunk one document at a time and skip only what genuinely fails.
 */
export async function fsSaveMany(uid: string, papers: SavedPaper[]): Promise<void> {
  for (let i = 0; i < papers.length; i += 400) {
    const chunk = papers.slice(i, i + 400);
    const batch = writeBatch(db);
    for (const p of chunk) {
      const id = safeId(p.id);
      batch.set(doc(db, "users", uid, "papers", id), forFirestore(p, id));
    }
    try {
      await batch.commit();
    } catch {
      for (const p of chunk) {
        await fsSavePaper(uid, p).catch(() => {});
      }
    }
  }
}

export async function fsAllPapers(uid: string): Promise<SavedPaper[]> {
  const q = query(collection(db, "users", uid, "papers"), orderBy("savedAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as SavedPaper);
}

/** Count without downloading: billed as one read per 1,000 papers. */
export async function fsCountPapers(uid: string): Promise<number> {
  const snap = await getCountFromServer(collection(db, "users", uid, "papers"));
  return snap.data().count;
}

export async function fsListCollections(uid: string): Promise<string[]> {
  const all = await fsAllPapers(uid);
  const set = new Set<string>();
  for (const p of all) if (p.collection) set.add(p.collection);
  return Array.from(set).sort();
}

/** Delete every saved paper (account deletion). Batches hold at most 500 writes. */
export async function fsDeleteAllPapers(uid: string): Promise<void> {
  const snap = await getDocs(collection(db, "users", uid, "papers"));
  for (let i = 0; i < snap.docs.length; i += 400) {
    const batch = writeBatch(db);
    for (const d of snap.docs.slice(i, i + 400)) batch.delete(d.ref);
    await batch.commit();
  }
}

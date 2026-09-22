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

export async function fsSavePaper(uid: string, p: SavedPaper): Promise<void> {
  const ref = doc(db, "users", uid, "papers", safeId(p.id));
  await setDoc(ref, { ...p, _fsId: safeId(p.id) });
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
  for (const [k, v] of Object.entries(changes)) patch[k] = v === undefined ? deleteField() : v;
  await updateDoc(ref, patch);
}

/** Save many papers; Firestore batches hold at most 500 writes. */
export async function fsSaveMany(uid: string, papers: SavedPaper[]): Promise<void> {
  for (let i = 0; i < papers.length; i += 400) {
    const batch = writeBatch(db);
    for (const p of papers.slice(i, i + 400)) {
      batch.set(doc(db, "users", uid, "papers", safeId(p.id)), { ...p, _fsId: safeId(p.id) });
    }
    await batch.commit();
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

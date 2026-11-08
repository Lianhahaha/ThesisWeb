import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  documentId,
  orderBy,
  deleteField,
  writeBatch,
  getCountFromServer,
  limit,
  startAfter,
  runTransaction,
  type DocumentSnapshot,
  type Query,
  type QuerySnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { SavedPaper } from "@/lib/types";
import { joinNotes, mergeSavedPaper } from "@/lib/library/merge";

/**
 * Firestore document IDs cannot contain "/" (treated as path separator).
 * DOIs always contain slashes (e.g. "doi:10.1109/tmi.2021.3090082"), so the
 * original mapping replaced them with "--". That is not injective: "a/b" and
 * "a--b" both become "a--b". Ids without "--" keep the old key (no migration);
 * only ambiguous ids use a prefixed, percent-encoded key.
 */
function legacySafeId(id: string): string {
  return id.replace(/\//g, "--");
}

function safeIdV2(id: string): string {
  return "~" + encodeURIComponent(id).replace(/~/g, "%7E");
}

function safeId(id: string): string {
  return id.includes("--") || id.startsWith("~") ? safeIdV2(id) : legacySafeId(id);
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
    if (v === undefined || k === "_fsId") continue;
    if (Object.keys(out).length >= MAX_KEYS) break;
    out[k] = clampValue(k, v);
  }
  return out;
}

/** The document for `id`, reading the legacy key too when the mappings differ. */
async function docsFor(uid: string, id: string) {
  const primary = doc(db, "users", uid, "papers", safeId(id));
  const legacyKey = legacySafeId(id);
  const legacy = legacyKey !== primary.id ? doc(db, "users", uid, "papers", legacyKey) : null;
  return { primary, legacy };
}

function samePaper(snap: DocumentSnapshot, id: string): boolean {
  const stored = snap.data()?.id;
  // Old records may predate the id field; the document key is the fallback.
  return stored === undefined || stored === id;
}

/**
 * Save one paper. A transaction reads the current copy and merges, so two tabs
 * saving the same paper cannot erase each other's notes or matrix cells.
 */
export async function fsSavePaper(uid: string, p: SavedPaper): Promise<void> {
  const { primary, legacy } = await docsFor(uid, p.id);
  await runTransaction(db, async (tx) => {
    let kept: SavedPaper | undefined;
    const snap = await tx.get(primary);
    if (snap.exists()) kept = snap.data() as SavedPaper;
    if (!kept && legacy) {
      const old = await tx.get(legacy);
      if (old.exists() && samePaper(old, p.id)) {
        kept = old.data() as SavedPaper;
        tx.delete(legacy);
      }
    }
    tx.set(primary, forFirestore(mergeSavedPaper(kept, p), primary.id));
  });
}

export async function fsUnsavePaper(uid: string, id: string): Promise<void> {
  const { primary, legacy } = await docsFor(uid, id);
  const refs = legacy ? [primary, legacy] : [primary];
  for (const ref of refs) {
    const snap = await getDoc(ref);
    // Never delete a colliding legacy document that belongs to another paper.
    if (snap.exists() && samePaper(snap, id)) await deleteDoc(ref);
  }
}

export async function fsGetPaper(uid: string, id: string): Promise<SavedPaper | undefined> {
  const { primary, legacy } = await docsFor(uid, id);
  const snap = await getDoc(primary);
  if (snap.exists() && samePaper(snap, id)) return snap.data() as SavedPaper;
  if (legacy) {
    const old = await getDoc(legacy);
    if (old.exists() && samePaper(old, id)) return old.data() as SavedPaper;
  }
  return undefined;
}

/** Most ids one Firestore "in" filter may hold. */
const IN_LIMIT = 30;

/**
 * Which of `ids` are in the library: one query per 30 ids instead of one read
 * per paper. Firestore bills a query by the papers it finds (at least one
 * read), so checking a page of 300 results costs about ten reads plus the
 * saved ones, not 300.
 */
export async function fsSavedAmong(uid: string, ids: string[]): Promise<Set<string>> {
  // Include the legacy key so an ambiguous id saved before this change is
  // still found; the stored `id` field decides which paper a key belongs to.
  const byKey = new Map<string, string>();
  for (const id of ids) {
    byKey.set(safeId(id), id);
    byKey.set(legacySafeId(id), id);
  }
  const keys = [...byKey.keys()];
  const chunks: string[][] = [];
  for (let i = 0; i < keys.length; i += IN_LIMIT) chunks.push(keys.slice(i, i + IN_LIMIT));
  const snaps = await Promise.all(
    chunks.map((chunk) => getDocs(query(collection(db, "users", uid, "papers"), where(documentId(), "in", chunk))))
  );
  const found = new Set<string>();
  for (const snap of snaps) {
    for (const d of snap.docs) {
      const original = byKey.get(d.id);
      if (original && samePaper(d, original)) found.add(original);
    }
  }
  return found;
}

export async function fsUpdatePaper(uid: string, id: string, changes: Partial<SavedPaper>): Promise<void> {
  const { primary, legacy } = await docsFor(uid, id);
  await runTransaction(db, async (tx) => {
    let ref = primary;
    let snap = await tx.get(primary);
    if (!snap.exists() && legacy) {
      const old = await tx.get(legacy);
      if (old.exists() && samePaper(old, id)) {
        ref = legacy;
        snap = old;
      }
    }
    // undefined means "clear this field" (e.g. remove from a collection).
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(changes)) {
      if (k === "notes" && typeof v === "string") {
        // Two tabs editing notes must keep both texts, not overwrite one.
        const kept = snap.exists() ? (snap.data().notes as string | undefined) : undefined;
        patch[k] = clampValue(k, joinNotes(kept, v) ?? "");
      } else {
        patch[k] = v === undefined ? deleteField() : clampValue(k, v);
      }
    }
    if (snap.exists()) tx.update(ref, patch);
    else tx.set(ref, patch, { merge: true });
  });
}

/**
 * Save many papers; Firestore batches hold at most 500 writes. A batch is
 * atomic, so one record the rules reject would lose the other 399 — on failure,
 * retry the chunk one document at a time and skip only what genuinely fails.
 * Returns the ids that were written, so callers never assume the rest were.
 */
export async function fsSaveMany(uid: string, papers: SavedPaper[]): Promise<string[]> {
  const saved: string[] = [];
  // Transactions are heavier than batches, so keep the chunk small.
  for (let i = 0; i < papers.length; i += 100) {
    const chunk = papers.slice(i, i + 100);
    const entries = chunk.map((p) => {
      const primary = doc(db, "users", uid, "papers", safeId(p.id));
      const legacyKey = legacySafeId(p.id);
      return { p, primary, legacy: legacyKey !== primary.id ? doc(db, "users", uid, "papers", legacyKey) : null };
    });
    try {
      await runTransaction(db, async (tx) => {
        // All reads must happen before the first write.
        const snaps = await Promise.all(entries.map((e) => tx.get(e.primary)));
        const legacySnaps = await Promise.all(
          entries.map((e, n) => (e.legacy && !snaps[n].exists() ? tx.get(e.legacy) : Promise.resolve(null)))
        );
        entries.forEach((e, n) => {
          let kept: SavedPaper | undefined;
          if (snaps[n].exists()) kept = snaps[n].data() as SavedPaper;
          const old = legacySnaps[n];
          if (!kept && old?.exists() && samePaper(old, e.p.id)) {
            kept = old.data() as SavedPaper;
            tx.delete(e.legacy!);
          }
          tx.set(e.primary, forFirestore(mergeSavedPaper(kept, e.p), e.primary.id));
        });
      });
      saved.push(...chunk.map((p) => p.id));
    } catch {
      for (const p of chunk) {
        await fsSavePaper(uid, p).then(() => saved.push(p.id), () => {});
      }
    }
  }
  return saved;
}

/** Read a whole library in pages, so a large account never loads in one query. */
const PAGE_SIZE = 500;

export async function fsAllPapers(uid: string): Promise<SavedPaper[]> {
  const papers: SavedPaper[] = [];
  const base = collection(db, "users", uid, "papers");
  let after: DocumentSnapshot | null = null;
  for (;;) {
    const q: Query = after
      ? query(base, orderBy("savedAt", "desc"), startAfter(after), limit(PAGE_SIZE))
      : query(base, orderBy("savedAt", "desc"), limit(PAGE_SIZE));
    const snap: QuerySnapshot = await getDocs(q);
    papers.push(...snap.docs.map((d) => d.data() as SavedPaper));
    if (snap.size < PAGE_SIZE) break;
    after = snap.docs[snap.docs.length - 1];
  }
  return papers;
}

/** Count without downloading: billed as one read per 1,000 papers. */
export async function fsCountPapers(uid: string): Promise<number> {
  const snap = await getCountFromServer(collection(db, "users", uid, "papers"));
  return snap.data().count;
}

/** Delete every saved paper (account deletion). Batches hold at most 500 writes. */
export async function fsDeleteAllPapers(uid: string): Promise<void> {
  const base = collection(db, "users", uid, "papers");
  // Delete one batch at a time; deleted documents leave the next page, so this
  // terminates even for an account with more papers than one query returns.
  for (;;) {
    const snap = await getDocs(query(base, limit(400)));
    if (snap.empty) return;
    const batch = writeBatch(db);
    for (const d of snap.docs) batch.delete(d.ref);
    await batch.commit();
  }
}

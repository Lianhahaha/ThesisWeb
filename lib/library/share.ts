"use client";

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { SavedPaper } from "@/lib/types";
import { sharedPapers, type SharedLibrary } from "@/lib/library/shared-copy";

/** Reading and writing group libraries in Firestore; the data shape is in shared-copy.ts. */

export function shareUrl(id: string): string {
  return `${window.location.origin}/shared/${id}`;
}

export async function getShare(id: string): Promise<SharedLibrary | null> {
  const snap = await getDoc(doc(db, "shared", id));
  return snap.exists() ? ({ ...(snap.data() as Omit<SharedLibrary, "id">), id: snap.id }) : null;
}

/** The signed-in user's own shares, newest first. */
export async function listMyShares(uid: string): Promise<SharedLibrary[]> {
  const snap = await getDocs(query(collection(db, "shared"), where("owner", "==", uid)));
  return snap.docs
    .map((d) => ({ ...(d.data() as Omit<SharedLibrary, "id">), id: d.id }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Create a share, or replace the papers of an existing one (`id`). Returns its id. */
export async function publishShare(opts: {
  id?: string;
  owner: string;
  ownerName: string;
  name: string;
  papers: SavedPaper[];
  includeNotes: boolean;
  createdAt?: number;
}): Promise<string> {
  const ref = opts.id ? doc(db, "shared", opts.id) : doc(collection(db, "shared"));
  const now = Date.now();
  await setDoc(ref, {
    owner: opts.owner,
    ownerName: opts.ownerName.slice(0, 60),
    name: opts.name.trim().slice(0, 100) || "Shared library",
    papers: sharedPapers(opts.papers, opts.includeNotes),
    createdAt: opts.createdAt ?? now,
    updatedAt: now,
  });
  return ref.id;
}

export async function deleteShare(id: string): Promise<void> {
  await deleteDoc(doc(db, "shared", id));
}

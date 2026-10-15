"use client";

import { create } from "zustand";
import { fsSavedAmong } from "@/lib/library/firestore";

/**
 * Which papers are in the signed-in account's library, for the Save buttons.
 * A results page shows hundreds of buttons; each used to read its own paper
 * from Firestore. Now every button that asks in the same render shares one
 * batched lookup (fsSavedAmong), the answers are kept for the visit, and
 * saving or removing a paper (lib/library/store.ts) updates them directly,
 * so every button showing that paper changes at once.
 */

interface SavedState {
  /** Whose answers these are; a different account starts over. */
  uid: string | null;
  /** Paper id -> saved. A missing id hasn't been looked up yet. */
  saved: Record<string, boolean>;
}

export const useSavedState = create<SavedState>(() => ({ uid: null, saved: {} }));

/** Ids waiting for the next batch, and ids whose batch is in flight. */
let queued = new Set<string>();
const asking = new Set<string>();

function forAccount(uid: string): void {
  if (useSavedState.getState().uid === uid) return;
  useSavedState.setState({ uid, saved: {} });
  queued = new Set();
  asking.clear();
}

/** Look up whether `id` is saved. Requests made in the same tick go out as one batch. */
export function requestSavedState(uid: string, id: string): void {
  forAccount(uid);
  if (id in useSavedState.getState().saved || queued.has(id) || asking.has(id)) return;
  const first = queued.size === 0;
  queued.add(id);
  if (first) queueMicrotask(() => flush(uid));
}

async function flush(uid: string): Promise<void> {
  const ids = [...queued];
  queued = new Set();
  if (ids.length === 0) return;
  for (const id of ids) asking.add(id);
  // A failed lookup counts as "not saved", as before; saving still merges with
  // any copy already in the account, so nothing is overwritten.
  const found = await fsSavedAmong(uid, ids).catch(() => new Set<string>());
  for (const id of ids) asking.delete(id);
  if (useSavedState.getState().uid !== uid) return;
  useSavedState.setState((s) => ({ saved: { ...s.saved, ...Object.fromEntries(ids.map((id) => [id, found.has(id)])) } }));
}

/** Record papers just saved to or removed from the account. */
export function setSavedState(uid: string, ids: string[], saved: boolean): void {
  if (ids.length === 0) return;
  forAccount(uid);
  useSavedState.setState((s) => ({ saved: { ...s.saved, ...Object.fromEntries(ids.map((id) => [id, saved])) } }));
}

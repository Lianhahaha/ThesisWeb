"use client";

import { deleteField, doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * One-time cleanup of the retired recovery-PIN feature (removed October 2026,
 * replaced by email reset links and Google sign-in). When an old account signs
 * in, its legacy PIN hash is deleted from its private profile, and the browser
 * keys that feature left behind are removed. The public recovery/ and
 * email_map/ collections are deleted in the Firebase console instead (README).
 *
 * Runs once per browser tab session. Safe to delete this file, and its call in
 * lib/auth/store.ts, once old accounts have had time to sign in (2027).
 */

const CHECKED = "tw-legacy-cleanup";

export async function removeRetiredRecoveryData(uid: string): Promise<void> {
  try {
    if (sessionStorage.getItem(CHECKED) === uid) return;
  } catch {
    // Storage blocked: check every time.
  }
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("tw_emailmap_") || key.startsWith("tw_pinmigrated_")) localStorage.removeItem(key);
    }
  } catch {
    // Ignore.
  }
  const ref = doc(db, "users", uid, "profile", "main");
  const snap = await getDoc(ref);
  if (snap.exists() && "mpinHash" in snap.data()) await updateDoc(ref, { mpinHash: deleteField() });
  try {
    sessionStorage.setItem(CHECKED, uid);
  } catch {
    // Ignore.
  }
}

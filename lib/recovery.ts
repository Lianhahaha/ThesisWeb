"use client";

import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { hashMPIN } from "@/lib/utils";

/**
 * Recovery PIN and email lookup for the signed-out "forgot password" page.
 *
 * The PIN hash lives in its own recovery/{uid} document so the profile can
 * stay private. It only gates sending Firebase's reset email, and that email
 * always goes to the account's own inbox, so a guessed PIN can't take over an
 * account.
 */

/** Raised when an account has no PIN, so the UI can say what to do instead. */
export class NoRecoveryPinError extends Error {
  constructor() {
    super("This account has no recovery PIN, so it cannot be recovered this way.");
    this.name = "NoRecoveryPinError";
  }
}

/** email_map key: lower-cased, "." → "_" (Firestore rules check the same). */
export function emailKey(email: string): string {
  return email.trim().toLowerCase().replace(/\./g, "_");
}

export async function writeEmailMap(uid: string, email: string): Promise<void> {
  const e = email.trim().toLowerCase();
  await setDoc(doc(db, "email_map", emailKey(e)), { uid, email: e });
}

/**
 * Point email_map at the account's current address. Runs on every sign-in:
 * the entry is missing when the write at sign-up failed, and goes stale when
 * the email is changed (verifying the new address signs the user out before
 * Settings can update it). Either way recovery said "No account found".
 * The last synced address is remembered per browser, so this costs one write
 * per address, and the old address's entry is removed when it changes.
 */
export async function syncEmailMap(uid: string, email: string): Promise<void> {
  const e = email.trim().toLowerCase();
  const storeKey = `tw_emailmap_${uid}`;
  let last: string | null = null;
  try {
    last = localStorage.getItem(storeKey);
  } catch {
    // Storage blocked: just write every time.
  }
  if (last === e) return;
  await writeEmailMap(uid, e);
  if (last && emailKey(last) !== emailKey(e)) {
    await deleteDoc(doc(db, "email_map", emailKey(last))).catch(() => {});
  }
  try {
    localStorage.setItem(storeKey, e);
  } catch {
    // Ignore.
  }
}

export async function setRecoveryPin(uid: string, pin: string): Promise<void> {
  await setDoc(doc(db, "recovery", uid), { mpinHash: await hashMPIN(pin) });
}

/** uid for an email, or null if no account registered it. */
export async function lookupUid(email: string): Promise<string | null> {
  const snap = await getDoc(doc(db, "email_map", emailKey(email)));
  return snap.exists() ? (snap.data().uid as string) : null;
}

/**
 * True if the PIN matches. There is no default PIN: an account that never set
 * one has no recovery path, rather than one every reader of this code knows.
 */
export async function checkRecoveryPin(uid: string, pin: string): Promise<boolean> {
  const snap = await getDoc(doc(db, "recovery", uid));
  if (!snap.exists()) throw new NoRecoveryPinError();
  return (await hashMPIN(pin)) === (snap.data().mpinHash as string);
}

/** True once the account has a PIN, so the UI can nudge the owner to set one. */
export async function hasRecoveryPin(uid: string): Promise<boolean> {
  return (await getDoc(doc(db, "recovery", uid))).exists();
}

/**
 * Older accounts kept the PIN hash inside the (now private) profile. When the
 * owner is signed in, copy it across so recovery keeps their chosen PIN. An
 * account with no PIN anywhere is left alone for the owner to set one.
 */
export async function migrateRecoveryPin(uid: string): Promise<void> {
  const rec = await getDoc(doc(db, "recovery", uid));
  if (rec.exists()) return;
  const profile = await getDoc(doc(db, "users", uid, "profile", "main"));
  const legacy = profile.exists() ? profile.data().mpinHash : undefined;
  if (typeof legacy === "string" && legacy.length === 64) {
    await setDoc(doc(db, "recovery", uid), { mpinHash: legacy });
  }
}

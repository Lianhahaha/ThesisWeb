"use client";

import { signOut } from "firebase/auth";
import { clearIndexedDbPersistence, terminate } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { clearCachedUsername } from "@/lib/auth/username-cache";

/**
 * Sign out and leave nothing of the account in this browser: the cached
 * display name and Firestore's offline copy of the library. School and
 * internet-cafe computers are shared, and the next person must not find the
 * last student's papers and notes there. Clearing the copy shuts Firestore
 * down, so the page reloads at `to` (after `delayMs`).
 */
export async function signOutAndForget(uid: string | null, { to = "/", delayMs = 0 } = {}): Promise<void> {
  if (uid) clearCachedUsername(uid);
  await signOut(auth).catch(() => {});
  await forgetOfflineCopy();
  // A delay leaves time to read a message shown just before.
  setTimeout(() => window.location.assign(to), delayMs);
}

/** Drop Firestore's offline copy (after signing out, or after the account is deleted). */
export async function forgetOfflineCopy(): Promise<void> {
  try {
    await terminate(db);
    await clearIndexedDbPersistence(db);
  } catch {
    // Another tab still has it open; it is cleared when the last one closes.
  }
}

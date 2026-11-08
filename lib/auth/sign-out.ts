"use client";

import { signOut } from "firebase/auth";
import { clearIndexedDbPersistence, terminate } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { clearAllCachedUsernames } from "@/lib/auth/username-cache";
import { clearLocalLibrary } from "@/lib/library/store";
import { clearSearchHistory } from "@/lib/search/history";
import { clearSavedSearches } from "@/lib/search/saved";
import { forgetLastSearch } from "@/lib/search/last-search";
import { clearRecentPapers } from "@/lib/search/recent-papers";

/** Paths whose cached HTML must never outlive the session that opened them. */
const PRIVATE_PREFIXES = ["/library", "/settings", "/shared/", "/paper/", "/login", "/forgot-password", "/search"];

function isPrivatePath(pathname: string): boolean {
  return PRIVATE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));
}

/**
 * Sign out and leave nothing of the account in this browser: the cached
 * display name and Firestore's offline copy of the library. School and
 * internet-cafe computers are shared, and the next person must not find the
 * last student's papers and notes there. Clearing the copy shuts Firestore
 * down, so the page reloads at `to` (after `delayMs`).
 */
export async function signOutAndForget(_uid: string | null, { to = "/", delayMs = 0 } = {}): Promise<void> {
  await signOut(auth).catch(() => {});
  await forgetOfflineCopy();
  await clearPrivateBrowserData();
  // A delay leaves time to read a message shown just before.
  setTimeout(() => window.location.assign(to), delayMs);
}

/**
 * Remove everything this browser kept for the signed-in student: the
 * Firestore offline copy (above), local papers, search history, pinned
 * searches, this tab's cached results, cached display names, and any private
 * page the service worker cached. School and internet-cafe computers are
 * shared; the next person must not find the last student's work.
 */
export async function clearPrivateBrowserData(): Promise<void> {
  clearSearchHistory();
  clearSavedSearches();
  forgetLastSearch();
  clearRecentPapers();
  clearAllCachedUsernames();
  await clearLocalLibrary();
  await clearPrivateCaches();
}

/** Delete cached HTML for private routes, keeping public/offline assets. */
async function clearPrivateCaches(): Promise<void> {
  if (typeof caches === "undefined") return;
  try {
    const names = await caches.keys();
    await Promise.all(
      names.map(async (name) => {
        const cache = await caches.open(name);
        const requests = await cache.keys();
        await Promise.all(
          requests.filter((req) => isPrivatePath(new URL(req.url).pathname)).map((req) => cache.delete(req))
        );
      })
    );
  } catch {
    // Cache Storage blocked: nothing to clear.
  }
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

"use client";

/**
 * The signed-in user's display name, cached in this browser so the header can
 * show it without a Firestore read on every page. The profile document stays
 * the source of truth; the cache is refreshed whenever the profile is read.
 * Storage can be blocked (private mode, some in-app browsers), so every access
 * is guarded: a failure only means the name is fetched again.
 */

/** Fired with the new name as `detail` when the cached name changes. */
export const USERNAME_EVENT = "tw:usernameChanged";

const key = (uid: string) => `tw_username_${uid}`;

export function getCachedUsername(uid: string): string | null {
  try {
    return localStorage.getItem(key(uid));
  } catch {
    return null;
  }
}

/** Cache a name and tell the header. Empty names are not cached. */
export function cacheUsername(uid: string, name: string): void {
  if (!name) return;
  try {
    localStorage.setItem(key(uid), name);
  } catch {
    // Storage blocked: the header still gets the event below.
  }
  window.dispatchEvent(new CustomEvent(USERNAME_EVENT, { detail: name }));
}

export function clearCachedUsername(uid: string): void {
  try {
    localStorage.removeItem(key(uid));
  } catch {
    // Ignore.
  }
}

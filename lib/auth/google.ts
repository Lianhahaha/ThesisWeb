"use client";

import {
  GoogleAuthProvider,
  getAdditionalUserInfo,
  getRedirectResult,
  reauthenticateWithPopup,
  signInWithPopup,
  signInWithRedirect,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { cacheUsername } from "@/lib/auth/username-cache";

/**
 * "Continue with Google". Most students already have a Gmail account, so this
 * means no new password to remember and nothing to recover: Google handles
 * both. Needs the Google provider switched on in the Firebase console.
 */

function provider(): GoogleAuthProvider {
  const p = new GoogleAuthProvider();
  // Shared and lab computers often have several Google accounts signed in.
  p.setCustomParameters({ prompt: "select_account" });
  return p;
}

/** Give a first sign-in a profile named after the Google account. */
async function ensureProfile(user: User): Promise<void> {
  const ref = doc(db, "users", user.uid, "profile", "main");
  // A failed profile write must not undo a successful sign-in.
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      const name = (user.displayName || user.email?.split("@")[0] || "").slice(0, 60);
      await setDoc(ref, { username: name, createdAt: Date.now() });
      if (name) cacheUsername(user.uid, name);
    }
  } catch {
    // Settings can set the name later.
  }
}

/** Popups some browsers refuse outright; a redirect always works there. */
const REDIRECT_CODES = new Set(["auth/popup-blocked", "auth/operation-not-supported-in-this-environment"]);

/**
 * Sign in (or sign up) with Google. Returns null when the browser blocked the
 * popup and the page is redirecting to Google instead.
 */
export async function signInWithGoogle(): Promise<{ user: User; isNew: boolean } | null> {
  try {
    const cred = await signInWithPopup(auth, provider());
    await ensureProfile(cred.user);
    return { user: cred.user, isNew: getAdditionalUserInfo(cred)?.isNewUser ?? false };
  } catch (err) {
    const code = (err as { code?: string })?.code ?? "";
    if (!REDIRECT_CODES.has(code)) throw err;
    await signInWithRedirect(auth, provider());
    return null;
  }
}

// React's development mode mounts effects twice. Both reads must share one
// promise, or the second call finds the result already consumed and returns null.
let redirectResult: Promise<{ user: User; isNew: boolean } | null> | null = null;

/** Finish a sign-in that was sent through Google's full-page redirect. */
export function finishGoogleRedirect(): Promise<{ user: User; isNew: boolean } | null> {
  redirectResult ??= (async () => {
    const cred = await getRedirectResult(auth);
    if (!cred) return null;
    await ensureProfile(cred.user);
    return { user: cred.user, isNew: getAdditionalUserInfo(cred)?.isNewUser ?? false };
  })();
  return redirectResult;
}

/** Confirm it is really the owner (for deleting the account) by signing in with Google again. */
export async function confirmWithGoogle(user: User): Promise<void> {
  await reauthenticateWithPopup(user, provider());
}

/** True if the account signs in with a password (Google-only accounts have none to change). */
export function hasPassword(user: User): boolean {
  return user.providerData.some((p) => p.providerId === "password");
}

export function hasGoogle(user: User): boolean {
  return user.providerData.some((p) => p.providerId === "google.com");
}

/**
 * Facebook, Messenger, Instagram and similar apps open links in their own
 * browser, where Google refuses to sign anyone in. Students share links
 * there constantly, so the sign-in page says what to do instead.
 */
export function isInAppBrowser(userAgent: string): boolean {
  return /FBAN|FBAV|FB_IAB|Messenger|Instagram|Line\/|TikTok|Twitter/i.test(userAgent);
}

/** Google sign-in errors in plain words; null when the student just closed the window. */
export function googleErrorMessage(err: unknown): string | null {
  const code = (err as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
    case "auth/user-cancelled":
      return null;
    case "auth/popup-blocked":
      return "Your browser blocked the Google window. Allow pop-ups for this site and try again.";
    case "auth/operation-not-allowed":
      return "Google sign-in isn't switched on for this site yet. Use email and password for now.";
    case "auth/unauthorized-domain":
      return "This web address isn't allowed to use Google sign-in yet.";
    case "auth/account-exists-with-different-credential":
      return "This email already has a Thesisweb account. Sign in with your email and password.";
    case "auth/user-mismatch":
      return "That's a different Google account from the one you're signed in with.";
    case "auth/web-storage-unsupported":
      return "This browser blocks the storage Google sign-in needs. Open the site in Chrome or Safari.";
    case "auth/network-request-failed":
      return "No connection. Check your internet and try again.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a few minutes and try again.";
    default:
      return "Google sign-in failed. Try again, or use email and password.";
  }
}

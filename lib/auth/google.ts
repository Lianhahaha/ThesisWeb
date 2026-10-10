"use client";

import {
  GoogleAuthProvider,
  getAdditionalUserInfo,
  reauthenticateWithPopup,
  signInWithPopup,
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

/** Sign in (or sign up) with Google; a first sign-in gets a profile named after the Google account. */
export async function signInWithGoogle(): Promise<{ user: User; isNew: boolean }> {
  const cred = await signInWithPopup(auth, provider());
  const user = cred.user;
  const isNew = getAdditionalUserInfo(cred)?.isNewUser ?? false;
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
  return { user, isNew };
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

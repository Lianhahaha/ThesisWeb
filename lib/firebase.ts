"use client";

import { initializeApp, getApps } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, initializeFirestore, connectFirestoreEmulator, type Firestore } from "firebase/firestore";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase only once
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);

// Search results often carry optional fields left undefined (no TL;DR, no
// DOI). Firestore rejects undefined values outright, so drop them on write.
// initializeFirestore may only run once per app; hot reload re-evaluates this.
function initDb(): Firestore {
  try {
    return initializeFirestore(app, {
      ignoreUndefinedProperties: true,
      // The emulator's streaming channel is unreliable in some browsers.
      ...(process.env.NEXT_PUBLIC_FIREBASE_EMULATORS === "1" ? { experimentalForceLongPolling: true } : {}),
    });
  } catch {
    return getFirestore(app);
  }
}
export const db = initDb();

// Local testing only: `NEXT_PUBLIC_FIREBASE_EMULATORS=1` points the app at the
// Auth (9099) and Firestore (8085) emulators instead of the live project.
if (process.env.NEXT_PUBLIC_FIREBASE_EMULATORS === "1" && typeof window !== "undefined") {
  try {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "127.0.0.1", 8085);
  } catch {
    // Already connected (hot reload).
  }
}

/**
 * Firebase Analytics. Browser-only (it reads window/document), needs
 * measurementId, and isSupported() rules out browsers that block it
 * (Safari private mode, some ad/tracker blockers, non-browser environments).
 * Skipped against the emulators — there's no Analytics emulator and local
 * testing shouldn't add rows to production data.
 */
let _analytics: Analytics | null = null;
export function getFirebaseAnalytics(): Analytics | null {
  return _analytics;
}
if (
  typeof window !== "undefined" &&
  firebaseConfig.measurementId &&
  process.env.NEXT_PUBLIC_FIREBASE_EMULATORS !== "1"
) {
  isSupported()
    .then((ok) => {
      if (ok) _analytics = getAnalytics(app);
    })
    .catch(() => {
      // Unsupported or blocked: analytics silently stays off.
    });
}

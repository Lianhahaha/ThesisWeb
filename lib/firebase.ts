"use client";

import { initializeApp, getApps } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { initializeAppCheck, ReCaptchaEnterpriseProvider, ReCaptchaV3Provider } from "firebase/app-check";
import {
  getFirestore,
  initializeFirestore,
  connectFirestoreEmulator,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";
import type { Analytics } from "firebase/analytics";

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

// App Check attests that Firebase requests come from this app, not a script
// using the (public) Firebase config. It is opt-in: a provider can fail in
// ways that block Auth and Firestore for every user (for example, a reCAPTCHA
// Enterprise key whose Google Cloud project has no billing account). While it
// is off, Firestore security rules remain the access boundary.
//
// To turn it on: add a working reCAPTCHA key, set NEXT_PUBLIC_APP_CHECK_ENABLED=1
// in Vercel, confirm App Check shows valid tokens, then enable enforcement for
// Auth and Firestore in Firebase Console > App Check > APIs. reCAPTCHA v3 is
// free; the Enterprise provider needs a billing account. The v3 key wins when
// both are configured.
const appCheckEnabled = process.env.NEXT_PUBLIC_APP_CHECK_ENABLED === "1";
const appCheckV3Key = process.env.NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY?.trim();
const appCheckEnterpriseKey = process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY?.trim();
if (typeof window !== "undefined" && appCheckEnabled && process.env.NEXT_PUBLIC_FIREBASE_EMULATORS !== "1") {
  const provider = appCheckV3Key
    ? new ReCaptchaV3Provider(appCheckV3Key)
    : appCheckEnterpriseKey
    ? new ReCaptchaEnterpriseProvider(appCheckEnterpriseKey)
    : null;
  if (provider) {
    try {
      initializeAppCheck(app, {
        provider,
        isTokenAutoRefreshEnabled: true,
      });
    } catch {
      // Hot reload or a second initialization: the first one stays active.
    }
  }
}

export const auth = getAuth(app);

// Search results often carry optional fields left undefined (no TL;DR, no
// DOI). Firestore rejects undefined values outright, so drop them on write.
// initializeFirestore may only run once per app; hot reload re-evaluates this.
function initDb(): Firestore {
  try {
    return initializeFirestore(app, {
      ignoreUndefinedProperties: true,
      // A copy of the account's library in this browser (IndexedDB, shared by
      // open tabs), so it opens offline. Signing out wipes it
      // (lib/auth/sign-out.ts), as school computers are shared.
      localCache:
        typeof window !== "undefined"
          ? persistentLocalCache({ tabManager: persistentMultipleTabManager() })
          : memoryLocalCache(),
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
  // Imported on demand: the Analytics SDK is not needed for the page to work,
  // and importing it statically put it in the bundle every visitor downloads.
  void import("firebase/analytics")
    .then(async (analytics) => {
      if (await analytics.isSupported()) _analytics = analytics.getAnalytics(app);
    })
    .catch(() => {
      // Unsupported or blocked: analytics silently stays off.
    });
}

"use client";

import { logEvent } from "firebase/analytics";
import { getFirebaseAnalytics } from "@/lib/firebase";

/**
 * Fire-and-forget custom events, on top of the automatic page_view in
 * FirebaseAnalytics.tsx. No-op until Analytics is ready (or if unsupported).
 * Names follow Firebase's recommended events so they get first-class
 * treatment in the console (conversion tracking, funnels).
 */
export function trackEvent(name: string, params?: Record<string, string | number | boolean>): void {
  const analytics = getFirebaseAnalytics();
  if (analytics) logEvent(analytics, name, params);
}

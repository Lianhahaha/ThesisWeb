"use client";

import { LEGAL_UPDATED } from "@/lib/legal";

/**
 * Terms acceptance is per device, like the other preferences. The stored
 * value is the date the legal pages were last updated, so a change to either
 * page asks everyone to read and accept again.
 */

const KEY = "tw-terms-accepted";

export function hasAcceptedTerms(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(KEY) === LEGAL_UPDATED;
  } catch {
    return false;
  }
}

export function acceptTerms(): void {
  try {
    localStorage.setItem(KEY, LEGAL_UPDATED);
  } catch {
    // Storage blocked: the dialog stays closed until this page is reloaded.
  }
}

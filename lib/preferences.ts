"use client";

import type { CitationStyle } from "@/lib/citations";

/**
 * Per-device preferences (localStorage). Used by search defaults and
 * citation pickers; edited on the Settings page. Storage can be blocked, so
 * every access falls back to the defaults.
 */

export interface Preferences {
  /** Years back for "Published since"; 0 means any year. */
  yearsBack: number;
  country: string | null;
  openAccessOnly: boolean;
  citationStyle: CitationStyle;
}

export const DEFAULT_PREFERENCES: Preferences = {
  yearsBack: 5,
  country: null,
  openAccessOnly: false,
  citationStyle: "apa",
};

const KEY = "tw-prefs";
const STYLES: CitationStyle[] = ["apa", "mla", "ieee", "chicago"];
const YEARS = [0, 1, 3, 5, 10];

export const PREFS_EVENT = "tw:prefs";

export function getPreferences(): Preferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}") as Partial<Preferences>;
    return {
      yearsBack: YEARS.includes(raw.yearsBack as number) ? (raw.yearsBack as number) : DEFAULT_PREFERENCES.yearsBack,
      country: typeof raw.country === "string" && raw.country ? raw.country.slice(0, 60) : null,
      openAccessOnly: raw.openAccessOnly === true,
      citationStyle: STYLES.includes(raw.citationStyle as CitationStyle)
        ? (raw.citationStyle as CitationStyle)
        : DEFAULT_PREFERENCES.citationStyle,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function setPreferences(p: Preferences): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // Storage blocked: preferences apply until the page closes.
  }
  window.dispatchEvent(new Event(PREFS_EVENT));
}

/** "Published since" year for a preference; 0 stays 0 (any year). */
export function fromYearFor(p: Preferences, now = new Date().getFullYear()): number {
  return p.yearsBack === 0 ? 0 : now - p.yearsBack;
}

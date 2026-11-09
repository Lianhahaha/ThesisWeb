import type { Page } from "@playwright/test";
import { LEGAL_UPDATED } from "../../lib/legal";

/**
 * Marks the terms gate as already accepted before the app boots, so the e2e
 * journeys test the app itself instead of the first-run dialog.
 */
export async function acceptTerms(page: Page) {
  await page.addInitScript((value) => {
    localStorage.setItem("tw-terms-accepted", value);
  }, LEGAL_UPDATED);
}

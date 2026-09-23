/**
 * Shared details for the Privacy Policy and Terms pages. Move the date
 * whenever either page changes what it says the app does.
 */

export const LEGAL_UPDATED = "23 September 2026";

/**
 * Where privacy and account-deletion requests go. A privacy policy needs a
 * reachable address, so set NEXT_PUBLIC_CONTACT_EMAIL before deploying.
 */
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "set-your-email@example.com";

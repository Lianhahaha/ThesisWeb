/**
 * Shared details for the Privacy Policy and Terms pages. Move the date
 * whenever either page changes what it says the app does.
 */

export const LEGAL_UPDATED = "23 September 2026";

/**
 * Where privacy and account-deletion requests go.
 * NEXT_PUBLIC_CONTACT_EMAIL overrides it per deployment.
 */
export const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL || "projectneodevcoe@gmail.com";

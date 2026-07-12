import { fetchWithTimeout, safeJson } from "@/lib/utils";

/**
 * Unpaywall adapter — find a legal, open-access PDF for a given DOI.
 * - Free, requires only an email for the polite pool.
 * - Returns the best OA location (priority: pdf > landing page).
 * - We ONLY use legal OA sources: publisher OA, repositories, preprints.
 * Docs: https://unpaywall.org/products/api
 */

/**
 * Unpaywall requires a *real, contactable* email for the polite pool — it
 * rejects obvious placeholders like "example.com". Set UNPAYWALL_EMAIL in
 * your environment to your own address. If unset, the OA lookup is skipped
 * (the rest of the app still works).
 */
const EMAIL = process.env.UNPAYWALL_EMAIL?.trim() || "";
const BASE = "https://api.unpaywall.org/v2";

interface UnpaywallResponse {
  is_oa: boolean;
  oa_status?: string; // gold | green | hybrid | bronze | closed
  best_oa_location?: {
    url_for_pdf?: string | null;
    url?: string | null;
    host_type?: string;
    license?: string | null;
    version?: string; // publishedVersion | acceptedManuscript | submittedVersion
  } | null;
  oa_locations?: {
    url_for_pdf?: string | null;
    url?: string | null;
    host_type?: string;
    version?: string;
  }[];
}

export interface OaResult {
  found: boolean;
  url: string | null;
  status?: string;
  /** "pdf" if a direct PDF link, "landing" if a page to find it, null otherwise */
  kind?: "pdf" | "landing" | null;
  version?: string;
}

export async function findOaPdf(doi: string): Promise<OaResult> {
  // If no real email is configured, skip cleanly instead of hitting a 422.
  if (!EMAIL) return { found: false, url: null, kind: null };
  const url = `${BASE}/${encodeURIComponent(doi)}?email=${encodeURIComponent(EMAIL)}`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) return { found: false, url: null };
  const data = await safeJson<UnpaywallResponse>(res);
  if (!data) return { found: false, url: null };

  // Prefer a direct PDF, prefer published version, then any OA location.
  const all = [data.best_oa_location, ...(data.oa_locations || [])].filter(Boolean) as NonNullable<
    UnpaywallResponse["best_oa_location"]
  >[];

  const pdf =
    all.find((l) => l.url_for_pdf && l.version === "publishedVersion") ||
    all.find((l) => l.url_for_pdf) ||
    null;

  if (pdf?.url_for_pdf) {
    return {
      found: true,
      url: pdf.url_for_pdf,
      status: data.oa_status,
      kind: "pdf",
      version: pdf.version,
    };
  }

  const landing = all.find((l) => l.url) || null;
  if (landing?.url) {
    return {
      found: true,
      url: landing.url,
      status: data.oa_status,
      kind: "landing",
      version: landing.version,
    };
  }

  return { found: false, url: null, status: data.oa_status };
}

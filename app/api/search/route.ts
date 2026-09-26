import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { metaSearch } from "@/lib/search";

export const dynamic = "force-dynamic";
// Search fans out to ~20 external APIs; give the function room beyond the
// platform default so the per-source deadline (not the platform) ends slow ones.
export const maxDuration = 30;

/**
 * GET /api/search?q=...&fromYear=...&openAccessOnly=...
 * Server-side meta-search across OpenAlex, Crossref, Semantic Scholar.
 *
 * The server proxies these calls to:
 *  - Avoid CORS issues from the browser
 *  - Centralize rate-limit handling and timeouts
 *  - Keep the source adapters out of the client bundle (smaller, no secret keys)
 */
export async function GET(req: NextRequest) {
  const limited = rateLimit(req, "search");
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  // Caps keep a single request from fanning huge strings out to ~19 APIs.
  const query = (searchParams.get("q") || "").trim().slice(0, 300);
  const fromYear = searchParams.get("fromYear");
  const openAccessOnly = searchParams.get("openAccessOnly") === "1";
  const country = (searchParams.get("country") || "").trim().slice(0, 60) || null;

  if (!query || query.length < 3) {
    return NextResponse.json(
      { error: "Query must be at least 3 characters." },
      { status: 400 }
    );
  }

  // Default recency: last 5 years, counting this one (2022+ in 2026), the
  // same as the search form's default. It used to be one year wider.
  const currentYear = new Date().getFullYear();
  const defaultYear = currentYear - 4;
  const parsedYear = fromYear ? Number(fromYear) : defaultYear;
  const year = Number.isFinite(parsedYear) && parsedYear >= 0 && parsedYear <= currentYear + 1
    ? parsedYear
    : defaultYear;

  try {
    const result = await metaSearch(query, {
      fromYear: year,
      openAccessOnly,
      perSource: 15,
      country: country ?? undefined,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Search failed" },
      { status: 502 }
    );
  }
}

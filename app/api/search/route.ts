import { NextRequest, NextResponse } from "next/server";
import { metaSearch } from "@/lib/search";

export const dynamic = "force-dynamic";

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
  const { searchParams } = new URL(req.url);
  const query = (searchParams.get("q") || "").trim();
  const fromYear = searchParams.get("fromYear");
  const openAccessOnly = searchParams.get("openAccessOnly") === "1";
  const country = (searchParams.get("country") || "").trim() || null;

  if (!query || query.length < 3) {
    return NextResponse.json(
      { error: "Query must be at least 3 characters." },
      { status: 400 }
    );
  }

  // Default recency: last 5 years.
  const currentYear = new Date().getFullYear();
  const year = fromYear ? Number(fromYear) : currentYear - 5;

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

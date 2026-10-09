import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { metaSearch } from "@/lib/search";
import { defaultFromYear, MIN_QUERY_LENGTH, parseSearchParams, PER_SOURCE } from "@/lib/search-params";

export const dynamic = "force-dynamic";
// Search fans out to every database in lib/sources/registry.ts; give the
// function room beyond the platform default so the per-source deadline (not
// the platform) ends slow ones.
export const maxDuration = 30;

/**
 * GET /api/search?q=...&from=...&oa=1&country=...
 * The same query string as the search page's URL (lib/search-params.ts), so
 * both sides validate it the same way. Runs the meta-search on the server to
 * avoid CORS, keep API keys and adapters out of the client bundle, and apply
 * one rate limit.
 */
export async function GET(req: NextRequest) {
  const limited = rateLimit(req, "search");
  if (limited) return limited;

  const qs = new URL(req.url).searchParams;
  // Pages loaded before the switch to the shared names still send these.
  if (!qs.has("from") && qs.has("fromYear")) qs.set("from", qs.get("fromYear")!);
  if (!qs.has("oa") && qs.get("openAccessOnly") === "1") qs.set("oa", "1");

  const input = parseSearchParams(qs.toString(), { fromYear: defaultFromYear() });
  if (!input) {
    return NextResponse.json(
      { error: `Query must be at least ${MIN_QUERY_LENGTH} characters.` },
      { status: 400 }
    );
  }

  try {
    const result = await metaSearch(input.query, {
      fromYear: input.fromYear,
      openAccessOnly: input.openAccessOnly,
      perSource: PER_SOURCE,
      country: input.country ?? undefined,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Search failed" },
      { status: 502 }
    );
  }
}

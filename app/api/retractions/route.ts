import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/server/rate-limit";
import { checkIntegrity } from "@/lib/server/retractions";
import { MAX_RESULTS } from "@/lib/search/params";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Most DOIs one request may ask about: a full result set. */
const MAX_DOIS = MAX_RESULTS;

/**
 * POST /api/retractions  { dois: string[] }
 * -> { status: { "<doi>": "retracted" | "concern" } }
 *
 * Runs after search results are on screen, because checking a few hundred
 * DOIs against Crossref takes several seconds.
 */
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, "retractions");
  if (limited) return limited;

  const body = (await req.json().catch(() => null)) as { dois?: unknown } | null;
  const dois = Array.isArray(body?.dois)
    ? body.dois.filter((d): d is string => typeof d === "string" && d.length <= 300).slice(0, MAX_DOIS)
    : [];
  if (dois.length === 0) return NextResponse.json({ status: {} });

  try {
    return NextResponse.json({ status: await checkIntegrity(dois) });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Retraction check failed" },
      { status: 502 }
    );
  }
}

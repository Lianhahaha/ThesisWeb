import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/server/rate-limit";
import { findAbstract } from "@/lib/server/abstract";
import { extractDoi } from "@/lib/text";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

/**
 * GET /api/abstract?doi=...&url=...
 * The abstract of a paper whose database sent none, looked up when the paper
 * is opened (lib/server/abstract.ts). Pages are only read from the
 * databases' own sites. Answers are cached for a day, since abstracts don't
 * change.
 */
export async function GET(req: NextRequest) {
  const limited = await rateLimit(req, "abstract");
  if (limited) return limited;

  const qs = new URL(req.url).searchParams;
  const doi = extractDoi(qs.get("doi"));
  const url = (qs.get("url") ?? "").slice(0, 2000) || null;
  if (!doi && !url) return NextResponse.json({ error: "Provide a DOI or a record link." }, { status: 400 });

  try {
    const result = await findAbstract({ doi, url });
    return NextResponse.json(result, {
      headers: { "Cache-Control": result.abstract ? "public, s-maxage=86400, stale-while-revalidate=604800" : "public, s-maxage=3600" },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Lookup failed" }, { status: 502 });
  }
}

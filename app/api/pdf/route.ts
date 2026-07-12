import { NextRequest, NextResponse } from "next/server";
import { findOaPdf } from "@/lib/sources/unpaywall";

export const dynamic = "force-dynamic";

/**
 * GET /api/pdf?doi=...
 * Resolves a legal open-access PDF URL for a DOI via Unpaywall.
 * Browser calls this to avoid CORS when reading Unpaywall directly.
 */
export async function GET(req: NextRequest) {
  const doi = new URL(req.url).searchParams.get("doi");
  if (!doi) return NextResponse.json({ error: "Missing doi" }, { status: 400 });

  try {
    const result = await findOaPdf(doi);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lookup failed" },
      { status: 502 }
    );
  }
}

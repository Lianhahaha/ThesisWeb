import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/server/rate-limit";
import { findOaPdf } from "@/lib/server/unpaywall";

export const dynamic = "force-dynamic";

/** A bare DOI: "10." + registrant + "/" + suffix. Rejects anything else early. */
const DOI_PATTERN = /^10\.\d{4,9}\/\S{1,200}$/;

/**
 * GET /api/pdf?doi=...
 * Resolves a legal open-access PDF URL for a DOI via Unpaywall.
 * Browser calls this to avoid CORS when reading Unpaywall directly.
 */
export async function GET(req: NextRequest) {
  const limited = await rateLimit(req, "pdf");
  if (limited) return limited;

  const doi = (new URL(req.url).searchParams.get("doi") ?? "").trim();
  if (!DOI_PATTERN.test(doi)) return NextResponse.json({ error: "Provide a valid DOI." }, { status: 400 });

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

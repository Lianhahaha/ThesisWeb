import { NextRequest, NextResponse } from "next/server";
import { getRelatedPapers } from "@/lib/sources/openalex";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

/** A bare DOI: "10." + registrant + "/" + suffix. Rejects anything else early. */
const DOI_PATTERN = /^10\.\d{4,9}\/\S{1,200}$/;

/**
 * GET /api/related?doi=10.1038/nature12373
 * The citation neighbourhood of a paper (references, cited-by, similar) from
 * OpenAlex, for snowballing a literature review from one good paper.
 */
export async function GET(req: NextRequest) {
  const doi = (new URL(req.url).searchParams.get("doi") ?? "").trim();
  if (!DOI_PATTERN.test(doi)) {
    return NextResponse.json({ error: "Provide a valid DOI." }, { status: 400 });
  }

  try {
    const related = await getRelatedPapers(doi, 10);
    if (!related) {
      return NextResponse.json({ error: "This paper isn't in OpenAlex, so its citations aren't available." }, { status: 404 });
    }
    return NextResponse.json(related);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lookup failed" },
      { status: 502 }
    );
  }
}

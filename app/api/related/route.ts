import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/server/rate-limit";
import { cacheGetJson, cacheSetJson } from "@/lib/server/redis-cache";
import { getRelatedPapers } from "@/lib/sources/adapters/openalex";
import { normalizePaper } from "@/lib/sources/normalize";
import type { Paper } from "@/lib/types";

/** The same checks every search result gets, before these reach links and the library. */
const clean = (papers: Paper[]) =>
  papers.map((p) => normalizePaper(p, "openalex")).filter((p): p is Paper => p !== null);

export const dynamic = "force-dynamic";
export const maxDuration = 20;

/** The citation neighbourhood changes slowly; six hours saves repeated OpenAlex calls. */
const RELATED_TTL_SECONDS = 6 * 60 * 60;

interface RelatedResponse {
  references: Paper[];
  citedBy: Paper[];
  similar: Paper[];
}

/** A bare DOI: "10." + registrant + "/" + suffix. Rejects anything else early. */
const DOI_PATTERN = /^10\.\d{4,9}\/\S{1,200}$/;

/**
 * GET /api/related?doi=10.1038/nature12373
 * The citation neighbourhood of a paper (references, cited-by, similar) from
 * OpenAlex, for snowballing a literature review from one good paper.
 */
export async function GET(req: NextRequest) {
  const limited = await rateLimit(req, "related");
  if (limited) return limited;

  const doi = (new URL(req.url).searchParams.get("doi") ?? "").trim();
  if (!DOI_PATTERN.test(doi)) {
    return NextResponse.json({ error: "Provide a valid DOI." }, { status: 400 });
  }

  const key = `tw:related:v1:${doi.toLowerCase()}`;
  const cached = await cacheGetJson<RelatedResponse>(key);
  if (cached) return NextResponse.json(cached);

  try {
    const related = await getRelatedPapers(doi, 10);
    if (!related) {
      return NextResponse.json({ error: "This paper isn't in OpenAlex, so its citations aren't available." }, { status: 404 });
    }
    const body: RelatedResponse = {
      references: clean(related.references),
      citedBy: clean(related.citedBy),
      similar: clean(related.similar),
    };
    void cacheSetJson(key, body, RELATED_TTL_SECONDS);
    return NextResponse.json(body);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lookup failed" },
      { status: 502 }
    );
  }
}

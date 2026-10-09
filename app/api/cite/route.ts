import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { getCrossrefByDoi } from "@/lib/sources/adapters/crossref";
import { getOpenAlexByDoi } from "@/lib/sources/adapters/openalex";
import { normalizePaper } from "@/lib/sources/normalize";
import { extractDoi } from "@/lib/text";
import type { Paper } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_ITEMS = 25;

export interface CiteResult {
  input: string;
  doi: string | null;
  paper: Paper | null;
  error?: string;
}

/**
 * POST /api/cite  { items: string[] }
 * Resolves each DOI (or doi.org link, or any text containing a DOI) to a
 * paper record. Crossref is the registry of record for DOIs, so it goes
 * first; OpenAlex fills in when Crossref has no entry or is down.
 */
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, "cite");
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const items: unknown = body?.items;
  if (!Array.isArray(items) || items.some((i) => typeof i !== "string")) {
    return NextResponse.json({ error: "Send { items: string[] }" }, { status: 400 });
  }

  // Long lines are never DOIs; cap them so a request stays small.
  const lines = (items as string[]).map((s) => s.trim().slice(0, 300)).filter(Boolean);
  if (lines.length === 0) return NextResponse.json({ error: "Paste at least one DOI." }, { status: 400 });
  if (lines.length > MAX_ITEMS) {
    return NextResponse.json({ error: `Up to ${MAX_ITEMS} at a time.` }, { status: 400 });
  }

  const results = await Promise.all(
    lines.map(async (input): Promise<CiteResult> => {
      const doi = extractDoi(input);
      if (!doi) return { input, doi: null, paper: null, error: "No DOI found in this line." };
      let found: Paper | null = null;
      let failed = false;
      for (const lookup of [getCrossrefByDoi, getOpenAlexByDoi]) {
        try {
          found = await lookup(doi);
        } catch {
          failed = true;
        }
        if (found) break;
      }
      const paper = found && normalizePaper(found, found.sources[0] ?? "crossref");
      if (paper) return { input, doi, paper };
      // "Not found" only when both registries answered that they don't know it.
      return { input, doi, paper: null, error: failed ? "Lookup failed. Try again." : "No record found for this DOI." };
    })
  );

  return NextResponse.json({ results });
}

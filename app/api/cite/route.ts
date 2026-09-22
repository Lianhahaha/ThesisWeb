import { NextRequest, NextResponse } from "next/server";
import { getCrossrefByDoi } from "@/lib/sources/crossref";
import { getOpenAlexByDoi } from "@/lib/sources/openalex";
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
 * first; OpenAlex fills in when Crossref has no entry.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const items: unknown = body?.items;
  if (!Array.isArray(items) || items.some((i) => typeof i !== "string")) {
    return NextResponse.json({ error: "Send { items: string[] }" }, { status: 400 });
  }

  const lines = (items as string[]).map((s) => s.trim()).filter(Boolean);
  if (lines.length === 0) return NextResponse.json({ error: "Paste at least one DOI." }, { status: 400 });
  if (lines.length > MAX_ITEMS) {
    return NextResponse.json({ error: `Up to ${MAX_ITEMS} at a time.` }, { status: 400 });
  }

  const results = await Promise.all(
    lines.map(async (input): Promise<CiteResult> => {
      const doi = extractDoi(input);
      if (!doi) return { input, doi: null, paper: null, error: "No DOI found in this line." };
      try {
        const paper = (await getCrossrefByDoi(doi)) ?? (await getOpenAlexByDoi(doi));
        return paper
          ? { input, doi, paper }
          : { input, doi, paper: null, error: "No record found for this DOI." };
      } catch {
        return { input, doi, paper: null, error: "Lookup failed. Try again." };
      }
    })
  );

  return NextResponse.json({ results });
}

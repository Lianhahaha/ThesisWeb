import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/server/rate-limit";
import { cacheGetJson, cacheSetJson } from "@/lib/server/redis-cache";
import { getCrossrefByDoi } from "@/lib/sources/adapters/crossref";
import { getOpenAlexByDoi } from "@/lib/sources/adapters/openalex";
import { normalizePaper } from "@/lib/sources/normalize";
import { extractDoi } from "@/lib/text";
import type { Paper } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_ITEMS = 25;
/** Concurrent DOI lookups; the rest queue, so one paste can't fan out 25 calls at once. */
const LOOKUP_CONCURRENCY = 5;
/** Metadata for a DOI changes rarely; a day is short enough to correct mistakes. */
const DOI_TTL_SECONDS = 24 * 60 * 60;

/** Run `fn` over `items` with at most `limit` in flight, preserving order. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

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
  const limited = await rateLimit(req, "cite");
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

  // One lookup per DOI even when the same paper appears on several lines.
  const lookups = new Map<string, Promise<{ paper: Paper | null; failed: boolean }>>();

  function lookupDoi(doi: string): Promise<{ paper: Paper | null; failed: boolean }> {
    const id = doi.toLowerCase();
    const pending = lookups.get(id);
    if (pending) return pending;
    const promise = (async () => {
      const key = `tw:cite:v1:${id}`;
      const cached = await cacheGetJson<Paper>(key);
      if (cached) return { paper: cached, failed: false };

      let failed = false;
      for (const lookup of [getCrossrefByDoi, getOpenAlexByDoi]) {
        try {
          const found = await lookup(doi);
          const paper = found && normalizePaper(found, found.sources[0] ?? "crossref");
          if (paper) {
            void cacheSetJson(key, paper, DOI_TTL_SECONDS);
            return { paper, failed: false };
          }
        } catch {
          failed = true;
        }
      }
      return { paper: null, failed };
    })();
    lookups.set(id, promise);
    return promise;
  }

  const results = await mapLimit(lines, LOOKUP_CONCURRENCY, async (input): Promise<CiteResult> => {
    const doi = extractDoi(input);
    if (!doi) return { input, doi: null, paper: null, error: "No DOI found in this line." };
    const { paper, failed } = await lookupDoi(doi);
    if (paper) return { input, doi, paper };
    // "Not found" only when both registries answered that they don't know it.
    return { input, doi, paper: null, error: failed ? "Lookup failed. Try again." : "No record found for this DOI." };
  });

  return NextResponse.json({ results });
}

import { NextRequest, NextResponse } from "next/server";
import { readJsonRequest } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/rate-limit";
import { summarize } from "@/lib/server/summarize";

export const dynamic = "force-dynamic";

const MAX_TEXT = 50_000;
/** 50,000 characters at 3 bytes each, plus the JSON around them. */
const MAX_BODY_BYTES = 200_000;

/**
 * POST /api/summarize
 * Body: { text: string, sentences?: number }
 *
 * Extractive summary computed on the server so the client bundle stays small
 * and the heavy tokenizing doesn't block the UI thread. (It's cheap, but the
 * pattern is consistent with the other routes.)
 */
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, "summarize");
  if (limited) return limited;

  // Untrusted input: the body can be any JSON value (even null), not just our shape.
  const parsed = await readJsonRequest<{ text?: unknown; sentences?: unknown } | null>(req, MAX_BODY_BYTES);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.tooLarge ? "This text is too long to summarize." : "Invalid JSON" },
      { status: parsed.tooLarge ? 413 : 400 }
    );
  }
  const { text, sentences } = parsed.value ?? {};
  if (typeof text !== "string" || text.trim().length < 50) {
    return NextResponse.json(
      { error: "Provide at least 50 characters of text." },
      { status: 400 }
    );
  }
  // Abstracts are capped at 40,000 characters; far longer bodies only cost
  // time (and past ~200k distinct words the scoring overflows the stack).
  if (text.length > MAX_TEXT) {
    return NextResponse.json({ error: "This text is too long to summarize." }, { status: 413 });
  }
  // A negative or fractional count reaches Array.slice() and silently returns
  // the wrong sentences; anything invalid falls back to the automatic length.
  const count =
    typeof sentences === "number" && Number.isInteger(sentences) && sentences >= 1
      ? Math.min(sentences, 20)
      : undefined;
  return NextResponse.json(summarize(text, { sentences: count }));
}

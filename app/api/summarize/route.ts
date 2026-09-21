import { NextRequest, NextResponse } from "next/server";
import { summarize } from "@/lib/summarize";

export const dynamic = "force-dynamic";

/**
 * POST /api/summarize
 * Body: { text: string, sentences?: number }
 *
 * Extractive summary computed on the server so the client bundle stays small
 * and the heavy tokenizing doesn't block the UI thread. (It's cheap, but the
 * pattern is consistent with the other routes.)
 */
export async function POST(req: NextRequest) {
  // Untrusted input: the body can be any JSON value (even null), not just our shape.
  let body: { text?: unknown; sentences?: unknown };
  try {
    body = (await req.json()) ?? {};
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { text, sentences } = body;
  if (typeof text !== "string" || text.trim().length < 50) {
    return NextResponse.json(
      { error: "Provide at least 50 characters of text." },
      { status: 400 }
    );
  }
  // A negative or fractional count reaches Array.slice() and silently returns
  // the wrong sentences; anything invalid falls back to the automatic length.
  const count =
    typeof sentences === "number" && Number.isInteger(sentences) && sentences >= 1
      ? Math.min(sentences, 20)
      : undefined;
  return NextResponse.json(summarize(text, { sentences: count }));
}

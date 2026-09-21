import { NextRequest, NextResponse } from "next/server";
import { checkAi } from "@/lib/ai-detector";

export const dynamic = "force-dynamic";

/**
 * POST /api/ai-check
 * Body: { text: string }
 *
 * Heuristic AI-text self-check. Computed server-side for consistency with the
 * other routes (and so the detector logic isn't shipped to the client twice).
 */
export async function POST(req: NextRequest) {
  // Untrusted input: the body can be any JSON value (even null), not just our shape.
  let body: { text?: unknown };
  try {
    body = (await req.json()) ?? {};
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { text } = body;
  if (typeof text !== "string" || text.trim().length < 80) {
    return NextResponse.json(
      { error: "Provide at least 80 characters (a couple of sentences) to analyze." },
      { status: 400 }
    );
  }
  return NextResponse.json(checkAi(text));
}

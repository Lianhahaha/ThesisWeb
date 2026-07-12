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
  let body: { text?: string; sentences?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { text, sentences } = body;
  if (!text || text.trim().length < 50) {
    return NextResponse.json(
      { error: "Provide at least 50 characters of text." },
      { status: 400 }
    );
  }
  return NextResponse.json(summarize(text, { sentences }));
}

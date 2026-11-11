import { NextRequest, NextResponse } from "next/server";
import { readJsonRequest } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/rate-limit";
import { metaSearch } from "@/lib/server/search";
import { defaultFromYear, MIN_QUERY_LENGTH, PER_SOURCE } from "@/lib/search/params";
import { planTopic, rankTopicPapers } from "@/lib/search/topic";
import { groupIntoThemes } from "@/lib/search/themes";

export const dynamic = "force-dynamic";
// Topic search runs the same fan-out as a normal search; the platform gives a
// function 60s here, and the per-source deadlines end slow databases long
// before that.
export const maxDuration = 60;

/** Longest description accepted. It is a paragraph, not a document. */
const MAX_DESCRIPTION = 500;
/** Papers handed to the grouping step; more is noise, not better themes. */
const MAX_THEMED_PAPERS = 60;
/** Fewer per database than a normal search: the description already narrows it. */
const TOPIC_PER_SOURCE = 10;

/**
 * POST /api/topics  { description: string, fromYear?: number }
 *
 * "Here is what my thesis is about" -> the topic words, the matching papers,
 * and those papers grouped by theme. Everything shown is a real record from
 * one of the databases; nothing is generated, and no model is called.
 */
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, "topics");
  if (limited) return limited;

  const parsed = await readJsonRequest<{ description?: unknown; fromYear?: unknown }>(req, 4_000);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.tooLarge ? "That description is too long." : "Invalid JSON" },
      { status: parsed.tooLarge ? 413 : 400 }
    );
  }

  const raw = typeof parsed.value?.description === "string" ? parsed.value.description : "";
  if (raw.length > MAX_DESCRIPTION) {
    return NextResponse.json(
      { error: `Keep the description under ${MAX_DESCRIPTION} characters.` },
      { status: 413 }
    );
  }

  const plan = planTopic(raw);
  if (!plan || plan.query.length < MIN_QUERY_LENGTH) {
    return NextResponse.json(
      { error: "Describe your topic in a few words, not one." },
      { status: 400 }
    );
  }

  const requested = parsed.value?.fromYear;
  const fromYear =
    typeof requested === "number" && Number.isInteger(requested) && requested >= 1900
      ? requested
      : defaultFromYear();

  try {
    const result = await metaSearch(plan.query, {
      fromYear,
      openAccessOnly: plan.openAccessOnly,
      perSource: Math.min(PER_SOURCE, TOPIC_PER_SOURCE),
      country: plan.country ?? undefined,
    });

    const papers = rankTopicPapers(result.papers, plan).slice(0, MAX_THEMED_PAPERS);
    return NextResponse.json({
      query: plan.query,
      terms: plan.terms,
      country: plan.country,
      openAccessOnly: plan.openAccessOnly,
      total: result.papers.length,
      themes: groupIntoThemes(papers, plan.terms),
      sources: result.sources,
      tookMs: result.tookMs,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not search for this topic." },
      { status: 502 }
    );
  }
}

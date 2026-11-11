import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/server/rate-limit";
import { SOURCE_COUNT } from "@/lib/sources/meta";
import { redisConfigured, redisPing } from "@/lib/server/redis";

export const dynamic = "force-dynamic";

/**
 * A probe answered a few times a minute is enough for any monitor; this also
 * keeps repeated hits from turning into one Redis round-trip each. Failures
 * are cached too, so a down Redis isn't retried on every request.
 */
const REDIS_PROBE_TTL_MS = 10_000;
let redisProbe = { at: 0, reachable: false };

async function redisReachable(): Promise<boolean> {
  if (!redisConfigured) return false;
  const now = Date.now();
  if (redisProbe.at && now - redisProbe.at < REDIS_PROBE_TTL_MS) return redisProbe.reachable;
  redisProbe = { at: now, reachable: await redisPing() };
  return redisProbe.reachable;
}

/**
 * Lightweight liveness/readiness probe for uptime monitors. It does not call
 * the academic databases (that is the daily GitHub health check); it reports
 * that the app is serving, which optional integrations are configured, and
 * whether Redis actually answers.
 */
export async function GET(req: NextRequest) {
  const limited = await rateLimit(req, "health");
  if (limited) return limited;

  const reachable = { redis: await redisReachable() };
  return NextResponse.json(
    {
      status: "ok",
      service: "Thesisweb",
      time: new Date().toISOString(),
      sources: SOURCE_COUNT,
      reachable,
      configured: {
        openalex: Boolean(process.env.OPENALEX_API_KEY),
        semanticScholar: Boolean(process.env.SEMANTIC_SCHOLAR_API_KEY),
        googleBooks: Boolean(process.env.GOOGLE_BOOKS_API_KEY),
        core: Boolean(process.env.CORE_API_KEY),
        ieee: Boolean(process.env.IEEE_XPLORE_API_KEY),
        cinii: Boolean(process.env.CINII_APP_ID),
        unpaywall: Boolean(process.env.UNPAYWALL_EMAIL),
        appCheck: Boolean(process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY),
        redis: Boolean(
          (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL) &&
            (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN)
        ),
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

import { NextResponse } from "next/server";
import { SOURCE_COUNT } from "@/lib/sources/meta";

export const dynamic = "force-dynamic";

/**
 * Lightweight liveness/readiness probe for uptime monitors. It does not call
 * the academic databases (that is the daily GitHub health check); it reports
 * that the app is serving and which optional integrations are configured.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "Thesisweb",
      time: new Date().toISOString(),
      sources: SOURCE_COUNT,
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

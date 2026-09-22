import { NextRequest, NextResponse } from "next/server";

/**
 * In-memory sliding-window rate limiter for the API routes.
 *
 * Each server instance keeps its own counters, so on Vercel (several
 * instances) the real ceiling is a small multiple of these numbers. That's
 * enough to stop one browser or script hammering the free APIs we call and
 * burning our API-key quotas. For a hard global limit, add a Vercel Firewall
 * rate-limit rule as well (see README).
 */

interface Rule {
  /** Requests allowed per window. */
  limit: number;
  windowMs: number;
}

export const LIMITS = {
  // A search fans out to ~19 external APIs, so it gets the tightest budget.
  search: { limit: 12, windowMs: 60_000 },
  cite: { limit: 10, windowMs: 60_000 },
  related: { limit: 20, windowMs: 60_000 },
  pdf: { limit: 30, windowMs: 60_000 },
  summarize: { limit: 30, windowMs: 60_000 },
} satisfies Record<string, Rule>;

/** All visitors combined, per instance, for the fan-out route. */
const GLOBAL_SEARCH: Rule = { limit: 120, windowMs: 60_000 };

const hits = new Map<string, number[]>();
let lastSweep = Date.now();

function clientIp(req: NextRequest): string {
  // Vercel sets x-forwarded-for; the first entry is the client.
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
}

/** Record a hit; returns seconds until a slot frees up, or 0 if allowed. */
function take(key: string, rule: Rule, now: number): number {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < rule.windowMs);
  if (recent.length >= rule.limit) {
    hits.set(key, recent);
    return Math.max(1, Math.ceil((recent[0] + rule.windowMs - now) / 1000));
  }
  recent.push(now);
  hits.set(key, recent);
  return 0;
}

/** Drop idle keys now and then so the map can't grow without bound. */
function sweep(now: number): void {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, times] of hits) {
    if (times.every((t) => now - t > 60_000)) hits.delete(key);
  }
}

/**
 * Returns a 429 response when the caller is over the limit, otherwise null.
 * Usage: `const limited = rateLimit(req, "search"); if (limited) return limited;`
 */
export function rateLimit(req: NextRequest, name: keyof typeof LIMITS): NextResponse | null {
  const now = Date.now();
  sweep(now);

  let wait = take(`${name}:${clientIp(req)}`, LIMITS[name], now);
  if (!wait && name === "search") wait = take("search:*", GLOBAL_SEARCH, now);
  if (!wait) return null;

  return NextResponse.json(
    { error: `Too many requests. Please wait ${wait} second${wait === 1 ? "" : "s"} and try again.` },
    { status: 429, headers: { "Retry-After": String(wait) } }
  );
}

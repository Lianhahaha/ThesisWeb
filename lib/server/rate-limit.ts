import { NextRequest, NextResponse } from "next/server";
import { verifiedUid } from "@/lib/server/identity";
import { redisPipeline } from "@/lib/server/redis";

/**
 * Rate limiter for the API routes, so one browser or script can't hammer the
 * free APIs we call or burn our API-key quotas.
 *
 * With Upstash Redis set up (UPSTASH_REDIS_REST_URL and _TOKEN, or the
 * KV_REST_API_URL and _TOKEN that Vercel's Upstash integration sets), every
 * server instance counts in one place, so the limits below hold site-wide.
 * Without it, or whenever Redis is slow or down, each instance counts in its
 * own memory: on Vercel (several instances) the real ceiling is then a small
 * multiple of these numbers. A Vercel Firewall rule is another option
 * (README).
 */

interface Rule {
  /** Requests allowed per window. */
  limit: number;
  windowMs: number;
}

interface RouteRule extends Rule {
  /**
   * A second, shorter window. A per-minute budget alone lets a script spend it
   * in one burst: twelve searches in a second also means twelve simultaneous
   * fan-outs to ~60 databases each, which the sources answer with blocks. The
   * burst rule caps the speed, the minute rule caps the volume.
   */
  burst: Rule;
}

const LIMITS = {
  // A search fans out to every database, so it gets the tightest budget.
  search: { limit: 12, windowMs: 60_000, burst: { limit: 3, windowMs: 5_000 } },
  cite: { limit: 10, windowMs: 60_000, burst: { limit: 3, windowMs: 5_000 } },
  related: { limit: 20, windowMs: 60_000, burst: { limit: 5, windowMs: 5_000 } },
  pdf: { limit: 30, windowMs: 60_000, burst: { limit: 8, windowMs: 5_000 } },
  // One per opened paper that came without an abstract.
  abstract: { limit: 30, windowMs: 60_000, burst: { limit: 8, windowMs: 5_000 } },
  summarize: { limit: 30, windowMs: 60_000, burst: { limit: 10, windowMs: 5_000 } },
  // One per search, plus one per opened paper.
  retractions: { limit: 40, windowMs: 60_000, burst: { limit: 10, windowMs: 5_000 } },
  // Topic search is a full fan-out plus grouping: the tightest paid-for budget.
  topics: { limit: 6, windowMs: 60_000, burst: { limit: 2, windowMs: 20_000 } },
  // Uptime monitors poll every 30s or so; anything faster than this is abuse.
  health: { limit: 60, windowMs: 60_000, burst: { limit: 10, windowMs: 5_000 } },
} satisfies Record<string, RouteRule>;

/**
 * All visitors combined, per route. These bound the total number of upstream
 * calls, so a script that rotates source IPs still cannot burn the free API
 * quotas (search fans out to ~60 databases; cite/related/retractions call
 * Crossref, OpenAlex and Semantic Scholar).
 */
const GLOBAL: Partial<Record<keyof typeof LIMITS, Rule>> = {
  search: { limit: 120, windowMs: 60_000 },
  cite: { limit: 120, windowMs: 60_000 },
  related: { limit: 300, windowMs: 60_000 },
  pdf: { limit: 300, windowMs: 60_000 },
  abstract: { limit: 300, windowMs: 60_000 },
  summarize: { limit: 300, windowMs: 60_000 },
  retractions: { limit: 400, windowMs: 60_000 },
  topics: { limit: 60, windowMs: 60_000 },
  health: { limit: 600, windowMs: 60_000 },
};

function clientIp(req: NextRequest): string {
  // On Vercel the platform overwrites these headers, so a caller cannot rotate
  // spoofed addresses to get a fresh bucket. Behind another proxy, make sure
  // the edge sets x-real-ip / x-vercel-forwarded-for and strips client-supplied
  // copies; otherwise rotate to a fresh bucket is possible. No IP means one
  // shared "unknown" bucket, which is safe (just stricter).
  const vercel = req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  if (vercel) return vercel;
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const fwd = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd || "unknown";
}

// ─── Shared counters (Upstash Redis, optional) ───────────────────────────────

/**
 * Seconds until a slot is free for the busiest of `checks`, counted in Redis
 * (fixed windows: one counter per key per window, expiring with it), or null
 * when Redis isn't set up or didn't answer. Counts the request.
 */
async function sharedWait(checks: [string, Rule][], now: number): Promise<number | null> {
  const keys = checks.map(([key, rule]) => `tw:rl:${key}:${Math.floor(now / rule.windowMs)}`);
  const commands: (string | number)[][] = checks.flatMap(([, rule], i) => [
    ["INCR", keys[i]],
    ["PEXPIRE", keys[i], String(rule.windowMs), "NX"],
  ]);
  const replies = await redisPipeline(commands, 1200);
  if (!replies) return null;
  try {
    let wait = 0;
    checks.forEach(([, rule], i) => {
      const count = replies[i * 2]?.result;
      if (typeof count !== "number") throw new Error("unexpected Redis reply");
      if (count > rule.limit) {
        const windowEnd = (Math.floor(now / rule.windowMs) + 1) * rule.windowMs;
        wait = Math.max(wait, Math.ceil((windowEnd - now) / 1000));
      }
    });
    return wait;
  } catch {
    // A malformed reply is as good as no Redis: count in memory instead.
    return null;
  }
}

// ─── Local counters (each server instance) ───────────────────────────────────

const hits = new Map<string, number[]>();
let lastSweep = Date.now();

/** Longest window of any rule; a key idle this long holds nothing that counts. */
const MAX_WINDOW_MS = Math.max(
  ...Object.values(LIMITS).flatMap((r) => [r.windowMs, r.burst.windowMs]),
  ...Object.values(GLOBAL).map((r) => r?.windowMs ?? 0)
);

/** Seconds until `key` has a free slot under `rule`, or 0 if it has one now. Records nothing. */
function waitFor(key: string, rule: Rule, now: number): number {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < rule.windowMs);
  hits.set(key, recent);
  return recent.length >= rule.limit ? Math.max(1, Math.ceil((recent[0] + rule.windowMs - now) / 1000)) : 0;
}

/** Drop idle keys now and then so the map can't grow without bound. */
function sweep(now: number): void {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, times] of hits) {
    if (times.every((t) => now - t > MAX_WINDOW_MS)) hits.delete(key);
  }
}

/**
 * Seconds to wait under the local counters. Every rule is checked before the
 * hit is counted, so a request refused by the site-wide limit doesn't also
 * use up the caller's own slot.
 */
function localWait(checks: [string, Rule][], now: number): number {
  sweep(now);
  const wait = Math.max(...checks.map(([key, rule]) => waitFor(key, rule, now)));
  if (!wait) for (const [key] of checks) hits.get(key)!.push(now);
  return wait;
}

/**
 * Resolves to a 429 response when the caller is over the limit, otherwise null.
 * Usage: `const limited = await rateLimit(req, "search"); if (limited) return limited;`
 *
 * A caller with a valid Firebase ID token is counted per account; everyone
 * else per IP. Shared campus and office addresses would otherwise pool their
 * budgets, and a signed-in student is the one person we can tell apart.
 */
export async function rateLimit(req: NextRequest, name: keyof typeof LIMITS): Promise<NextResponse | null> {
  const now = Date.now();
  const uid = await verifiedUid(req);
  const caller = uid ? `user:${uid}` : `ip:${clientIp(req)}`;
  const rule = LIMITS[name];
  const checks: [string, Rule][] = [
    [`${name}:${caller}`, rule],
    [`${name}:${caller}:burst`, rule.burst],
  ];
  const global = GLOBAL[name];
  if (global) checks.push([`${name}:*`, global]);

  const wait = (await sharedWait(checks, now)) ?? localWait(checks, now);
  if (!wait) return null;
  return NextResponse.json(
    { error: `Too many requests. Please wait ${wait} second${wait === 1 ? "" : "s"} and try again.` },
    { status: 429, headers: { "Retry-After": String(wait) } }
  );
}

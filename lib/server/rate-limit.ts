import { NextRequest, NextResponse } from "next/server";
import { fetchWithTimeout } from "@/lib/server/http";

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

const LIMITS = {
  // A search fans out to every database, so it gets the tightest budget.
  search: { limit: 12, windowMs: 60_000 },
  cite: { limit: 10, windowMs: 60_000 },
  related: { limit: 20, windowMs: 60_000 },
  pdf: { limit: 30, windowMs: 60_000 },
  // One per opened paper that came without an abstract.
  abstract: { limit: 30, windowMs: 60_000 },
  summarize: { limit: 30, windowMs: 60_000 },
  // One per search, plus one per opened paper.
  retractions: { limit: 40, windowMs: 60_000 },
} satisfies Record<string, Rule>;

/** All visitors combined, for the fan-out route. */
const GLOBAL_SEARCH: Rule = { limit: 120, windowMs: 60_000 };

function clientIp(req: NextRequest): string {
  // Vercel sets x-forwarded-for; the first entry is the client.
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
}

// ─── Shared counters (Upstash Redis, optional) ───────────────────────────────

const REDIS_URL = (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "").trim().replace(/\/$/, "");
const REDIS_TOKEN = (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "").trim();
/** Longest a request waits for Redis before counting in memory instead. */
const REDIS_MS = 800;

/**
 * Seconds until a slot is free for the busiest of `checks`, counted in Redis
 * (fixed windows: one counter per key per window, expiring with it), or null
 * when Redis isn't set up or didn't answer. Counts the request.
 */
async function sharedWait(checks: [string, Rule][], now: number): Promise<number | null> {
  if (!REDIS_URL || !REDIS_TOKEN) return null;
  const keys = checks.map(([key, rule]) => `tw:rl:${key}:${Math.floor(now / rule.windowMs)}`);
  const commands = checks.flatMap(([, rule], i) => [
    ["INCR", keys[i]],
    ["PEXPIRE", keys[i], String(rule.windowMs), "NX"],
  ]);
  try {
    const res = await fetchWithTimeout(
      `${REDIS_URL}/pipeline`,
      { method: "POST", headers: { Authorization: `Bearer ${REDIS_TOKEN}` }, body: JSON.stringify(commands) },
      REDIS_MS
    );
    if (!res.ok) return null;
    const replies = (await res.json()) as { result?: unknown }[];
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
    // Slow, down or misconfigured: never block a student on it.
    return null;
  }
}

// ─── Local counters (each server instance) ───────────────────────────────────

const hits = new Map<string, number[]>();
let lastSweep = Date.now();

/** Longest window of any rule; a key idle this long holds nothing that counts. */
const MAX_WINDOW_MS = Math.max(GLOBAL_SEARCH.windowMs, ...Object.values(LIMITS).map((r) => r.windowMs));

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
 */
export async function rateLimit(req: NextRequest, name: keyof typeof LIMITS): Promise<NextResponse | null> {
  const now = Date.now();
  const checks: [string, Rule][] = [[`${name}:${clientIp(req)}`, LIMITS[name]]];
  if (name === "search") checks.push(["search:*", GLOBAL_SEARCH]);

  const wait = (await sharedWait(checks, now)) ?? localWait(checks, now);
  if (!wait) return null;
  return NextResponse.json(
    { error: `Too many requests. Please wait ${wait} second${wait === 1 ? "" : "s"} and try again.` },
    { status: 429, headers: { "Retry-After": String(wait) } }
  );
}

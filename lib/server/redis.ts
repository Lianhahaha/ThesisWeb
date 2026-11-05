/**
 * Optional Upstash Redis access shared by the search cache, the rate limiter
 * and the API pacing. Vercel's Upstash integration sets
 * KV_REST_API_URL/KV_REST_API_TOKEN; the UPSTASH_* names work too.
 *
 * Every call is best-effort: a slow, down or misconfigured Redis must never
 * stop a student's search. A failure disables Redis for a minute so the next
 * requests use the per-instance fallbacks instead of waiting on every call.
 */

const URL = (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "").trim().replace(/\/$/, "");
const TOKEN = (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "").trim();

export const redisConfigured = Boolean(URL && TOKEN);

let disabledUntil = 0;
let warned = false;

export interface RedisReply<T = unknown> {
  result?: T;
  error?: string;
}

const available = () => redisConfigured && Date.now() > disabledUntil;

function fail(reason: string): void {
  disabledUntil = Date.now() + 60_000;
  if (!warned) {
    warned = true;
    console.warn(`[redis] ${reason}; using local fallbacks for 60s.`);
  }
}

/**
 * Run one pipeline and return its replies, or null when Redis is not set up,
 * disabled after a failure, or did not answer in time. One round trip for any
 * number of commands.
 */
export async function redisPipeline(commands: (string | number)[][], ms = 1200): Promise<RedisReply[] | null> {
  if (!available()) return null;
  try {
    const res = await fetch(`${URL}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(commands),
      signal: AbortSignal.timeout(ms),
      cache: "no-store",
    });
    if (!res.ok) {
      fail(`HTTP ${res.status}`);
      return null;
    }
    const data = (await res.json()) as unknown;
    if (!Array.isArray(data)) {
      fail("unexpected reply");
      return null;
    }
    return data as RedisReply[];
  } catch (e) {
    fail(e instanceof Error ? e.message : "request failed");
    return null;
  }
}

/** True only when Redis answers a PING, for the health/status page. */
export async function redisPing(): Promise<boolean> {
  const replies = await redisPipeline([["PING"]], 800);
  return replies?.[0]?.result === "PONG";
}

import { createHash } from "node:crypto";
import { fetchWithTimeout } from "@/lib/server/http";

/**
 * Optional Upstash Redis cache for full search answers. Vercel's Upstash
 * integration sets KV_REST_API_URL/KV_REST_API_TOKEN; the UPSTASH_* names
 * work too. One GET and one SET per search keeps the free command budget
 * usable, unlike caching every source separately.
 */

const URL = (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "").trim().replace(/\/$/, "");
const TOKEN = (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "").trim();

/** A failed Redis call must not slow every search; skip it for a minute. */
let disabledUntil = 0;
const available = () => Boolean(URL && TOKEN) && Date.now() > disabledUntil;

export function searchCacheKey(parts: unknown[]): string {
  return `tw:search:v1:${createHash("sha256").update(JSON.stringify(parts)).digest("hex")}`;
}

export async function cacheGet(key: string): Promise<string | null> {
  if (!available()) return null;
  try {
    const res = await fetchWithTimeout(`${URL}/get/${key}`, { headers: { Authorization: `Bearer ${TOKEN}` } }, 800);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { result?: unknown };
    return typeof data.result === "string" ? data.result : null;
  } catch {
    disabledUntil = Date.now() + 60_000;
    return null;
  }
}

export async function cacheSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  if (!available() || value.length > 900_000) return;
  try {
    await fetchWithTimeout(
      `${URL}/pipeline`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${TOKEN}` },
        body: JSON.stringify([["SET", key, value, "EX", String(ttlSeconds)]]),
      },
      600
    );
  } catch {
    disabledUntil = Date.now() + 60_000;
  }
}

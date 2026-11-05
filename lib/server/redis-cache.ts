import { createHash } from "node:crypto";
import { redisPipeline } from "@/lib/server/redis";

/**
 * Optional Upstash Redis cache for full search answers. One GET and one SET
 * per search keeps the free command budget usable, unlike caching every
 * source separately.
 */

/**
 * Bumped whenever the shape of a cached answer changes (or an adapter fix must
 * invalidate old answers). The source list and deployment id are part of the
 * key too, so adding a database can't replay an answer without it.
 */
const CACHE_VERSION = "v2";

export function searchCacheKey(parts: unknown[]): string {
  return `tw:search:${CACHE_VERSION}:${createHash("sha256").update(JSON.stringify(parts)).digest("hex")}`;
}

export async function cacheGet(key: string): Promise<string | null> {
  const replies = await redisPipeline([["GET", key]], 1200);
  const result = replies?.[0]?.result;
  return typeof result === "string" ? result : null;
}

export async function cacheSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  if (value.length > 900_000) return;
  await redisPipeline([["SET", key, value, "EX", String(ttlSeconds)]], 1000);
}

/** JSON variant for the small, per-DOI answers of /api/cite and /api/related. */
export async function cacheGetJson<T>(key: string): Promise<T | null> {
  const raw = await cacheGet(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSetJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  await cacheSet(key, JSON.stringify(value), ttlSeconds);
}

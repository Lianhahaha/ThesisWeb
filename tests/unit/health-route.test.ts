import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const redis = vi.hoisted(() => ({
  ping: vi.fn(async () => true),
}));

vi.mock("@/lib/server/redis", () => ({
  redisConfigured: true,
  redisPing: redis.ping,
  // The rate limiter shares this module; without a pipeline it counts locally.
  redisPipeline: async () => null,
}));

const req = (ip = "203.0.113.20") =>
  new NextRequest("http://localhost/api/health", { headers: { "x-forwarded-for": ip } });

describe("GET /api/health", () => {
  it("reports the service and probes Redis at most once per 10s", async () => {
    const { GET } = await import("@/app/api/health/route");

    const first = await GET(req());
    expect(first.status).toBe(200);
    expect(first.headers.get("Cache-Control")).toBe("no-store");
    const body = (await first.json()) as { status: string; reachable: { redis: boolean } };
    expect(body.status).toBe("ok");
    expect(body.reachable.redis).toBe(true);

    await GET(req());
    expect(redis.ping).toHaveBeenCalledTimes(1);
  });
});

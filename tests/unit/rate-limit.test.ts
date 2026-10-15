import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const req = (ip: string) => new NextRequest("http://localhost/api/search", { headers: { "x-forwarded-for": ip } });

/** The limiter reads its Redis settings when it loads, so each test loads it afresh. */
async function withRedis(reply: (body: string[][]) => Response | Promise<Response>) {
  vi.resetModules();
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example/");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");
  const fetchMock = vi.fn(async (_url: string, init: RequestInit) => reply(JSON.parse(String(init.body))));
  vi.stubGlobal("fetch", fetchMock);
  const { rateLimit } = await import("@/lib/server/rate-limit");
  return { rateLimit, fetchMock };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("rateLimit with shared Redis counters", () => {
  it("counts the caller and the site in one pipeline, and lets them through under the limit", async () => {
    const { rateLimit, fetchMock } = await withRedis(() => Response.json([{ result: 3 }, { result: 1 }, { result: 50 }, { result: 0 }]));
    expect(await rateLimit(req("203.0.113.9"), "search")).toBeNull();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://redis.example/pipeline");
    const body = JSON.parse(String(init.body)) as string[][];
    expect(body.map((c) => c[0])).toEqual(["INCR", "PEXPIRE", "INCR", "PEXPIRE"]);
    expect(body[0][1]).toMatch(/^tw:rl:search:203\.0\.113\.9:\d+$/);
    expect(body[2][1]).toMatch(/^tw:rl:search:\*:\d+$/);
  });

  it("refuses over the limit, with the seconds left in the window", async () => {
    const { rateLimit } = await withRedis(() => Response.json([{ result: 13 }, { result: 0 }, { result: 60 }, { result: 0 }]));
    const refused = await rateLimit(req("203.0.113.9"), "search");
    expect(refused?.status).toBe(429);
    const wait = Number(refused?.headers.get("Retry-After"));
    expect(wait).toBeGreaterThan(0);
    expect(wait).toBeLessThanOrEqual(60);
  });

  it("falls back to counting in memory when Redis fails", async () => {
    const { rateLimit } = await withRedis(() => new Response("down", { status: 503 }));
    for (let i = 0; i < 12; i++) expect(await rateLimit(req("203.0.113.10"), "search")).toBeNull();
    expect((await rateLimit(req("203.0.113.10"), "search"))?.status).toBe(429);
  });
});

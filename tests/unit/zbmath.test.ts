import { afterEach, describe, expect, it, vi } from "vitest";
import { searchZbmath } from "@/lib/sources/adapters/zbmath";

afterEach(() => vi.unstubAllGlobals());

describe("zbMATH", () => {
  it("treats a 404 as no matches, not a failed source", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("not found", { status: 404 })));
    await expect(searchZbmath("reading comprehension strategies", { perSource: 5 })).resolves.toEqual([]);
  });

  it("still fails on a real server error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("boom", { status: 500 })));
    await expect(searchZbmath("algebra", { perSource: 5 })).rejects.toThrow("HTTP 500");
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWithTimeout, readJson, sleep, waitTurn, withAbortSignal } from "@/lib/server/http";

afterEach(() => vi.unstubAllGlobals());

describe("readJson", () => {
  it("parses a JSON body", async () => {
    expect(await readJson(new Response('{"results":[]}'))).toEqual({ results: [] });
  });

  it("fails on a captcha or block page instead of reading it as no results", async () => {
    const page = new Response("<!DOCTYPE html><html><title>Just a moment...</title></html>");
    await expect(readJson(page)).rejects.toThrow("sent a web page instead of data");
  });

  it("returns the given value for a blank body, and fails without one", async () => {
    expect(await readJson(new Response(""), [])).toEqual([]);
    await expect(readJson(new Response("  "))).rejects.toThrow("empty answer");
  });

  it("fails on a body that is neither JSON nor a page", async () => {
    await expect(readJson(new Response("Service Unavailable"))).rejects.toThrow("could not be read");
  });
});

describe("source deadlines", () => {
  it("aborts a request that is still running when the source's signal aborts", async () => {
    let seen: AbortSignal | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init: RequestInit) => {
        seen = init.signal ?? undefined;
        // A server that never answers: only the abort ends this.
        return new Promise((_, reject) => init.signal?.addEventListener("abort", () => reject(init.signal?.reason)));
      })
    );
    const controller = new AbortController();
    const pending = withAbortSignal(controller.signal, () => fetchWithTimeout("https://example.org", {}, 60_000));
    controller.abort(new Error("source timed out"));
    await expect(pending).rejects.toThrow("source timed out");
    expect(seen?.aborted).toBe(true);
  });

  it("ends a retry wait when the source's signal aborts", async () => {
    const controller = new AbortController();
    const waiting = withAbortSignal(controller.signal, () => sleep(60_000));
    controller.abort(new Error("source timed out"));
    await expect(waiting).rejects.toThrow("source timed out");
  });

  it("leaves requests outside a search alone", async () => {
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init: RequestInit) => new Response(String(init.signal?.aborted))));
    const res = await fetchWithTimeout("https://example.org");
    expect(await res.text()).toBe("false");
    await expect(sleep(1)).resolves.toBeUndefined();
  });
});

describe("waitTurn", () => {
  it("spaces calls to one API by the gap, in the order they asked", async () => {
    const started = Date.now();
    const times: number[] = [];
    await Promise.all([0, 1, 2].map(async () => {
      await waitTurn("test-api", 60);
      times.push(Date.now() - started);
    }));
    // The first goes at once; the next two wait one and two gaps (a few ms of timer slack allowed).
    expect(times[0]).toBeLessThan(40);
    expect(times[1]).toBeGreaterThanOrEqual(55);
    expect(times[2]).toBeGreaterThanOrEqual(115);
  });

  it("stops waiting when the source's deadline passes", async () => {
    await waitTurn("test-slow", 10_000);
    const controller = new AbortController();
    const waiting = withAbortSignal(controller.signal, () => waitTurn("test-slow", 10_000));
    controller.abort(new Error("source timed out"));
    await expect(waiting).rejects.toThrow("source timed out");
  });
});

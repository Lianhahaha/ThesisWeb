import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWithTimeout, sleep, withAbortSignal } from "@/lib/server/http";

afterEach(() => vi.unstubAllGlobals());

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

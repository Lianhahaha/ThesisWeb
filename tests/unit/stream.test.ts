import { afterEach, describe, expect, it, vi } from "vitest";
import { streamSearch, type SourceUpdate } from "@/lib/search/stream";

const input = { query: "teacher burnout", fromYear: 2022, openAccessOnly: false, country: null };

/** A response whose body arrives in the given pieces. */
function chunked(pieces: string[], status = 200): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const p of pieces) controller.enqueue(encoder.encode(p));
      controller.close();
    },
  });
  return new Response(body, { status });
}

afterEach(() => vi.unstubAllGlobals());

describe("streamSearch", () => {
  it("reports each database as its line arrives, even split across pieces", async () => {
    const a = JSON.stringify({ type: "source", id: "openalex", status: "ok", papers: [{ id: "x", title: "T", authors: [], year: 2024, sources: ["openalex"] }], error: "" });
    const b = JSON.stringify({ type: "source", id: "herdin", status: "error", papers: [], error: "source timed out" });
    const fetchMock = vi.fn(async () => chunked([a.slice(0, 20), `${a.slice(20)}\n${b}`, `\n{"type":"done","tookMs":5`, "123}\n"]));
    vi.stubGlobal("fetch", fetchMock);
    const seen: SourceUpdate[] = [];
    await expect(streamSearch(input, { onSource: (u) => seen.push(u) })).resolves.toEqual({ tookMs: 5123 });
    expect(seen.map((u) => [u.id, u.status])).toEqual([["openalex", "ok"], ["herdin", "error"]]);
    expect(String(fetchMock.mock.calls[0]?.[0 as never])).toContain("stream=1");
  });

  it("passes on the server's message for a refused search", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "Too many requests. Please wait 30 seconds and try again." }), { status: 429 })));
    await expect(streamSearch(input, { onSource: () => {} })).rejects.toThrow("Too many requests");
  });

  it("fails on an answer cut off before the end", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => chunked(['{"type":"source","id":"a","status":"empty","papers":[],"error":""}\n'])));
    await expect(streamSearch(input, { onSource: () => {} })).rejects.toThrow("cut off");
  });
});

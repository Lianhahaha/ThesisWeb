/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { ADAPTERS } from "@/lib/sources/registry";
import { normalizePaper } from "@/lib/sources/normalize";

/**
 * Calls every real database once. Run with `npm run test:live` after adding
 * or changing an adapter (LIVE_QUERY="..." picks the topic, LIVE_ONLY=id1,id2
 * limits the sources). Skipped by the normal `npm test`, which needs no
 * network. A source may legitimately return nothing for a topic outside its
 * field, so the check is: it answers without error, and every record is usable.
 */
const LIVE = import.meta.env.MODE === "live";
const QUERY = process.env.LIVE_QUERY || "climate change";
const ONLY = (process.env.LIVE_ONLY || "").split(",").filter(Boolean);

describe.skipIf(!LIVE)(`live sources: "${QUERY}"`, () => {
  for (const [id, { run }] of Object.entries(ADAPTERS)) {
    if (ONLY.length && !ONLY.includes(id)) continue;
    it(id, { timeout: 30_000 }, async () => {
      const papers = await run(QUERY, { fromYear: 2020, perSource: 10 });
      expect(Array.isArray(papers)).toBe(true);
      for (const p of papers) {
        expect(normalizePaper(p, id), `${id} returned a record with no title`).not.toBeNull();
        expect(p.sources).toContain(id);
      }
      console.log(`${id}: ${papers.length} papers`);
    });
  }
});

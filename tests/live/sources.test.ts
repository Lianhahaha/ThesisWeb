/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { ADAPTERS } from "@/lib/sources/registry";
import { normalizePaper } from "@/lib/sources/normalize";
import type { SourceId } from "@/lib/sources/meta";

/**
 * Calls every real database once. Run with `npm run test:live` after adding
 * or changing an adapter; the daily sources-health workflow runs it too.
 * Skipped by the normal `npm test`, which needs no network.
 *
 * Without LIVE_QUERY each database is asked about a topic it certainly holds
 * (PROBES) and must return at least one usable record: a scraper whose site
 * changed its pages can fail quietly with "no results", and this catches it.
 * With LIVE_QUERY="..." every database gets that topic and may legitimately
 * return nothing. LIVE_ONLY=id1,id2 limits the sources.
 */
const LIVE = import.meta.env.MODE === "live";
const QUERY = process.env.LIVE_QUERY || "";
const ONLY = (process.env.LIVE_ONLY || "").split(",").filter(Boolean);

/** A topic each database holds plenty of. Typed over every source, so a new one needs a probe. */
const PROBES: Record<SourceId, string> = {
  openalex: "climate change", crossref: "climate change", semanticscholar: "climate change", doaj: "teacher education",
  europepmc: "dengue", pubmed: "dengue", arxiv: "neural network", eric: "reading comprehension", zenodo: "climate change",
  hal: "climate change", openaire: "climate change", inspire: "dark matter", plos: "malaria", datacite: "education",
  osti: "solar energy", cinii: "education", jstage: "education", figshare: "climate change", worldbank: "poverty",
  cgspace: "rice", idrc: "climate change", pmc: "dengue", ntrs: "aerospace", econbiz: "inflation", usgs: "earthquake",
  gbif: "biodiversity", lareferencia: "educación", bdtd: "educação", thesesfr: "climat", osf: "psychology",
  seafdec: "shrimp", ssoar: "migration", who: "dengue", nber: "inflation", openlibrary: "statistics",
  core: "climate change", ntu: "engineering", upspace: "education", upou: "distance education", upv: "fisheries",
  wvsu: "teachers", thaijo: "nursing", herdin: "dengue", serpp: "poverty", krishikosh: "rice", upd: "education",
  aiias: "education", actamedica: "dengue", pnu: "teachers", ejournalsph: "education",
};

describe.skipIf(!LIVE)(QUERY ? `live sources: "${QUERY}"` : "live sources: probe topics", () => {
  for (const [id, { run }] of Object.entries(ADAPTERS) as [SourceId, (typeof ADAPTERS)[SourceId]][]) {
    if (ONLY.length && !ONLY.includes(id)) continue;
    // One retry: a slow moment at a database is not a broken adapter.
    it(id, { timeout: 45_000, retry: 1 }, async () => {
      const papers = await run(QUERY || PROBES[id], { fromYear: QUERY ? 2020 : 0, perSource: 10 });
      expect(Array.isArray(papers)).toBe(true);
      for (const p of papers) {
        expect(normalizePaper(p, id), `${id} returned a record with no title`).not.toBeNull();
        expect(p.sources).toContain(id);
      }
      if (!QUERY) expect(papers.length, `${id} found nothing for "${PROBES[id]}"; has its site changed?`).toBeGreaterThan(0);
      console.log(`${id}: ${papers.length} papers`);
    });
  }
});

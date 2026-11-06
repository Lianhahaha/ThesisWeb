/// <reference types="vite/client" />
import { afterAll, describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
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

/** Sources that need a key are skipped, not failed, when the key is absent. */
const SKIP: Partial<Record<SourceId, string>> = {};
if (!process.env.IEEE_XPLORE_API_KEY) SKIP.ieee = "IEEE_XPLORE_API_KEY not configured";
if (!process.env.CINII_APP_ID) SKIP.cinii = "CINII_APP_ID not configured";
if (!process.env.CORE_API_KEY) SKIP.core = "CORE_API_KEY not configured";
if (!process.env.GOOGLE_BOOKS_API_KEY) SKIP.googlebooks = "GOOGLE_BOOKS_API_KEY not configured";

/**
 * A rate limit, anti-bot block, timeout or outage is not an adapter bug. It is
 * reported as unavailable so the daily job only fails on real breakage (an
 * unexpected page, bad data, or a source that suddenly returns nothing).
 */
const TRANSIENT = /rate limited|429|403|\b5\d\d\b|timed out|timeout|fetch failed|ECONN|ENOTFOUND|EAI_AGAIN|socket|network|inactive|rejected the key|not active|not configured/i;

type HealthStatus = "working" | "empty" | "unavailable" | "failed" | "skipped" | "not-run";
const health = new Map<SourceId, { status: HealthStatus; count?: number; detail?: string }>();
for (const id of Object.keys(ADAPTERS) as SourceId[]) health.set(id, { status: "not-run" });
for (const [id, detail] of Object.entries(SKIP) as [SourceId, string][]) health.set(id, { status: "skipped", detail });

afterAll(() => {
  const output = process.env.HEALTH_OUTPUT;
  if (!LIVE || !output) return;
  const path = resolve(process.cwd(), output);
  const results = [...health.entries()].map(([id, result]) => ({ id, ...result }));
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2)}\n`);
});

/** A topic each database holds plenty of. Typed over every source, so a new one needs a probe. */
const PROBES: Record<SourceId, string> = {
  openalex: "climate change", crossref: "climate change", semanticscholar: "climate change", doaj: "teacher education",
  europepmc: "dengue", pubmed: "dengue", arxiv: "neural network", eric: "reading comprehension",
  edarxiv: "teacher education", huggingface: "large language models",
  openreview: "large language models", zbmath: "algebra", zenodo: "climate change",
  hal: "climate change", openaire: "climate change", inspire: "dark matter", plos: "malaria", datacite: "education",
  osti: "solar energy", cinii: "education", jstage: "education", figshare: "climate change", worldbank: "poverty",
  cgspace: "rice", idrc: "climate change", pmc: "dengue", ntrs: "aerospace", econbiz: "inflation", usgs: "earthquake",
  ieee: "engineering",
  gbif: "biodiversity", lareferencia: "educación", bdtd: "educação", thesesfr: "climat", osf: "psychology",
  seafdec: "shrimp", ssoar: "migration", who: "dengue", nber: "inflation", openlibrary: "statistics",
  core: "climate change", ntu: "engineering", upspace: "education", upou: "distance education", upv: "fisheries",
  googlebooks: "education",
  herdin: "dengue", serpp: "poverty", krishikosh: "rice", upd: "education",
  aiias: "education", actamedica: "dengue", pnu: "teachers", ejournalsph: "education",
  saliksik: "education", pcaarrd: "rice", scielo: "education", persee: "education",
  philjournals: "engineering", pej: "engineering", ajol: "engineering",
  ncjrs: "policing",
};

describe.skipIf(!LIVE)(QUERY ? `live sources: "${QUERY}"` : "live sources: probe topics", () => {
  for (const [id, { run }] of Object.entries(ADAPTERS) as [SourceId, (typeof ADAPTERS)[SourceId]][]) {
    if (ONLY.length && !ONLY.includes(id)) continue;
    // One retry: a slow moment at a database is not a broken adapter.
    it(id, { timeout: 45_000, retry: 1, skip: Boolean(SKIP[id]) }, async () => {
      let papers: Awaited<ReturnType<typeof run>>;
      try {
        papers = await run(QUERY || PROBES[id], { fromYear: QUERY ? 2020 : 0, perSource: 10 });
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        if (TRANSIENT.test(message)) {
          health.set(id, { status: "unavailable", detail: message });
          console.warn(`${id}: unavailable (${message})`);
          return;
        }
        health.set(id, { status: "failed", detail: message });
        throw e;
      }
      expect(Array.isArray(papers)).toBe(true);
      for (const p of papers) {
        expect(normalizePaper(p, id), `${id} returned a record with no title`).not.toBeNull();
        expect(p.sources).toContain(id);
      }
      health.set(id, { status: papers.length > 0 ? "working" : "empty", count: papers.length });
      if (!QUERY) expect(papers.length, `${id} found nothing for "${PROBES[id]}"; has its site changed?`).toBeGreaterThan(0);
      console.log(`${id}: ${papers.length} papers`);
    });
  }
});

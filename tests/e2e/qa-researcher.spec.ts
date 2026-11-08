import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * Researcher-perspective QA journey. Network-dependent (real databases), so it
 * is skipped in CI; run it locally before a release:
 *
 *   QA_EVIDENCE=../evidence npx playwright test tests/e2e/qa-researcher.spec.ts
 *
 * Evidence (JSON + screenshots) goes to QA_EVIDENCE (default test-results/qa).
 */

const evidence = process.env.QA_EVIDENCE || "test-results/qa";

test("researcher journey: search, filter, read, save, cite, mobile", async ({ page }) => {
  test.setTimeout(240_000);
  fs.mkdirSync(evidence, { recursive: true });

  const log: {
    errors: string[];
    warnings: string[];
    steps: { name: string; ok: boolean; detail?: unknown }[];
    searchTitles?: string[];
    resultCount?: number;
    savedTitle?: string;
    savedTitleVisible?: boolean;
    citationFound?: boolean;
    overflowPx?: number;
  } = { errors: [], warnings: [], steps: [] };

  page.on("console", (m) => {
    if (m.type() === "error") log.errors.push(`console: ${m.text()}`);
  });
  page.on("pageerror", (e) => log.errors.push(`pageerror: ${e.message}`));
  page.on("requestfailed", (r) => {
    const url = r.url();
    // Database failures are expected and surfaced by the source list.
    if (!url.includes("/api/")) log.warnings.push(`requestfailed: ${url}`);
  });

  async function step(name: string, fn: () => Promise<unknown>) {
    try {
      const detail = await fn();
      log.steps.push({ name, ok: true, detail });
    } catch (e) {
      log.steps.push({ name, ok: false, detail: String(e).slice(0, 400) });
    }
  }

  try {
    await step("home loads", async () => {
      await page.goto("/", { waitUntil: "domcontentloaded" });
      const h1 = await page.locator("h1").first().innerText();
      await page.screenshot({ path: path.join(evidence, "01-home.png") });
      return h1;
    });

    await step("search returns real results", async () => {
      await page.goto("/search", { waitUntil: "domcontentloaded" });
      await page.fill("#q", "reading comprehension strategies");
      await page.getByRole("button", { name: /^Search$/ }).click();
      await page.waitForSelector('section[aria-label="Results"] article', { timeout: 120_000 });
      await page.waitForTimeout(3_000);
      const titles = await page.locator('section[aria-label="Results"] article h3').allInnerTexts();
      log.resultCount = titles.length;
      log.searchTitles = titles.slice(0, 10);
      const url = page.url();
      await page.screenshot({ path: path.join(evidence, "02-search-results.png") });
      return { count: titles.length, urlHasQuery: url.includes("q=reading") };
    });

    await step("sort by quality signals", async () => {
      await page.getByLabel("Sort").selectOption("quality");
      await page.waitForTimeout(800);
      const disclaimer = await page.getByText(/Quality signals is a heuristic/i).count();
      const count = await page.locator('section[aria-label="Results"] article').count();
      await page.screenshot({ path: path.join(evidence, "03-quality-sort.png") });
      return { count, disclaimer: disclaimer > 0 };
    });

    await step("peer-reviewed filter", async () => {
      const before = await page.locator('section[aria-label="Results"] article').count();
      await page.getByLabel(/Peer-reviewed only/).check();
      await page.waitForTimeout(800);
      const after = await page.locator('section[aria-label="Results"] article').count();
      await page.getByLabel(/Peer-reviewed only/).uncheck();
      return { before, after };
    });

    await step("open paper and read citation", async () => {
      const link = page.locator('section[aria-label="Results"] article h3 a').first();
      log.savedTitle = await link.innerText();
      await link.click();
      await page.waitForURL(/\/paper\//, { timeout: 30_000 });
      await page.waitForTimeout(1_500);
      const h1 = await page.locator("h1").first().innerText();
      const citeSection = await page.locator("#cite").count();
      if (/paper not found/i.test(h1)) throw new Error(`opened result has no detail page: ${h1}`);
      await page.screenshot({ path: path.join(evidence, "04-paper-detail.png") });
      return { title: log.savedTitle, h1, citeSection: citeSection > 0 };
    });

    await step("save to library", async () => {
      const save = page.getByRole("button", { name: /Save/ }).first();
      if (await save.count()) await save.click();
      await page.waitForTimeout(1_000);
      await page.goto("/library", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1_500);
      const body = await page.locator("body").innerText();
      log.savedTitleVisible = !!log.savedTitle && body.includes(log.savedTitle.slice(0, 40));
      await page.screenshot({ path: path.join(evidence, "05-library.png") });
      return { savedTitleVisible: log.savedTitleVisible };
    });

    await step("cite a known DOI", async () => {
      await page.goto("/cite", { waitUntil: "domcontentloaded" });
      await page.fill("#dois", "10.1038/nature12373");
      await page.getByRole("button", { name: /^Generate$/ }).click();
      await page.waitForFunction(
        () => /Transcription activator-like effector nucleases|Nature/i.test(document.body.innerText),
        undefined,
        { timeout: 90_000 }
      );
      const body = await page.locator("body").innerText();
      log.citationFound = /Transcription activator-like effector nucleases|Nature/i.test(body);
      await page.screenshot({ path: path.join(evidence, "06-cite.png") });
      return { citationFound: log.citationFound };
    });

    await step("mobile layout has no horizontal overflow", async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("/search", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1_000);
      log.overflowPx = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      await page.screenshot({ path: path.join(evidence, "07-mobile.png") });
      return { overflowPx: log.overflowPx };
    });

    await step("databases page lists the sources", async () => {
      await page.setViewportSize({ width: 1366, height: 900 });
      await page.goto("/databases", { waitUntil: "domcontentloaded" });
      const h1 = await page.locator("h1").first().innerText();
      return { h1, mentionsDbs: /databases/i.test(h1) };
    });
  } finally {
    fs.writeFileSync(path.join(evidence, "qa-run.json"), JSON.stringify(log, null, 2));
  }

  expect(log.steps.filter((s) => !s.ok), "failed QA steps").toEqual([]);
  expect(log.resultCount ?? 0, "search results").toBeGreaterThan(0);
  expect(log.savedTitleVisible, "saved paper visible in library").toBe(true);
  expect(log.citationFound, "known DOI resolves to a citation").toBe(true);
  expect(log.overflowPx ?? 999, "mobile horizontal overflow px").toBeLessThanOrEqual(1);
});

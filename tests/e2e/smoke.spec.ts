import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PAGES = [
  { path: "/", heading: /research|thesis/i },
  { path: "/about", heading: /what this tool is/i },
  { path: "/databases", heading: /databases/i },
  { path: "/login", heading: /sign in/i },
  { path: "/status", heading: /service status/i },
  { path: "/suggestions", heading: /problems and suggestions/i },
];

for (const entry of PAGES) {
  test(`${entry.path} loads without a page error`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto(entry.path);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(entry.heading);
    expect(errors).toEqual([]);
  });
}

test("a missing page shows the custom 404", async ({ page }) => {
  await page.goto("/this-page-does-not-exist");
  await expect(page.getByRole("heading", { level: 1, name: /page not found/i })).toBeVisible();
});

test("phone navigation includes the suggestions board", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Main" }).last();
  await nav.getByRole("link", { name: "Suggestions" }).click();
  await expect(page).toHaveURL(/\/suggestions$/);
  await expect(page.getByRole("heading", { level: 1, name: /problems and suggestions/i })).toBeVisible();
});

test("public pages fit a phone viewport without sideways scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  for (const path of [
    "/", "/search", "/library", "/cite", "/settings", "/status", "/suggestions", "/databases", "/about",
  ]) {
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow, `${path} overflows horizontally`).toBeLessThanOrEqual(1);
  }
});

test("public pages have no serious accessibility violations", async ({ page }) => {
  for (const path of ["/", "/about", "/databases", "/login"]) {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious, `${path}: ${serious.map((v) => v.id).join(", ")}`).toEqual([]);
  }
});

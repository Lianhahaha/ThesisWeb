import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PAGES = [
  { path: "/", heading: /research|thesis/i },
  { path: "/about", heading: /what this tool is/i },
  { path: "/databases", heading: /databases/i },
  { path: "/login", heading: /sign in/i },
  { path: "/status", heading: /service status/i },
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

test("public pages have no serious accessibility violations", async ({ page }) => {
  for (const path of ["/", "/about", "/databases", "/login"]) {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious, `${path}: ${serious.map((v) => v.id).join(", ")}`).toEqual([]);
  }
});

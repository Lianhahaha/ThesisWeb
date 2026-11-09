import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { acceptTerms } from "./terms";

test.beforeEach(async ({ page }) => {
  await acceptTerms(page);
});

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

test("a first visit must read the terms before accepting", async ({ page }) => {
  await page.addInitScript(() => localStorage.removeItem("tw-terms-accepted"));
  await page.goto("/");

  const dialog = page.getByRole("dialog", { name: "Before you continue" });
  await expect(dialog).toBeVisible();
  const box = dialog.getByRole("checkbox");
  const accept = dialog.getByRole("button", { name: /accept and continue/i });
  await expect(box).toBeDisabled();
  await expect(accept).toBeDisabled();
  await expect(dialog.getByText(/scroll to the end to continue/i)).toBeVisible();

  const termsHeader = dialog.getByRole("heading", { name: "Terms of Use" }).locator("..");
  await expect(termsHeader).toHaveCSS("position", "sticky");

  await dialog.getByText("End of the Terms of Use and Privacy Policy.").scrollIntoViewIfNeeded();
  await expect(box).toBeEnabled();
  await expect(dialog.getByText(/first to proceed/i)).toBeVisible();
  await expect(dialog.getByText(/unlocked/i)).toHaveCount(0);

  await box.check();
  await accept.click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("the terms gate fits and scrolls on a small phone", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.addInitScript(() => localStorage.removeItem("tw-terms-accepted"));
  await page.goto("/");

  const dialog = page.getByRole("dialog", { name: "Before you continue" });
  await expect(dialog).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(1);

  const scroller = dialog.locator(".overflow-y-auto");
  const metrics = await scroller.evaluate((el) => ({
    scrollHeight: el.scrollHeight,
    clientHeight: el.clientHeight,
  }));
  expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);

  await dialog.getByRole("heading", { name: "Privacy Policy" }).scrollIntoViewIfNeeded();
  await expect(dialog.getByRole("heading", { name: "Privacy Policy" })).toBeInViewport();
});

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

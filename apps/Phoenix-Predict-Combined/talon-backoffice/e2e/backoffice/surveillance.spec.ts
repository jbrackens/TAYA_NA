import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "../fixtures/auth";

/**
 * Talon Backoffice - Market-integrity surveillance (P1-4 slice 3)
 *
 * Asserts the page renders and degrades honestly (alerts card, empty
 * state, or error). Alert/case data comes from the Go gateway, not the
 * e2e mock, so no live data is asserted.
 */
test.describe("Talon Backoffice - Surveillance", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/surveillance");
    await page.waitForLoadState("networkidle", { timeout: 10_000 });
  });

  test("surveillance page loads", async ({ page }) => {
    const shell = page
      .locator('[data-testid="surveillance-page"]')
      .or(page.getByRole("heading", { name: /surveillance/i }))
      .first();
    await expect(shell).toBeVisible({ timeout: 5000 });
  });

  test("shows alerts card, empty state, or honest error", async ({ page }) => {
    const alertsCard = page.locator('[data-testid="surveillance-alerts"]');
    const errorState = page.getByText(/failed|error|retry/i).first();
    const cardVisible = await alertsCard
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    const errorVisible = await errorState
      .isVisible({ timeout: 1000 })
      .catch(() => false);
    expect(cardVisible || errorVisible).toBe(true);
  });

  test("sidebar exposes the Surveillance entry", async ({ page }) => {
    await expect(page.locator('a[href="/surveillance"]').first()).toBeVisible({
      timeout: 5000,
    });
  });
});

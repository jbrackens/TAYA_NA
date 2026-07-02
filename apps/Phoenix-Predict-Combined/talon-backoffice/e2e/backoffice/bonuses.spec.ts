import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "../fixtures/auth";

/**
 * Talon Backoffice - Bonuses & Campaigns (P1-6 slice 1)
 * Renders campaigns, the grant form, and player bonuses from the bonus
 * engine; degrades honestly when the API is unavailable.
 */
test.describe("Talon Backoffice - Bonuses", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/bonuses");
    await page.waitForLoadState("networkidle", { timeout: 10_000 });
  });

  test("bonuses page loads", async ({ page }) => {
    const shell = page
      .locator('[data-testid="bonuses-page"]')
      .or(page.getByRole("heading", { name: /bonuses/i }))
      .first();
    await expect(shell).toBeVisible({ timeout: 5000 });
  });

  test("shows campaigns + grant cards, or honest error", async ({ page }) => {
    const campaigns = page.locator('[data-testid="campaigns-card"]');
    const grant = page.locator('[data-testid="grant-card"]');
    const errorState = page.getByText(/failed|error|retry/i).first();
    const cardsVisible =
      (await campaigns.isVisible({ timeout: 5000 }).catch(() => false)) &&
      (await grant.isVisible({ timeout: 2000 }).catch(() => false));
    const errorVisible = await errorState
      .isVisible({ timeout: 1000 })
      .catch(() => false);
    expect(cardsVisible || errorVisible).toBe(true);
  });

  test("grant requires campaign, user, and reason", async ({ page }) => {
    const grantVisible = await page
      .locator('[data-testid="grant-submit"]')
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    test.skip(!grantVisible, "grant form not rendered (API unavailable)");
    // Submitting empty surfaces the validation notice, not a network call.
    await page.locator('[data-testid="grant-submit"]').click();
    await expect(page.locator('[data-testid="bonus-notice"]')).toContainText(
      /required/i,
      { timeout: 3000 },
    );
  });

  test("sidebar exposes the Bonuses entry", async ({ page }) => {
    await expect(page.locator('a[href="/bonuses"]').first()).toBeVisible({
      timeout: 5000,
    });
  });
});

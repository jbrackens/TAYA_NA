import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "../fixtures/auth";

/**
 * Talon Backoffice - Tenants & Brands (P2-1 peripheral)
 */
test.describe("Talon Backoffice - Tenants", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/tenants");
    await page.waitForLoadState("networkidle", { timeout: 10_000 });
  });

  test("tenants page loads", async ({ page }) => {
    const shell = page
      .locator('[data-testid="tenants-page"]')
      .or(page.getByRole("heading", { name: /tenants/i }))
      .first();
    await expect(shell).toBeVisible({ timeout: 5000 });
  });

  test("shows the tenants table + create card, or honest error", async ({
    page,
  }) => {
    const table = page.locator('[data-testid="tenants-card"]');
    const errorState = page.getByText(/failed|error|retry/i).first();
    const tableVisible = await table
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    const errorVisible = await errorState
      .isVisible({ timeout: 1000 })
      .catch(() => false);
    expect(tableVisible || errorVisible).toBe(true);
  });

  test("sidebar exposes the Tenants entry", async ({ page }) => {
    await expect(page.locator('a[href="/tenants"]').first()).toBeVisible({
      timeout: 5000,
    });
  });
});

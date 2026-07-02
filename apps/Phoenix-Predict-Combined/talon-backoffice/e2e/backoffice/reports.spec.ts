import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "../fixtures/auth";

/**
 * Talon Backoffice - Reports & Exports (P1-6 slice 3)
 * Lives at /exports — the legacy /reports route stays a beta-hidden redirect.
 */
test.describe("Talon Backoffice - Reports", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/exports");
    await page.waitForLoadState("networkidle", { timeout: 10_000 });
  });

  test("exports page loads with export cards", async ({ page }) => {
    await expect(page.locator('[data-testid="exports-page"]')).toBeVisible({
      timeout: 5000,
    });
    await expect(
      page.locator('[data-testid="export-kyc-statuses"]'),
    ).toBeVisible({ timeout: 5000 });
    await expect(
      page.locator('[data-testid="export-surveillance-alerts"]'),
    ).toBeVisible({ timeout: 5000 });
  });

  test("KYC export link points at the gateway CSV route", async ({ page }) => {
    const href = await page
      .locator('[data-testid="export-kyc-statuses"]')
      .getAttribute("href");
    expect(href).toBe("/api/v1/admin/reports/kyc-statuses.csv");
  });

  test("sidebar exposes the Reports entry", async ({ page }) => {
    await expect(page.locator('a[href="/exports"]').first()).toBeVisible({
      timeout: 5000,
    });
  });
});

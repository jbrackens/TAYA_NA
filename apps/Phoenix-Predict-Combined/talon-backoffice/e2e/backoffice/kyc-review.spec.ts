import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "../fixtures/auth";

/**
 * Talon Backoffice - KYC Review (P0-3 slice 2)
 *
 * The review queue talks to the Go gateway's /api/v1/admin/kyc/* routes,
 * which are not part of the e2e mock server — so, like the other backoffice
 * specs, these tests assert the surface renders and degrades honestly
 * (queue table, empty state, or error state) rather than asserting live data.
 */

test.describe("Talon Backoffice - KYC Review", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/compliance/kyc");
    await page.waitForLoadState("networkidle", { timeout: 10_000 });
  });

  test("KYC review page loads", async ({ page }) => {
    const pageShell = page
      .locator('[data-testid="kyc-review-page"]')
      .or(page.getByRole("heading", { name: /kyc review/i }))
      .first();
    await expect(pageShell).toBeVisible({ timeout: 5000 });
  });

  test("shows queue table, empty state, or honest error state", async ({
    page,
  }) => {
    const queueTable = page.locator('[data-testid="kyc-queue-table"]');
    const emptyState = page.getByText(/no identities awaiting review/i);
    const errorState = page.getByText(/failed|error|retry/i).first();

    const tableVisible = await queueTable
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    const emptyVisible = await emptyState
      .isVisible({ timeout: 1000 })
      .catch(() => false);
    const errorVisible = await errorState
      .isVisible({ timeout: 1000 })
      .catch(() => false);

    expect(tableVisible || emptyVisible || errorVisible).toBe(true);
  });

  test("sidebar exposes the KYC Review entry", async ({ page }) => {
    const navLink = page.locator('a[href="/compliance/kyc"]');
    await expect(navLink.first()).toBeVisible({ timeout: 5000 });
  });
});

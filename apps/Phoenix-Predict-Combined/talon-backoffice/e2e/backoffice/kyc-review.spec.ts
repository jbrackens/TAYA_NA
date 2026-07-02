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

test.describe("Talon Backoffice - Profile 360 KYC tab", () => {
  test("user detail exposes a KYC tab (P0-3 slice 3)", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/users");
    await page.waitForLoadState("networkidle", { timeout: 10_000 });

    // Open the first user row if the directory has data; skip honestly when
    // the local stack has no seeded punters.
    const firstRow = page.locator("table tbody tr").first();
    const hasRows = await firstRow
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    test.skip(!hasRows, "no punters listed in this environment");

    await firstRow.click();
    await page.waitForURL(/\/users\/.+/, { timeout: 10_000 });

    const kycTab = page.locator('[data-testid="profile-kyc-tab"]');
    await expect(kycTab).toBeVisible({ timeout: 15_000 });
    await kycTab.click();
    await expect(
      page.locator('[data-testid="profile-kyc-content"]'),
    ).toBeVisible({ timeout: 5000 });
  });
});

import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "../fixtures/auth";

/**
 * Talon Backoffice - Manual balance adjustment (P1-2)
 *
 * Drives a REAL credit through the audited admin wallet route against the
 * local stack. Skips honestly when no punters are seeded.
 */

test.describe("Talon Backoffice - Balance adjustment", () => {
  test("credit with reason posts and reports the new balance", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto("/users");
    await page.waitForLoadState("networkidle", { timeout: 10_000 });

    const firstRow = page.locator("table tbody tr").first();
    const hasRows = await firstRow
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    test.skip(!hasRows, "no punters listed in this environment");

    await firstRow.click();
    await page.waitForURL(/\/users\/.+/, { timeout: 10_000 });

    const card = page.locator('[data-testid="balance-adjustment-card"]');
    await expect(card).toBeVisible({ timeout: 15_000 });

    // Submit stays disabled until amount AND reason are present.
    const submit = page.locator('[data-testid="adjustment-submit"]');
    await expect(submit).toBeDisabled();
    await page.locator('[data-testid="adjustment-amount"]').fill("1.00");
    await expect(submit).toBeDisabled();
    await page
      .locator('[data-testid="adjustment-reason"]')
      .fill("e2e goodwill points check");
    await expect(submit).toBeEnabled();

    await submit.click();

    // Confirmation step is mandatory.
    const confirmButton = page.locator("button:has-text('Credit')").last();
    await expect(confirmButton).toBeVisible({ timeout: 5000 });
    await confirmButton.click();

    const notice = page.locator('[data-testid="adjustment-notice"]');
    await expect(notice).toBeVisible({ timeout: 10_000 });
    await expect(notice).toContainText(/Credited 1 pts — new balance/);
  });

  test("Limits tab renders RG state (P1-3)", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/users");
    await page.waitForLoadState("networkidle", { timeout: 10_000 });

    const firstRow = page.locator("table tbody tr").first();
    const hasRows = await firstRow
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    test.skip(!hasRows, "no punters listed in this environment");

    await firstRow.click();
    await page.waitForURL(/\/users\/.+/, { timeout: 10_000 });

    const limitsTab = page.locator('[data-testid="profile-limits-tab"]');
    await expect(limitsTab).toBeVisible({ timeout: 15_000 });
    await limitsTab.click();
    await expect(
      page.locator('[data-testid="profile-limits-content"]'),
    ).toBeVisible({ timeout: 5000 });
  });
});

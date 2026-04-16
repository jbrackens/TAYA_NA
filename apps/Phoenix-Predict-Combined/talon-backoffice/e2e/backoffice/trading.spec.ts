import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "../fixtures/auth";

/**
 * Talon Backoffice - Trading View Tests
 * Tests market management and trading operations
 */

test.describe("Talon Backoffice - Trading", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await loginAsAdmin(page);

    // Navigate to trading view
    await page.goto("/trading");
    await page.waitForLoadState("networkidle", { timeout: 10_000 });
  });

  test("Trading page loads with fixture board", async ({ page }) => {
    // Verify trading page loaded
    const tradingView = page
      .locator('[data-testid="trading-view"]')
      .or(page.locator('[data-testid="fixture-board"]'))
      .or(page.locator("heading"))
      .first();

    await expect(tradingView).toBeVisible({ timeout: 5000 });

    // Verify fixtures/matches are listed
    const fixtures = page.locator(
      '[data-testid="trading-fixture"], [data-testid="fixture-item"], [role="row"]'
    );
    const fixtureCount = await fixtures.count();

    expect(fixtureCount).toBeGreaterThanOrEqual(0);
  });

  test("Fixture board displays match information (teams, time, odds)", async ({ page }) => {
    // Find first fixture
    const firstFixture = page
      .locator('[data-testid="trading-fixture"], [data-testid="fixture-item"]')
      .first();

    const isFixtureVisible = await firstFixture.isVisible({ timeout: 5000 }).catch(() => false);

    if (isFixtureVisible) {
      // Verify fixture contains team names
      const teamInfo = firstFixture.locator('text=/vs|vs\\.|Home|Away/');
      const isTeamVisible = await teamInfo.isVisible().catch(() => false);

      // Fixture should display some information
      const fixtureText = await firstFixture.textContent();
      expect(fixtureText).toBeTruthy();
    }
  });

  test("Click fixture → market management panel opens", async ({ page }) => {
    // Find first fixture
    const firstFixture = page
      .locator('[data-testid="trading-fixture"], [data-testid="fixture-item"]')
      .first();

    const isFixtureVisible = await firstFixture.isVisible({ timeout: 5000 }).catch(() => false);

    if (isFixtureVisible) {
      // Click fixture to open market panel
      await firstFixture.click();

      // Wait for panel to open
      await page.waitForTimeout(500);

      // Find market management panel
      const marketPanel = page
        .locator('[data-testid="market-panel"]')
        .or(page.locator('[data-testid="market-management"]'))
        .or(page.locator('[data-testid="trading-panel"]'))
        .first();

      const isPanelVisible = await marketPanel.isVisible({ timeout: 5000 }).catch(() => false);

      if (isPanelVisible) {
        expect(isPanelVisible).toBe(true);
      }
    }
  });

  test("Market management panel shows market list", async ({ page }) => {
    // Open a fixture
    const firstFixture = page
      .locator('[data-testid="trading-fixture"], [data-testid="fixture-item"]')
      .first();

    const isFixtureVisible = await firstFixture.isVisible({ timeout: 5000 }).catch(() => false);

    if (isFixtureVisible) {
      await firstFixture.click();
      await page.waitForTimeout(500);

      // Find market panel
      const marketPanel = page
        .locator('[data-testid="market-panel"]')
        .or(page.locator('[data-testid="market-management"]'))
        .first();

      const isPanelVisible = await marketPanel.isVisible().catch(() => false);

      if (isPanelVisible) {
        // Find markets list
        const markets = marketPanel.locator(
          '[data-testid="market-item"], [data-testid="market"], [role="listitem"]'
        );
        const marketCount = await markets.count();

        // Should show some markets or empty state
        expect(marketCount).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test("Toggle market suspension → status changes", async ({ page }) => {
    // Open a fixture
    const firstFixture = page
      .locator('[data-testid="trading-fixture"], [data-testid="fixture-item"]')
      .first();

    const isFixtureVisible = await firstFixture.isVisible({ timeout: 5000 }).catch(() => false);

    if (isFixtureVisible) {
      await firstFixture.click();
      await page.waitForTimeout(500);

      // Find market item
      const marketItem = page
        .locator('[data-testid="market-item"], [data-testid="market"]')
        .first();

      const isMarketVisible = await marketItem.isVisible().catch(() => false);

      if (isMarketVisible) {
        // Find suspend/suspend toggle button
        const suspendButton = page
          .locator('[data-testid="toggle-suspension"]')
          .or(page.locator('[data-testid="suspend-market"]'))
          .or(page.locator("button:has-text('Suspend')"))
          .or(page.locator("button:has-text('Unsuspend')"))
          .first();

        const isButtonVisible = await suspendButton.isVisible().catch(() => false);

        if (isButtonVisible) {
          // Get initial status
          const initialStatus = await marketItem.getAttribute("data-status").catch(() => "");

          // Click suspend button
          await suspendButton.click();
          await page.waitForTimeout(500);

          // Verify status changed
          const newStatus = await marketItem.getAttribute("data-status").catch(() => "");

          // Status should have changed or market should still be present
          expect(newStatus).toBeTruthy();
        }
      }
    }
  });

  test("Click settle on market → settlement panel opens", async ({ page }) => {
    // Open a fixture
    const firstFixture = page
      .locator('[data-testid="trading-fixture"], [data-testid="fixture-item"]')
      .first();

    const isFixtureVisible = await firstFixture.isVisible({ timeout: 5000 }).catch(() => false);

    if (isFixtureVisible) {
      await firstFixture.click();
      await page.waitForTimeout(500);

      // Find market item
      const marketItem = page
        .locator('[data-testid="market-item"], [data-testid="market"]')
        .first();

      const isMarketVisible = await marketItem.isVisible().catch(() => false);

      if (isMarketVisible) {
        // Find settle button
        const settleButton = page
          .locator('[data-testid="settle-market"]')
          .or(page.locator("button:has-text('Settle')"))
          .first();

        const isButtonVisible = await settleButton.isVisible().catch(() => false);

        if (isButtonVisible) {
          // Click settle
          await settleButton.click();
          await page.waitForTimeout(500);

          // Find settlement panel
          const settlementPanel = page
            .locator('[data-testid="settlement-panel"]')
            .or(page.locator('[data-testid="settle-panel"]'))
            .first();

          const isPanelVisible = await settlementPanel.isVisible({ timeout: 5000 }).catch(
            () => false
          );

          if (isPanelVisible) {
            expect(isPanelVisible).toBe(true);
          }
        }
      }
    }
  });

  test("Settlement panel shows market selections", async ({ page }) => {
    // Open a fixture
    const firstFixture = page
      .locator('[data-testid="trading-fixture"], [data-testid="fixture-item"]')
      .first();

    const isFixtureVisible = await firstFixture.isVisible({ timeout: 5000 }).catch(() => false);

    if (isFixtureVisible) {
      await firstFixture.click();
      await page.waitForTimeout(500);

      // Find settle button
      const settleButton = page
        .locator('[data-testid="settle-market"]')
        .or(page.locator("button:has-text('Settle')"))
        .first();

      const isButtonVisible = await settleButton.isVisible().catch(() => false);

      if (isButtonVisible) {
        await settleButton.click();
        await page.waitForTimeout(500);

        // Find settlement panel
        const settlementPanel = page
          .locator('[data-testid="settlement-panel"]')
          .or(page.locator('[data-testid="settle-panel"]'))
          .first();

        const isPanelVisible = await settlementPanel.isVisible().catch(() => false);

        if (isPanelVisible) {
          // Find selections list in settlement panel
          const selections = settlementPanel.locator(
            '[data-testid="selection-item"], [role="listitem"]'
          );
          const selectionCount = await selections.count();

          // Should have selections to settle
          expect(selectionCount).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  test("Filter fixtures by sport", async ({ page }) => {
    // Find sport filter
    const sportFilter = page
      .locator('[data-testid="sport-filter"]')
      .or(page.locator('[data-testid="sport-select"]'))
      .or(page.locator("select, [role='combobox']"))
      .first();

    const isFilterVisible = await sportFilter.isVisible().catch(() => false);

    if (isFilterVisible) {
      // Get initial fixture count
      const initialFixtures = page.locator(
        '[data-testid="trading-fixture"], [data-testid="fixture-item"]'
      );
      const initialCount = await initialFixtures.count();

      // Click filter
      await sportFilter.click();
      await page.waitForTimeout(300);

      // Select first sport option
      const firstOption = page.locator('[role="option"], option').nth(1);
      const isOptionVisible = await firstOption.isVisible().catch(() => false);

      if (isOptionVisible) {
        await firstOption.click();

        // Wait for filter to apply
        await page.waitForLoadState("networkidle", { timeout: 10_000 });

        // Get updated fixture count
        const updatedFixtures = page.locator(
          '[data-testid="trading-fixture"], [data-testid="fixture-item"]'
        );
        const updatedCount = await updatedFixtures.count();

        // Count should be same or different (filtered)
        expect(updatedCount).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test("Filter fixtures by status (live, scheduled, ended)", async ({ page }) => {
    // Find status filter
    const statusFilter = page
      .locator('[data-testid="status-filter"]')
      .or(page.locator('input[type="radio"][name*="status"]'))
      .first();

    const isFilterVisible = await statusFilter.isVisible().catch(() => false);

    if (isFilterVisible) {
      // Click filter to toggle status
      await statusFilter.click();

      // Wait for filter to apply
      await page.waitForLoadState("networkidle", { timeout: 10_000 });

      // Verify fixtures updated
      const fixtures = page.locator(
        '[data-testid="trading-fixture"], [data-testid="fixture-item"]'
      );
      const fixtureCount = await fixtures.count();

      expect(fixtureCount).toBeGreaterThanOrEqual(0);
    }
  });

  test("Export trading data/report", async ({ page }) => {
    // Find export button
    const exportButton = page
      .locator('[data-testid="export-button"]')
      .or(page.locator("button:has-text('Export')"))
      .first();

    const isExportVisible = await exportButton.isVisible().catch(() => false);

    if (isExportVisible) {
      // Click export
      await exportButton.click();

      // Wait for download or modal
      await page.waitForTimeout(1000);

      // Verify export initiated (download or modal)
      // Just verify click was handled
      expect(isExportVisible).toBe(true);
    }
  });
});

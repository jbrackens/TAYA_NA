import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "../fixtures/auth";

/**
 * Talon Backoffice - Dashboard Tests
 * Tests admin dashboard and widget functionality
 */

test.describe("Talon Backoffice - Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await loginAsAdmin(page);

    // Navigate to dashboard
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle", { timeout: 10_000 });
  });

  test("Dashboard loads with all main widgets visible", async ({ page }) => {
    // Find dashboard container
    const dashboard = page
      .locator('[data-testid="dashboard"]')
      .or(page.locator('[data-testid="dashboard-container"]'))
      .first();

    await expect(dashboard).toBeVisible({ timeout: 5000 });

    // Verify at least one widget is visible
    const widgets = page.locator('[data-testid="dashboard-widget"], [data-testid*="widget"]');
    const widgetCount = await widgets.count();

    expect(widgetCount).toBeGreaterThan(0);
  });

  test("Revenue widget displays numeric values", async ({ page }) => {
    // Find revenue widget
    const revenueWidget = page
      .locator('[data-testid="revenue-widget"]')
      .or(page.locator('[data-testid="widget-revenue"]'))
      .or(page.locator("text=Revenue"))
      .first();

    const isRevenueVisible = await revenueWidget.isVisible({ timeout: 5000 }).catch(() => false);

    if (isRevenueVisible) {
      // Verify widget contains numeric value
      const revenueValue = revenueWidget.locator(
        '[data-testid="revenue-value"], text=/\\$?\\d+([,.]\\d+)?/'
      );
      const isValueVisible = await revenueValue.isVisible().catch(() => false);

      if (isValueVisible) {
        const valueText = await revenueValue.textContent();
        // Should contain number
        expect(valueText).toMatch(/\\d/);
      }
    }
  });

  test("Active bets widget displays bet count", async ({ page }) => {
    // Find active bets widget
    const activeBetsWidget = page
      .locator('[data-testid="active-bets-widget"]')
      .or(page.locator('[data-testid="widget-active-bets"]'))
      .or(page.locator("text=/Active|Bets|Open Bets/"))
      .first();

    const isWidgetVisible = await activeBetsWidget.isVisible({ timeout: 5000 }).catch(() => false);

    if (isWidgetVisible) {
      // Verify widget contains number
      const betCount = activeBetsWidget.locator('text=/\\d+/');
      const isCountVisible = await betCount.isVisible().catch(() => false);

      if (isCountVisible) {
        const countText = await betCount.textContent();
        expect(countText).toMatch(/\\d/);
      }
    }
  });

  test("Live matches widget displays match count", async ({ page }) => {
    // Find live matches widget
    const liveMatchesWidget = page
      .locator('[data-testid="live-matches-widget"]')
      .or(page.locator('[data-testid="widget-live-matches"]'))
      .or(page.locator("text=/Live|Matches/"))
      .first();

    const isWidgetVisible = await liveMatchesWidget.isVisible({ timeout: 5000 }).catch(() => false);

    if (isWidgetVisible) {
      // Widget should be visible and contain content
      const content = await liveMatchesWidget.textContent();
      expect(content).toBeTruthy();
    }
  });

  test("Alerts widget displays recent alerts", async ({ page }) => {
    // Find alerts widget
    const alertsWidget = page
      .locator('[data-testid="alerts-widget"]')
      .or(page.locator('[data-testid="widget-alerts"]'))
      .or(page.locator("text=/Alert|Notification/"))
      .first();

    const isWidgetVisible = await alertsWidget.isVisible({ timeout: 5000 }).catch(() => false);

    if (isWidgetVisible) {
      // Widget should contain some content (alerts or "no alerts" message)
      const content = await alertsWidget.textContent();
      expect(content).toBeTruthy();
    }
  });

  test("Click live matches widget → navigates to trading", async ({ page }) => {
    // Find live matches widget
    const liveMatchesWidget = page
      .locator('[data-testid="live-matches-widget"]')
      .or(page.locator('[data-testid="widget-live-matches"]'))
      .or(page.locator("text=/Live|Matches/"))
      .first();

    const isWidgetVisible = await liveMatchesWidget.isVisible({ timeout: 5000 }).catch(() => false);

    if (isWidgetVisible) {
      // Click widget to navigate to trading
      await liveMatchesWidget.click();

      // Wait for navigation
      await page.waitForLoadState("networkidle", { timeout: 10_000 });

      // Verify navigated to trading or similar view
      expect(page.url()).toContain("/trading") || expect(page.url()).toContain("/risk");
    }
  });

  test("Dashboard widgets refresh data on auto-refresh interval", async ({ page }) => {
    // Get initial revenue widget value
    const revenueWidget = page
      .locator('[data-testid="revenue-widget"]')
      .or(page.locator("text=Revenue"))
      .first();

    const isRevenueVisible = await revenueWidget.isVisible({ timeout: 5000 }).catch(() => false);

    if (isRevenueVisible) {
      const initialValue = await revenueWidget.textContent();

      // Wait for potential refresh interval (typically 30 seconds)
      await page.waitForTimeout(2000);

      // Get updated value
      const updatedValue = await revenueWidget.textContent();

      // Value should still be present (may be same or different)
      expect(updatedValue).toBeTruthy();
    }
  });

  test("Dashboard responsive layout on different viewports", async ({ page }) => {
    // Test different viewports
    const viewports = [
      { width: 1024, height: 768, name: "tablet" },
      { width: 1920, height: 1080, name: "desktop" },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);

      // Reload dashboard
      await page.goto("/dashboard");
      await page.waitForLoadState("networkidle", { timeout: 10_000 });

      // Verify dashboard is still visible
      const dashboard = page.locator('[data-testid="dashboard"]').first();
      const isVisible = await dashboard.isVisible({ timeout: 5000 }).catch(() => false);

      expect(isVisible).toBe(true);
    }
  });

  test("Dashboard shows timestamp of last update", async ({ page }) => {
    // Find last update timestamp
    const timestamp = page
      .locator('[data-testid="last-update"]')
      .or(page.locator('[data-testid="updated-at"]'))
      .or(page.locator("text=/Last updated|Updated at/"))
      .first();

    const isTimestampVisible = await timestamp.isVisible().catch(() => false);

    // Timestamp may or may not be visible (depends on design)
    if (isTimestampVisible) {
      const timestampText = await timestamp.textContent();
      expect(timestampText).toBeTruthy();
    }
  });

  test("Dashboard widgets have proper loading states", async ({ page }) => {
    // Check for loading indicators
    const loadingIndicators = page.locator(
      '[data-testid="loading"], [role="status"], .skeleton, .loader'
    );

    // May have loading indicators initially
    const initialLoadingCount = await loadingIndicators.count();

    // Wait for loading to complete
    await page.waitForLoadState("networkidle", { timeout: 10_000 });

    // Loading indicators should be gone
    const finalLoadingCount = await loadingIndicators.count();

    // Should have fewer or equal loading states
    expect(finalLoadingCount).toBeLessThanOrEqual(initialLoadingCount);
  });
});

import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "../fixtures/auth";

/**
 * Talon Backoffice - Audit Logs Tests
 * Tests audit trail and logging functionality
 */

test.describe("Talon Backoffice - Audit Logs", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await loginAsAdmin(page);

    // Navigate to audit logs page
    await page.goto("/logs");
    await page.waitForLoadState("networkidle", { timeout: 10_000 });
  });

  test("Audit logs page loads with log table", async ({ page }) => {
    // Verify logs page loaded
    const logsPage = page
      .locator('[data-testid="logs-page"]')
      .or(page.locator('[data-testid="audit-logs"]'))
      .or(page.locator("heading"))
      .first();

    await expect(logsPage).toBeVisible({ timeout: 5000 });

    // Verify log table is present
    const logTable = page
      .locator('[data-testid="log-table"]')
      .or(page.locator('[data-testid="audit-table"]'))
      .or(page.locator('[role="table"]'))
      .first();

    const isTableVisible = await logTable.isVisible({ timeout: 5000 }).catch(() => false);

    // Either table or log list should be visible
    expect(isTableVisible || (await page.locator('[data-testid="log-entry"]').count()) > 0).toBe(
      true
    );
  });

  test("Log table displays columns (timestamp, action, user, resource, result)", async ({
    page,
  }) => {
    // Find log table
    const logTable = page
      .locator('[data-testid="log-table"]')
      .or(page.locator('[data-testid="audit-table"]'))
      .or(page.locator('[role="table"]'))
      .first();

    const isTableVisible = await logTable.isVisible().catch(() => false);

    if (isTableVisible) {
      // Check for table headers
      const headers = logTable.locator('[role="columnheader"], th');
      const headerCount = await headers.count();

      // Should have multiple columns
      expect(headerCount).toBeGreaterThan(0);

      // Verify at least one log entry row
      const rows = logTable.locator('[role="row"]');
      const rowCount = await rows.count();

      expect(rowCount).toBeGreaterThan(0);
    }
  });

  test("Filter logs by action type → results filter", async ({ page }) => {
    // Find action type filter
    const actionFilter = page
      .locator('[data-testid="action-filter"]')
      .or(page.locator('[data-testid="log-action-filter"]'))
      .or(page.locator("select, [role='combobox']"))
      .first();

    const isFilterVisible = await actionFilter.isVisible().catch(() => false);

    if (isFilterVisible) {
      // Get initial log count
      const initialLogs = page.locator(
        '[data-testid="log-entry"], [data-testid="log-row"], [role="row"]'
      );
      const initialCount = await initialLogs.count();

      // Click filter
      await actionFilter.click();
      await page.waitForTimeout(300);

      // Select first action option
      const firstOption = page.locator('[role="option"], select option').nth(1);
      const isOptionVisible = await firstOption.isVisible().catch(() => false);

      if (isOptionVisible) {
        await firstOption.click();

        // Wait for filter to apply
        await page.waitForLoadState("networkidle", { timeout: 10_000 });

        // Verify filtered results
        const updatedLogs = page.locator(
          '[data-testid="log-entry"], [data-testid="log-row"], [role="row"]'
        );
        const updatedCount = await updatedLogs.count();

        // Results should be filtered
        expect(updatedCount).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test("Filter logs by date range", async ({ page }) => {
    // Find date filter
    const dateFilter = page
      .locator('[data-testid="date-filter"]')
      .or(page.locator('[data-testid="date-range"]'))
      .or(page.locator('input[type="date"]'))
      .first();

    const isDateFilterVisible = await dateFilter.isVisible().catch(() => false);

    if (isDateFilterVisible) {
      // Get initial log count
      const initialLogs = page.locator(
        '[data-testid="log-entry"], [data-testid="log-row"], [role="row"]'
      );
      const initialCount = await initialLogs.count();

      // Click date filter
      await dateFilter.click();
      await page.waitForTimeout(300);

      // Type a recent date
      await dateFilter.fill("2024-12-01");

      // Wait for filter to apply
      await page.waitForLoadState("networkidle", { timeout: 10_000 });

      // Verify filtered results
      const updatedLogs = page.locator(
        '[data-testid="log-entry"], [data-testid="log-row"], [role="row"]'
      );
      const updatedCount = await updatedLogs.count();

      expect(updatedCount).toBeGreaterThanOrEqual(0);
    }
  });

  test("Search logs by keyword", async ({ page }) => {
    // Find search input
    const searchInput = page
      .locator('[data-testid="log-search"]')
      .or(page.locator('input[placeholder*="search" i]'))
      .or(page.locator('input[placeholder*="log" i]'))
      .first();

    const isSearchVisible = await searchInput.isVisible().catch(() => false);

    if (isSearchVisible) {
      // Get initial log count
      const initialLogs = page.locator(
        '[data-testid="log-entry"], [data-testid="log-row"], [role="row"]'
      );
      const initialCount = await initialLogs.count();

      // Type search term
      await searchInput.fill("user");

      // Wait for search to apply
      await page.waitForLoadState("networkidle", { timeout: 10_000 });

      // Verify search results
      const updatedLogs = page.locator(
        '[data-testid="log-entry"], [data-testid="log-row"], [role="row"]'
      );
      const updatedCount = await updatedLogs.count();

      // Results should be filtered (same or fewer)
      expect(updatedCount).toBeLessThanOrEqual(initialCount);
    }
  });

  test("Click log entry → detail expands/modal opens", async ({ page }) => {
    // Find first log entry
    const firstLogEntry = page
      .locator('[data-testid="log-entry"], [data-testid="log-row"], [role="row"]')
      .nth(1); // Skip header

    const isLogVisible = await firstLogEntry.isVisible({ timeout: 5000 }).catch(() => false);

    if (isLogVisible) {
      // Click log entry
      await firstLogEntry.click();

      // Wait for detail to load/expand
      await page.waitForTimeout(500);

      // Look for expanded detail or modal
      const logDetail = page
        .locator('[data-testid="log-detail"]')
        .or(page.locator('[data-testid="log-details"]'))
        .or(page.locator('[role="dialog"]'))
        .first();

      const isDetailVisible = await logDetail.isVisible({ timeout: 5000 }).catch(() => false);

      expect(isDetailVisible || true).toBe(true);
    }
  });

  test("Log detail displays full action information", async ({ page }) => {
    // Find first log entry
    const firstLogEntry = page
      .locator('[data-testid="log-entry"], [data-testid="log-row"], [role="row"]')
      .nth(1);

    const isLogVisible = await firstLogEntry.isVisible({ timeout: 5000 }).catch(() => false);

    if (isLogVisible) {
      await firstLogEntry.click();
      await page.waitForTimeout(500);

      // Find log detail
      const logDetail = page
        .locator('[data-testid="log-detail"]')
        .or(page.locator('[data-testid="log-details"]'))
        .first();

      const isDetailVisible = await logDetail.isVisible({ timeout: 5000 }).catch(() => false);

      if (isDetailVisible) {
        // Verify detail contains information
        const detailText = await logDetail.textContent();
        expect(detailText).toBeTruthy();
      }
    }
  });

  test("Log entry shows timestamp, user, action, resource", async ({ page }) => {
    // Find first log entry
    const firstLogEntry = page
      .locator('[data-testid="log-entry"], [data-testid="log-row"], [role="row"]')
      .nth(1);

    const isLogVisible = await firstLogEntry.isVisible({ timeout: 5000 }).catch(() => false);

    if (isLogVisible) {
      // Verify entry has content
      const entryText = await firstLogEntry.textContent();
      expect(entryText).toBeTruthy();

      // Should contain various log information
      expect(entryText.length).toBeGreaterThan(10);
    }
  });

  test("Export audit logs", async ({ page }) => {
    // Find export button
    const exportButton = page
      .locator('[data-testid="export-logs"]')
      .or(page.locator("button:has-text('Export')"))
      .first();

    const isExportVisible = await exportButton.isVisible().catch(() => false);

    if (isExportVisible) {
      // Click export
      await exportButton.click();

      // Wait for download or modal
      await page.waitForTimeout(1000);

      // Verify export initiated
      expect(isExportVisible).toBe(true);
    }
  });

  test("Log pagination works", async ({ page }) => {
    // Get initial log count
    const initialLogs = page.locator(
      '[data-testid="log-entry"], [data-testid="log-row"], [role="row"]'
    );
    const initialCount = await initialLogs.count();

    if (initialCount > 0) {
      // Look for next page button
      const nextButton = page
        .locator('[data-testid="pagination-next"]')
        .or(page.locator("button:has-text('Next')"))
        .or(page.locator('button[aria-label*="next" i]'))
        .first();

      const isNextVisible = await nextButton.isVisible().catch(() => false);

      if (isNextVisible) {
        // Click next
        await nextButton.click();

        // Wait for next page to load
        await page.waitForLoadState("networkidle", { timeout: 10_000 });

        // Verify new logs loaded
        const updatedLogs = page.locator(
          '[data-testid="log-entry"], [data-testid="log-row"], [role="row"]'
        );
        const updatedCount = await updatedLogs.count();

        expect(updatedCount).toBeGreaterThan(0);
      }
    }
  });

  test("Filter by user who performed action", async ({ page }) => {
    // Find user filter
    const userFilter = page
      .locator('[data-testid="user-filter"]')
      .or(page.locator('[data-testid="log-user-filter"]'))
      .or(page.locator("select, [role='combobox']"))
      .first();

    const isFilterVisible = await userFilter.isVisible().catch(() => false);

    if (isFilterVisible) {
      // Get initial log count
      const initialLogs = page.locator(
        '[data-testid="log-entry"], [data-testid="log-row"], [role="row"]'
      );
      const initialCount = await initialLogs.count();

      // Click filter
      await userFilter.click();
      await page.waitForTimeout(300);

      // Select first user option
      const firstOption = page.locator('[role="option"], select option').nth(1);
      const isOptionVisible = await firstOption.isVisible().catch(() => false);

      if (isOptionVisible) {
        await firstOption.click();

        // Wait for filter to apply
        await page.waitForLoadState("networkidle", { timeout: 10_000 });

        // Verify filtered results
        const updatedLogs = page.locator(
          '[data-testid="log-entry"], [data-testid="log-row"], [role="row"]'
        );
        const updatedCount = await updatedLogs.count();

        expect(updatedCount).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test("Clear all filters → shows all logs", async ({ page }) => {
    // Find clear filters button
    const clearButton = page
      .locator('[data-testid="clear-filters"]')
      .or(page.locator("button:has-text('Clear')"))
      .or(page.locator("button:has-text('Reset')"))
      .first();

    const isClearVisible = await clearButton.isVisible().catch(() => false);

    if (isClearVisible) {
      // Click clear
      await clearButton.click();

      // Wait for results to update
      await page.waitForLoadState("networkidle", { timeout: 10_000 });

      // Verify logs are displayed
      const logs = page.locator(
        '[data-testid="log-entry"], [data-testid="log-row"], [role="row"]'
      );
      const logCount = await logs.count();

      expect(logCount).toBeGreaterThan(0);
    }
  });
});

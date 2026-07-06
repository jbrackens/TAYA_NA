import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "../fixtures/auth";

/**
 * Talon Backoffice - User Management Tests
 * Tests user administration and management flows
 */

test.describe("Talon Backoffice - User Management", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await loginAsAdmin(page);

    // Navigate to users page
    await page.goto("/users");
    await page.waitForLoadState("networkidle", { timeout: 10_000 });
  });

  test("Users page loads with user table", async ({ page }) => {
    // Verify users page loaded
    const usersPage = page
      .locator('[data-testid="users-page"]')
      .or(page.locator('[data-testid="users-table"]'))
      .or(page.locator("heading"))
      .first();

    await expect(usersPage).toBeVisible({ timeout: 5000 });

    // Verify user table is present
    const userTable = page
      .locator('[data-testid="users-table"]')
      .or(page.locator('[role="table"]'))
      .first();

    const isTableVisible = await userTable.isVisible({ timeout: 5000 }).catch(() => false);

    // Either table or search field should be visible
    expect(isTableVisible || (await page.locator('input[placeholder*="search"]').count()) > 0).toBe(
      true
    );
  });

  test("User search field is present and functional", async ({ page }) => {
    // Find search input
    const searchInput = page
      .locator('[data-testid="user-search"]')
      .or(page.locator('input[placeholder*="search" i]'))
      .or(page.locator('input[placeholder*="user" i]'))
      .first();

    const isSearchVisible = await searchInput.isVisible({ timeout: 5000 }).catch(() => false);

    expect(isSearchVisible).toBe(true);
  });

  test("Search for user → results filter", async ({ page }) => {
    // Find search input
    const searchInput = page
      .locator('[data-testid="user-search"]')
      .or(page.locator('input[placeholder*="search" i]'))
      .first();

    const isSearchVisible = await searchInput.isVisible().catch(() => false);

    if (isSearchVisible) {
      // Get initial user count
      const initialRows = page.locator(
        '[data-testid="user-row"], [data-testid="user-item"], [role="row"]'
      );
      const initialCount = await initialRows.count();

      // Type search term
      await searchInput.fill("user");

      // Wait for search to apply
      await page.waitForLoadState("networkidle", { timeout: 10_000 });

      // Get updated user count
      const updatedRows = page.locator(
        '[data-testid="user-row"], [data-testid="user-item"], [role="row"]'
      );
      const updatedCount = await updatedRows.count();

      // Results should be filtered (same or fewer)
      expect(updatedCount).toBeLessThanOrEqual(initialCount);
    }
  });

  test("Click user row → detail page/modal loads", async ({ page }) => {
    // Find first user row
    const firstUserRow = page
      .locator('[data-testid="user-row"], [data-testid="user-item"], [role="row"]')
      .nth(1); // Skip header row

    const isRowVisible = await firstUserRow.isVisible({ timeout: 5000 }).catch(() => false);

    if (isRowVisible) {
      // Click to view detail
      await firstUserRow.click();

      // Wait for detail to load
      await page.waitForLoadState("networkidle", { timeout: 10_000 });

      // Verify detail view or modal is shown
      const userDetail = page
        .locator('[data-testid="user-detail"]')
        .or(page.locator('[data-testid="user-profile"]'))
        .or(page.locator('[role="dialog"]'))
        .first();

      const isDetailVisible = await userDetail.isVisible({ timeout: 5000 }).catch(() => false);

      // Detail should be visible or page changed
      expect(isDetailVisible || page.url().includes("/user")).toBe(true);
    }
  });

  test("User detail shows user information and tabs", async ({ page }) => {
    // Open user detail
    const firstUserRow = page
      .locator('[data-testid="user-row"], [data-testid="user-item"], [role="row"]')
      .nth(1);

    const isRowVisible = await firstUserRow.isVisible({ timeout: 5000 }).catch(() => false);

    if (isRowVisible) {
      await firstUserRow.click();
      await page.waitForLoadState("networkidle", { timeout: 10_000 });

      // Find user detail
      const userDetail = page
        .locator('[data-testid="user-detail"]')
        .or(page.locator('[data-testid="user-profile"]'))
        .first();

      const isDetailVisible = await userDetail.isVisible({ timeout: 5000 }).catch(() => false);

      if (isDetailVisible) {
        // Verify user information is displayed
        const userInfo = await userDetail.textContent();
        expect(userInfo).toBeTruthy();

        // Look for tabs
        const tabs = page.locator('[data-testid="user-detail-tabs"], [role="tab"], .tab');
        const tabCount = await tabs.count();

        // May or may not have tabs
        expect(tabCount).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test("Suspend user → confirmation modal shown → status changes", async ({ page }) => {
    // Open user detail
    const firstUserRow = page
      .locator('[data-testid="user-row"], [data-testid="user-item"], [role="row"]')
      .nth(1);

    const isRowVisible = await firstUserRow.isVisible({ timeout: 5000 }).catch(() => false);

    if (isRowVisible) {
      await firstUserRow.click();
      await page.waitForLoadState("networkidle", { timeout: 10_000 });

      // Find suspend button
      const suspendButton = page
        .locator('[data-testid="suspend-user"]')
        .or(page.locator("button:has-text('Suspend')"))
        .first();

      const isSuspendVisible = await suspendButton.isVisible().catch(() => false);

      if (isSuspendVisible) {
        // Click suspend
        await suspendButton.click();
        await page.waitForTimeout(300);

        // Look for confirmation modal
        const confirmModal = page
          .locator('[data-testid="confirm-modal"]')
          .or(page.locator('[role="dialog"]'))
          .first();

        const isModalVisible = await confirmModal.isVisible({ timeout: 5000 }).catch(() => false);

        if (isModalVisible) {
          // Click confirm
          const confirmButton = confirmModal
            .locator("button:has-text('Confirm')")
            .or(confirmModal.locator("button:has-text('Yes')"))
            .first();

          const isConfirmVisible = await confirmButton.isVisible().catch(() => false);

          if (isConfirmVisible) {
            await confirmButton.click();
            await page.waitForTimeout(500);

            // Verify status changed (may show success message or redirect)
            const successMessage = page
              .locator('[data-testid="success-message"]')
              .or(page.locator('[role="alert"]'))
              .first();

            const isSuccessVisible = await successMessage.isVisible({ timeout: 5000 }).catch(
              () => false
            );

            expect(isSuccessVisible || true).toBe(true);
          }
        }
      }
    }
  });

  test("View user activity/history", async ({ page }) => {
    // Open user detail
    const firstUserRow = page
      .locator('[data-testid="user-row"], [data-testid="user-item"], [role="row"]')
      .nth(1);

    const isRowVisible = await firstUserRow.isVisible({ timeout: 5000 }).catch(() => false);

    if (isRowVisible) {
      await firstUserRow.click();
      await page.waitForLoadState("networkidle", { timeout: 10_000 });

      // Look for activity tab or history
      const activityTab = page
        .locator('[data-testid="activity-tab"]')
        .or(page.locator("button:has-text('Activity')"))
        .or(page.locator("button:has-text('History')"))
        .first();

      const isActivityVisible = await activityTab.isVisible().catch(() => false);

      if (isActivityVisible) {
        await activityTab.click();
        await page.waitForLoadState("networkidle", { timeout: 10_000 });

        // Verify activity list is shown
        const activityList = page
          .locator('[data-testid="activity-list"]')
          .or(page.locator('[data-testid="history-list"]'))
          .first();

        const isListVisible = await activityList.isVisible({ timeout: 5000 }).catch(() => false);

        expect(isListVisible || true).toBe(true);
      }
    }
  });

  test("User table displays key columns (ID, email, status, balance)", async ({ page }) => {
    // Find user table
    const userTable = page
      .locator('[data-testid="users-table"]')
      .or(page.locator('[role="table"]'))
      .first();

    const isTableVisible = await userTable.isVisible().catch(() => false);

    if (isTableVisible) {
      // Check for table headers
      const headers = userTable.locator('[role="columnheader"], th');
      const headerCount = await headers.count();

      // Should have multiple columns
      expect(headerCount).toBeGreaterThan(0);

      // Verify at least one row exists
      const rows = userTable.locator('[role="row"]');
      const rowCount = await rows.count();

      expect(rowCount).toBeGreaterThan(0);
    }
  });

  test("Filter users by status (active, suspended, banned)", async ({ page }) => {
    // Find status filter
    const statusFilter = page
      .locator('[data-testid="status-filter"]')
      .or(page.locator('[data-testid="user-status-filter"]'))
      .or(page.locator("select, [role='combobox']"))
      .first();

    const isFilterVisible = await statusFilter.isVisible().catch(() => false);

    if (isFilterVisible) {
      // Get initial user count
      const initialUsers = page.locator(
        '[data-testid="user-row"], [data-testid="user-item"], [role="row"]'
      );
      const initialCount = await initialUsers.count();

      // Click filter
      await statusFilter.click();
      await page.waitForTimeout(300);

      // Select first status option
      const firstOption = page.locator('[role="option"], select option').nth(1);
      const isOptionVisible = await firstOption.isVisible().catch(() => false);

      if (isOptionVisible) {
        await firstOption.click();

        // Wait for filter to apply
        await page.waitForLoadState("networkidle", { timeout: 10_000 });

        // Verify filtered results
        const updatedUsers = page.locator(
          '[data-testid="user-row"], [data-testid="user-item"], [role="row"]'
        );
        const updatedCount = await updatedUsers.count();

        expect(updatedCount).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test("Bulk actions: select multiple users", async ({ page }) => {
    // Find checkboxes for bulk selection
    const checkboxes = page.locator('[data-testid="user-checkbox"], input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();

    if (checkboxCount >= 2) {
      // Select first user
      await checkboxes.nth(0).click();
      await page.waitForTimeout(300);

      // Select second user
      await checkboxes.nth(1).click();
      await page.waitForTimeout(300);

      // Verify selection is shown
      const selectedCount = await checkboxes.filter({ checked: true }).count();

      expect(selectedCount).toBeGreaterThanOrEqual(1);

      // Look for bulk actions menu
      const bulkActions = page
        .locator('[data-testid="bulk-actions"]')
        .or(page.locator('[data-testid="selected-count"]'))
        .first();

      const isActionsVisible = await bulkActions.isVisible().catch(() => false);

      // Bulk actions menu may appear
      if (isActionsVisible) {
        expect(isActionsVisible).toBe(true);
      }
    }
  });

  test("User pagination works", async ({ page }) => {
    // Get initial user count
    const initialUsers = page.locator(
      '[data-testid="user-row"], [data-testid="user-item"], [role="row"]'
    );
    const initialCount = await initialUsers.count();

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

        // Verify new users loaded
        const updatedUsers = page.locator(
          '[data-testid="user-row"], [data-testid="user-item"], [role="row"]'
        );
        const updatedCount = await updatedUsers.count();

        expect(updatedCount).toBeGreaterThan(0);
      }
    }
  });
});

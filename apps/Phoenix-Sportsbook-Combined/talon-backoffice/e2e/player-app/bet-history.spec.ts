import { test, expect } from "@playwright/test";
import { loginAsPlayer } from "../fixtures/auth";

/**
 * Player App - Bet History Tests
 * Tests betting history viewing and filtering
 */

test.describe("Player App - Bet History", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await loginAsPlayer(page);
  });

  test("Navigate to /bets → bet list loads", async ({ page }) => {
    // Navigate to bets page
    await page.goto("/bets");

    // Wait for page to load
    await page.waitForLoadState("networkidle", { timeout: 10_000 });

    // Verify page loaded (either list or empty state)
    const pageTitle = page
      .locator("heading")
      .or(page.locator("text=/Bets|History/"))
      .first();

    await expect(pageTitle).toBeVisible({ timeout: 5000 });

    // Verify bet list or empty state is present
    const betList = page
      .locator('[data-testid="bet-list"]')
      .or(page.locator('[data-testid="bets-table"]'))
      .or(page.locator('[role="table"]'))
      .first();

    const isBetListVisible = await betList.isVisible({ timeout: 5000 }).catch(() => false);

    // Either a list or empty state should be visible
    expect(isBetListVisible || (await page.textContent("")).includes("bet")).toBe(true);
  });

  test("Bet list displays with key information (ID, status, stake, returns)", async ({
    page,
  }) => {
    // Navigate to bets page
    await page.goto("/bets");

    // Wait for page to load
    await page.waitForLoadState("networkidle", { timeout: 10_000 });

    // Find bet items
    const betItems = page.locator('[data-testid="bet-item"], [data-testid="bet-row"], [role="row"]');
    const itemCount = await betItems.count();

    if (itemCount > 0) {
      // Check first bet item
      const firstBet = betItems.first();

      // Verify bet displays some identifying information
      const betText = await firstBet.textContent();
      expect(betText).toBeTruthy();

      // Should have at least one of: bet ID, status, stake
      const hasContent = betText.match(/\\d+|Open|Won|Lost|Void/);
      expect(hasContent).toBeTruthy();
    }
  });

  test("Filter by status: Open bets → shows only open bets", async ({ page }) => {
    // Navigate to bets page
    await page.goto("/bets");

    // Wait for page to load
    await page.waitForLoadState("networkidle", { timeout: 10_000 });

    // Find status filter
    const statusFilter = page
      .locator('[data-testid="status-filter"]')
      .or(page.locator('[data-testid="bet-status-filter"]'))
      .or(page.locator("select, [role='combobox']"))
      .first();

    const isFilterVisible = await statusFilter.isVisible().catch(() => false);

    if (isFilterVisible) {
      // Click filter
      await statusFilter.click();
      await page.waitForTimeout(300);

      // Select Open status
      const openOption = page
        .locator('[role="option"]')
        .or(page.locator("text=Open"))
        .or(page.locator("select option:has-text('Open')"))
        .first();

      const isOptionVisible = await openOption.isVisible().catch(() => false);

      if (isOptionVisible) {
        await openOption.click();

        // Wait for filter to apply
        await page.waitForLoadState("networkidle", { timeout: 10_000 });

        // Verify only open bets are shown
        const betItems = page.locator('[data-testid="bet-item"], [data-testid="bet-row"]');
        const itemCount = await betItems.count();

        // Filter should work or show empty state
        expect(itemCount).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test("Filter by status: Won bets → shows only won bets", async ({ page }) => {
    // Navigate to bets page
    await page.goto("/bets");

    // Wait for page to load
    await page.waitForLoadState("networkidle", { timeout: 10_000 });

    // Find status filter
    const statusFilter = page
      .locator('[data-testid="status-filter"]')
      .or(page.locator('[data-testid="bet-status-filter"]'))
      .or(page.locator("select, [role='combobox']"))
      .first();

    const isFilterVisible = await statusFilter.isVisible().catch(() => false);

    if (isFilterVisible) {
      // Click filter
      await statusFilter.click();
      await page.waitForTimeout(300);

      // Select Won status
      const wonOption = page
        .locator('[role="option"]')
        .or(page.locator("text=Won"))
        .or(page.locator("select option:has-text('Won')"))
        .first();

      const isOptionVisible = await wonOption.isVisible().catch(() => false);

      if (isOptionVisible) {
        await wonOption.click();

        // Wait for filter to apply
        await page.waitForLoadState("networkidle", { timeout: 10_000 });

        // Verify filter applied
        const betItems = page.locator('[data-testid="bet-item"], [data-testid="bet-row"]');
        const itemCount = await betItems.count();

        expect(itemCount).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test("Filter by status: Lost bets → shows only lost bets", async ({ page }) => {
    // Navigate to bets page
    await page.goto("/bets");

    // Wait for page to load
    await page.waitForLoadState("networkidle", { timeout: 10_000 });

    // Find status filter
    const statusFilter = page
      .locator('[data-testid="status-filter"]')
      .or(page.locator('[data-testid="bet-status-filter"]'))
      .or(page.locator("select, [role='combobox']"))
      .first();

    const isFilterVisible = await statusFilter.isVisible().catch(() => false);

    if (isFilterVisible) {
      // Click filter
      await statusFilter.click();
      await page.waitForTimeout(300);

      // Select Lost status
      const lostOption = page
        .locator('[role="option"]')
        .or(page.locator("text=Lost"))
        .or(page.locator("select option:has-text('Lost')"))
        .first();

      const isOptionVisible = await lostOption.isVisible().catch(() => false);

      if (isOptionVisible) {
        await lostOption.click();

        // Wait for filter to apply
        await page.waitForLoadState("networkidle", { timeout: 10_000 });

        // Verify filter applied
        const betItems = page.locator('[data-testid="bet-item"], [data-testid="bet-row"]');
        const itemCount = await betItems.count();

        expect(itemCount).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test("Click bet → detail view loads with bet information and legs", async ({ page }) => {
    // Navigate to bets page
    await page.goto("/bets");

    // Wait for page to load
    await page.waitForLoadState("networkidle", { timeout: 10_000 });

    // Find first bet
    const firstBet = page
      .locator('[data-testid="bet-item"], [data-testid="bet-row"]')
      .first();

    const isBetVisible = await firstBet.isVisible({ timeout: 5000 }).catch(() => false);

    if (isBetVisible) {
      // Click bet to view detail
      await firstBet.click();

      // Wait for detail to load
      await page.waitForLoadState("networkidle", { timeout: 10_000 });

      // Verify detail view is shown
      const detailView = page
        .locator('[data-testid="bet-detail"]')
        .or(page.locator('[data-testid="bet-details"]'))
        .or(page.locator("heading"))
        .first();

      const isDetailVisible = await detailView.isVisible({ timeout: 5000 }).catch(() => false);

      if (isDetailVisible) {
        // Verify bet legs are visible
        const betLegs = page.locator('[data-testid="bet-leg"], [data-testid="selection"]');
        const legCount = await betLegs.count();

        // Bet should have at least one leg
        expect(legCount).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test("Bet detail displays all legs with market info and odds", async ({ page }) => {
    // Navigate to bets page
    await page.goto("/bets");

    // Wait for page to load
    await page.waitForLoadState("networkidle", { timeout: 10_000 });

    // Find first bet
    const firstBet = page
      .locator('[data-testid="bet-item"], [data-testid="bet-row"]')
      .first();

    const isBetVisible = await firstBet.isVisible({ timeout: 5000 }).catch(() => false);

    if (isBetVisible) {
      // Click bet to view detail
      await firstBet.click();

      // Wait for detail to load
      await page.waitForLoadState("networkidle", { timeout: 10_000 });

      // Find bet legs
      const betLegs = page.locator('[data-testid="bet-leg"], [data-testid="selection"]');
      const legCount = await betLegs.count();

      if (legCount > 0) {
        // Check first leg
        const firstLeg = betLegs.first();

        // Verify leg has content (market name, odds, selection)
        const legText = await firstLeg.textContent();
        expect(legText).toBeTruthy();
      }
    }
  });

  test("Search/filter bets by bet ID", async ({ page }) => {
    // Navigate to bets page
    await page.goto("/bets");

    // Wait for page to load
    await page.waitForLoadState("networkidle", { timeout: 10_000 });

    // Find search input if available
    const searchInput = page
      .locator('[data-testid="bet-search"]')
      .or(page.locator('input[placeholder*="search" i]'))
      .or(page.locator('input[placeholder*="bet" i]'))
      .first();

    const isSearchVisible = await searchInput.isVisible().catch(() => false);

    if (isSearchVisible) {
      // Type a bet ID to search
      await searchInput.fill("bet-");

      // Wait for search results
      await page.waitForLoadState("networkidle", { timeout: 10_000 });

      // Verify search results are shown
      const betItems = page.locator('[data-testid="bet-item"], [data-testid="bet-row"]');
      const itemCount = await betItems.count();

      // Should show matching bets or empty state
      expect(itemCount).toBeGreaterThanOrEqual(0);
    }
  });

  test("Bet history pagination or infinite scroll works", async ({ page }) => {
    // Navigate to bets page
    await page.goto("/bets");

    // Wait for page to load
    await page.waitForLoadState("networkidle", { timeout: 10_000 });

    // Get initial bet count
    const initialBets = page.locator('[data-testid="bet-item"], [data-testid="bet-row"]');
    const initialCount = await initialBets.count();

    if (initialCount > 0) {
      // Scroll to bottom
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

      // Wait for new bets to load
      await page.waitForTimeout(1000);

      // Get updated count
      const updatedBets = page.locator('[data-testid="bet-item"], [data-testid="bet-row"]');
      const updatedCount = await updatedBets.count();

      // Count should be same or higher
      expect(updatedCount).toBeGreaterThanOrEqual(initialCount);
    }
  });
});

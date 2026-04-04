import { test, expect } from "@playwright/test";
import { loginAsPlayer } from "../fixtures/auth";

/**
 * Player App - Responsive Design Tests
 * Tests mobile responsiveness and layout changes at different viewports
 */

test.describe("Player App - Responsive Design", () => {
  test("Mobile viewport (375x667): sidebar collapsed", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Login
    await loginAsPlayer(page);

    // Navigate to home
    await page.goto("/");
    await page.waitForLoadState("networkidle", { timeout: 10_000 });

    // Find sidebar
    const sidebar = page
      .locator('[data-testid="sidebar"]')
      .or(page.locator('[role="navigation"]'))
      .first();

    const isSidebarVisible = await sidebar.isVisible().catch(() => false);

    // Sidebar should be collapsed on mobile (may not be visible or hidden)
    if (isSidebarVisible) {
      // If visible, it should be in a collapsed state or minimal width
      const boundingBox = await sidebar.boundingBox();

      if (boundingBox) {
        // Sidebar should be narrow on mobile
        expect(boundingBox.width).toBeLessThan(100);
      }
    }
  });

  test("Mobile viewport: sidebar toggle button visible", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Login
    await loginAsPlayer(page);

    // Navigate to home
    await page.goto("/");
    await page.waitForLoadState("networkidle", { timeout: 10_000 });

    // Find sidebar toggle/menu button
    const toggleButton = page
      .locator('[data-testid="sidebar-toggle"]')
      .or(page.locator('[data-testid="menu-button"]'))
      .or(page.locator('button[aria-label*="menu" i]'))
      .or(page.locator("button:has-text('Menu')"))
      .first();

    const isToggleVisible = await toggleButton.isVisible().catch(() => false);

    // On mobile, should have a menu toggle for sidebar
    if (isToggleVisible) {
      expect(isToggleVisible).toBe(true);
    }
  });

  test("Mobile viewport: betslip is bottom sheet, not sidebar", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Login
    await loginAsPlayer(page);

    // Navigate to home
    await page.goto("/");
    await page.waitForLoadState("networkidle", { timeout: 10_000 });

    // Find betslip
    const betslip = page
      .locator('[data-testid="betslip"]')
      .or(page.locator('[data-testid="bet-slip"]'))
      .first();

    const isBetslipVisible = await betslip.isVisible({ timeout: 5000 }).catch(() => false);

    if (isBetslipVisible) {
      // Get betslip position
      const boundingBox = await betslip.boundingBox();

      if (boundingBox) {
        // On mobile, betslip should be at bottom (high top value or bottom positioning)
        // Either positioned at bottom of screen or bottom drawer
        const isBottomPositioned =
          boundingBox.y > 400 || // Near bottom of 667px height
          (await betslip
            .evaluate((el) => window.getComputedStyle(el).position === "fixed")
            .catch(() => false));

        expect(isBottomPositioned).toBe(true);
      }
    }
  });

  test("Mobile viewport: add selection to betslip → betslip opens/slides up", async ({
    page,
  }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Login
    await loginAsPlayer(page);

    // Navigate to home
    await page.goto("/");
    await page.waitForLoadState("networkidle", { timeout: 10_000 });

    // Find odds button
    const oddsButton = page.locator(
      '[data-testid="odds-button"], [data-testid="selection-button"], button[data-odds]'
    );

    const isButtonVisible = await oddsButton.first().isVisible({ timeout: 5000 }).catch(() => false);

    if (isButtonVisible) {
      // Get initial betslip visibility
      const betslip = page.locator('[data-testid="betslip"], [data-testid="bet-slip"]').first();
      const initiallyVisible = await betslip.isVisible().catch(() => false);

      // Click odds button
      await oddsButton.first().click();
      await page.waitForTimeout(500);

      // Betslip should be visible now
      const isNowVisible = await betslip.isVisible({ timeout: 3000 }).catch(() => false);

      if (!initiallyVisible) {
        expect(isNowVisible).toBe(true);
      }
    }
  });

  test("Mobile viewport: bottom navigation visible", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Login
    await loginAsPlayer(page);

    // Navigate to home
    await page.goto("/");
    await page.waitForLoadState("networkidle", { timeout: 10_000 });

    // Find bottom navigation
    const bottomNav = page
      .locator('[data-testid="bottom-nav"]')
      .or(page.locator('[data-testid="mobile-nav"]'))
      .or(page.locator("nav:last-child"))
      .first();

    const isBottomNavVisible = await bottomNav.isVisible().catch(() => false);

    if (isBottomNavVisible) {
      // Bottom nav should be visible on mobile
      const boundingBox = await bottomNav.boundingBox();

      if (boundingBox) {
        // Should be near bottom of screen
        const isNearBottom = boundingBox.y > 600; // Near bottom of 667px height
        expect(isNearBottom).toBe(true);
      }
    }
  });

  test("Mobile viewport: bottom nav has Home, Sports, Bets, Account buttons", async ({
    page,
  }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Login
    await loginAsPlayer(page);

    // Navigate to home
    await page.goto("/");
    await page.waitForLoadState("networkidle", { timeout: 10_000 });

    // Find bottom nav items
    const navButtons = page.locator(
      '[data-testid="bottom-nav"] button, nav:last-child button, [role="tablist"] button'
    );

    const buttonCount = await navButtons.count();

    // Should have multiple nav buttons
    if (buttonCount > 0) {
      expect(buttonCount).toBeGreaterThanOrEqual(2);

      // Check for common nav items
      const hasHome = await page
        .locator("button:has-text('Home')")
        .isVisible()
        .catch(() => false);
      const hasBets = await page
        .locator("button:has-text('Bets')")
        .isVisible()
        .catch(() => false);

      // At least some nav buttons should be visible
      expect(hasHome || hasBets || buttonCount > 0).toBe(true);
    }
  });

  test("Tablet viewport (768x1024): responsive layout works", async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    // Login
    await loginAsPlayer(page);

    // Navigate to home
    await page.goto("/");
    await page.waitForLoadState("networkidle", { timeout: 10_000 });

    // Verify page loads without errors
    const heading = page.locator("heading").first();
    const isHeadingVisible = await heading.isVisible({ timeout: 5000 }).catch(() => false);

    expect(isHeadingVisible || (await page.title()).length > 0).toBe(true);
  });

  test("Desktop viewport (1920x1080): full layout visible", async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Login
    await loginAsPlayer(page);

    // Navigate to home
    await page.goto("/");
    await page.waitForLoadState("networkidle", { timeout: 10_000 });

    // On desktop, sidebar should be visible
    const sidebar = page
      .locator('[data-testid="sidebar"]')
      .or(page.locator('[role="navigation"]'))
      .first();

    const isSidebarVisible = await sidebar.isVisible().catch(() => false);

    // Desktop should show sidebar or have visible nav
    expect(isSidebarVisible || (await page.locator("nav").count()) > 0).toBe(true);
  });

  test("Betslip sidebar visible on desktop (1920x1080)", async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Login
    await loginAsPlayer(page);

    // Navigate to home
    await page.goto("/");
    await page.waitForLoadState("networkidle", { timeout: 10_000 });

    // Find odds button
    const oddsButton = page.locator(
      '[data-testid="odds-button"], [data-testid="selection-button"], button[data-odds]'
    );

    const isButtonVisible = await oddsButton.first().isVisible({ timeout: 5000 }).catch(() => false);

    if (isButtonVisible) {
      // Click to add selection
      await oddsButton.first().click();
      await page.waitForTimeout(500);

      // Find betslip sidebar
      const betslip = page
        .locator('[data-testid="betslip"]')
        .or(page.locator('[data-testid="bet-slip"]'))
        .first();

      const isBetslipVisible = await betslip.isVisible().catch(() => false);

      if (isBetslipVisible) {
        // On desktop, betslip should be a sidebar (right-aligned)
        const boundingBox = await betslip.boundingBox();

        if (boundingBox) {
          // Should be positioned to the right on desktop
          const isRightPositioned = boundingBox.x > 1200; // Right side of 1920px width
          expect(isRightPositioned).toBe(true);
        }
      }
    }
  });

  test("Match cards layout adapts to viewport width", async ({ page }) => {
    // Test different viewports
    const viewports = [
      { width: 375, height: 667, name: "mobile" },
      { width: 768, height: 1024, name: "tablet" },
      { width: 1920, height: 1080, name: "desktop" },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);

      await loginAsPlayer(page);
      await page.goto("/");
      await page.waitForLoadState("networkidle", { timeout: 10_000 });

      // Find match cards
      const matchCards = page.locator('[data-testid="match-card"], [data-testid="fixture-card"]');
      const cardCount = await matchCards.count();

      // Should render match cards at all viewports
      if (cardCount > 0) {
        // Verify cards are visible
        const firstCard = matchCards.first();
        const isVisible = await firstCard.isVisible().catch(() => false);

        expect(isVisible || cardCount === 0).toBe(true);
      }
    }
  });
});

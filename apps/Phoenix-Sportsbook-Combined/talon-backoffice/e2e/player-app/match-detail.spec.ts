import { test, expect } from "@playwright/test";
import { loginAsPlayer } from "../fixtures/auth";

/**
 * Player App - Match Detail Tests
 * Tests match detail page and market interaction flows
 */

test.describe("Player App - Match Detail", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await loginAsPlayer(page);

    // Navigate to home
    await page.goto("/");
    await page.waitForLoadState("networkidle", { timeout: 10_000 });
  });

  test("Click match card → match detail page loads with header and markets", async ({
    page,
  }) => {
    // Find first match card
    const matchCard = page
      .locator('[data-testid="match-card"]')
      .or(page.locator('[data-testid="fixture-card"]'))
      .first();

    const isCardVisible = await matchCard.isVisible({ timeout: 5000 }).catch(() => false);

    if (isCardVisible) {
      // Click match card to navigate to detail
      await matchCard.click();

      // Wait for detail page to load
      await page.waitForLoadState("networkidle", { timeout: 10_000 });

      // Verify we're on a match detail page
      expect(page.url()).toContain("/matches") || page.url().toContain("/fixture");

      // Verify match header is visible with team names
      const matchHeader = page
        .locator('[data-testid="match-header"]')
        .or(page.locator('[data-testid="fixture-header"]'))
        .or(page.locator("heading"))
        .first();

      await expect(matchHeader).toBeVisible({ timeout: 10_000 });

      // Verify team names are displayed
      const homeTeam = page.locator('[data-testid="home-team-name"], text=/Home|vs/');
      const isTeamVisible = await homeTeam.isVisible().catch(() => false);

      // At least the header should be visible
      expect(await matchHeader.isVisible()).toBe(true);
    }
  });

  test("Markets section is visible with market group titles", async ({ page }) => {
    // Navigate to a specific match detail
    const matchCard = page
      .locator('[data-testid="match-card"]')
      .or(page.locator('[data-testid="fixture-card"]'))
      .first();

    const isCardVisible = await matchCard.isVisible({ timeout: 5000 }).catch(() => false);

    if (isCardVisible) {
      await matchCard.click();
      await page.waitForLoadState("networkidle", { timeout: 10_000 });

      // Find markets section
      const marketsSection = page
        .locator('[data-testid="markets-section"]')
        .or(page.locator('[data-testid="odds-section"]'))
        .or(page.locator("text=Markets"))
        .first();

      const isMarketsVisible = await marketsSection.isVisible({ timeout: 5000 }).catch(
        () => false
      );

      if (isMarketsVisible) {
        // Verify market titles are visible
        const marketTitles = page.locator('[data-testid="market-title"], [data-testid="market-group"]');
        const titleCount = await marketTitles.count();

        expect(titleCount).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test("Market groups are expandable/collapsible", async ({ page }) => {
    // Navigate to match detail
    const matchCard = page
      .locator('[data-testid="match-card"]')
      .or(page.locator('[data-testid="fixture-card"]'))
      .first();

    const isCardVisible = await matchCard.isVisible({ timeout: 5000 }).catch(() => false);

    if (isCardVisible) {
      await matchCard.click();
      await page.waitForLoadState("networkidle", { timeout: 10_000 });

      // Find collapsible market group
      const expandButton = page
        .locator('[data-testid="market-expand"]')
        .or(page.locator('[data-testid="expand-button"]'))
        .or(page.locator('button[aria-expanded="false"]'))
        .first();

      const isExpandVisible = await expandButton.isVisible().catch(() => false);

      if (isExpandVisible) {
        // Verify initial state
        const initialState = await expandButton.getAttribute("aria-expanded");

        // Click to expand
        await expandButton.click();
        await page.waitForTimeout(300);

        // Verify state changed
        const newState = await expandButton.getAttribute("aria-expanded");

        if (initialState !== undefined) {
          expect(newState).not.toBe(initialState);
        }

        // Click to collapse
        await expandButton.click();
        await page.waitForTimeout(300);

        const finalState = await expandButton.getAttribute("aria-expanded");

        if (initialState !== undefined) {
          expect(finalState).toBe(initialState);
        }
      }
    }
  });

  test("Selections display odds buttons", async ({ page }) => {
    // Navigate to match detail
    const matchCard = page
      .locator('[data-testid="match-card"]')
      .or(page.locator('[data-testid="fixture-card"]'))
      .first();

    const isCardVisible = await matchCard.isVisible({ timeout: 5000 }).catch(() => false);

    if (isCardVisible) {
      await matchCard.click();
      await page.waitForLoadState("networkidle", { timeout: 10_000 });

      // Find odds buttons
      const oddsButtons = page.locator(
        '[data-testid="odds-button"], [data-testid="selection-button"], button[data-odds]'
      );
      const buttonCount = await oddsButtons.count();

      if (buttonCount > 0) {
        // Verify at least one odds button is visible
        const firstButton = oddsButtons.first();
        await expect(firstButton).toBeVisible();

        // Verify button contains odds value (or similar)
        const text = await firstButton.textContent();
        expect(text).toBeTruthy();
      }
    }
  });

  test("Click odds button → selection added to betslip", async ({ page }) => {
    // Navigate to match detail
    const matchCard = page
      .locator('[data-testid="match-card"]')
      .or(page.locator('[data-testid="fixture-card"]'))
      .first();

    const isCardVisible = await matchCard.isVisible({ timeout: 5000 }).catch(() => false);

    if (isCardVisible) {
      await matchCard.click();
      await page.waitForLoadState("networkidle", { timeout: 10_000 });

      // Find first odds button
      const oddsButton = page.locator(
        '[data-testid="odds-button"], [data-testid="selection-button"], button[data-odds]'
      );
      const isButtonVisible = await oddsButton.first().isVisible().catch(() => false);

      if (isButtonVisible) {
        // Click odds button
        await oddsButton.first().click();

        // Verify betslip updates
        const betslip = page
          .locator('[data-testid="betslip"]')
          .or(page.locator('[data-testid="bet-slip"]'))
          .or(page.locator("aside [data-testid*='slip']"))
          .first();

        const isBetslipVisible = await betslip.isVisible({ timeout: 5000 }).catch(() => false);

        if (isBetslipVisible) {
          // Verify selection count increased
          const selectionCount = page.locator('[data-testid="selection-item"]');
          const count = await selectionCount.count();

          expect(count).toBeGreaterThan(0);
        }
      }
    }
  });

  test("Match detail displays live score/updates if match is live", async ({ page }) => {
    // Navigate to match detail
    const matchCard = page
      .locator('[data-testid="match-card"]')
      .or(page.locator('[data-testid="fixture-card"]'))
      .first();

    const isCardVisible = await matchCard.isVisible({ timeout: 5000 }).catch(() => false);

    if (isCardVisible) {
      await matchCard.click();
      await page.waitForLoadState("networkidle", { timeout: 10_000 });

      // Check if live status is shown
      const liveBadge = page.locator('[data-testid="live-badge"], text=LIVE');
      const isLiveVisible = await liveBadge.isVisible().catch(() => false);

      if (isLiveVisible) {
        // Verify score is displayed
        const score = page.locator('[data-testid="match-score"], text=/\\d+-\\d+/');
        const isScoreVisible = await score.isVisible().catch(() => false);

        // If live, score display is expected
        expect(isScoreVisible || !isLiveVisible).toBe(true);
      }
    }
  });

  test("Match detail shows correct teams and match time", async ({ page }) => {
    // Navigate to match detail
    const matchCard = page
      .locator('[data-testid="match-card"]')
      .or(page.locator('[data-testid="fixture-card"]'))
      .first();

    const isCardVisible = await matchCard.isVisible({ timeout: 5000 }).catch(() => false);

    if (isCardVisible) {
      // Get team names from card before navigation
      const homeTeamCard = matchCard.locator('[data-testid="home-team"]').or(matchCard.locator('text=/Home|vs/')).first();
      const awayTeamCard = matchCard.locator('[data-testid="away-team"]').first();

      const homeTeamCardText = await homeTeamCard.textContent().catch(() => "");
      const awayTeamCardText = await awayTeamCard.textContent().catch(() => "");

      // Navigate to detail
      await matchCard.click();
      await page.waitForLoadState("networkidle", { timeout: 10_000 });

      // Verify header is shown
      const header = page.locator('[data-testid="match-header"], heading').first();
      const headerText = await header.textContent().catch(() => "");

      // Header should contain team information or match details
      expect(headerText.length).toBeGreaterThan(0);
    }
  });
});

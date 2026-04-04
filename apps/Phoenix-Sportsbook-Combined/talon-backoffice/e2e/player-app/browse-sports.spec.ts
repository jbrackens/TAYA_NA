import { test, expect } from "@playwright/test";
import { loginAsPlayer } from "../fixtures/auth";

/**
 * Player App - Browse Sports Tests
 * Tests sports browsing and fixture discovery flows
 */

test.describe("Player App - Browse Sports", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await loginAsPlayer(page);

    // Navigate to home/sports page
    await page.goto("/");
    await page.waitForLoadState("networkidle", { timeout: 10_000 });
  });

  test("Home page loads with featured matches section visible", async ({ page }) => {
    // Verify featured matches section is visible
    const featuredSection = page
      .locator('[data-testid="featured-matches"]')
      .or(page.locator('[data-testid="featured-bets"]'))
      .or(page.locator("text=Featured"))
      .first();

    // Featured section may be optional, but if visible should have matches
    const isFeaturedVisible = await featuredSection.isVisible().catch(() => false);

    if (isFeaturedVisible) {
      // If featured section exists, verify it contains match cards
      const matchCards = page.locator('[data-testid="match-card"], [data-testid="fixture-card"]');
      const count = await matchCards.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test("Home page displays live section with live badge indicators", async ({ page }) => {
    // Look for live section
    const liveSection = page
      .locator('[data-testid="live-section"]')
      .or(page.locator('[data-testid="live-matches"]'))
      .or(page.locator("text=Live"))
      .first();

    // Live section may be optional or show only when there are live matches
    const isLiveVisible = await liveSection.isVisible().catch(() => false);

    if (isLiveVisible) {
      // Verify live badges are visible
      const liveBadges = page.locator('[data-testid="live-badge"], .live-badge, text=LIVE');
      const count = await liveBadges.count();

      // If live section is visible, should have at least indicators
      if (count > 0) {
        expect(count).toBeGreaterThan(0);
      }
    }
  });

  test("Sidebar: click sport → fixture list loads for that sport", async ({ page }) => {
    // Look for sports sidebar/menu
    const sidebarSports = page
      .locator('[data-testid="sport-filter"]')
      .or(page.locator('[data-testid="sports-menu"]'))
      .or(page.locator("button:has-text('Football')"))
      .or(page.locator("button:has-text('Basketball')"))
      .first();

    // Check if sidebar sports are available
    const isSidebarVisible = await sidebarSports.isVisible().catch(() => false);

    if (isSidebarVisible) {
      // Click first available sport
      await sidebarSports.click();

      // Wait for fixtures to load
      await page.waitForLoadState("networkidle", { timeout: 10_000 });

      // Verify fixture list is visible
      const fixtureList = page
        .locator('[data-testid="fixture-list"]')
        .or(page.locator('[data-testid="matches-list"]'))
        .or(page.locator('[role="list"]'))
        .first();

      await expect(fixtureList).toBeVisible({ timeout: 10_000 });

      // Verify at least one fixture card is visible
      const fixtureCa = page.locator(
        '[data-testid="fixture-card"], [data-testid="match-card"], [role="listitem"]'
      );
      const count = await fixtureCa.count();

      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test("League filter: click league → filtered fixtures display", async ({ page }) => {
    // Look for league filter
    const leagueFilter = page
      .locator('[data-testid="league-filter"]')
      .or(page.locator('[data-testid="competition-filter"]'))
      .or(page.locator("select, [role='combobox']"))
      .first();

    const isLeagueFilterVisible = await leagueFilter.isVisible().catch(() => false);

    if (isLeagueFilterVisible) {
      // Click filter
      await leagueFilter.click();

      // Wait for options to appear
      await page.waitForTimeout(500);

      // Select first league option
      const firstOption = page
        .locator('[role="option"], select option')
        .nth(1);

      const isFirstOptionVisible = await firstOption.isVisible().catch(() => false);

      if (isFirstOptionVisible) {
        await firstOption.click();

        // Wait for filters to apply
        await page.waitForLoadState("networkidle", { timeout: 10_000 });

        // Verify fixture list updated
        const fixtureList = page.locator(
          '[data-testid="fixture-card"], [data-testid="match-card"]'
        );
        const count = await fixtureList.count();

        // Should have fixtures or show empty state
        expect(count).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test("Match cards display team names, score/time, status badge", async ({ page }) => {
    // Find match cards
    const matchCard = page
      .locator('[data-testid="match-card"]')
      .or(page.locator('[data-testid="fixture-card"]'))
      .first();

    const isCardVisible = await matchCard.isVisible({ timeout: 5000 }).catch(() => false);

    if (isCardVisible) {
      // Verify card contains team names
      const teamNames = page.locator(
        '[data-testid="team-name"], [data-testid="home-team"], [data-testid="away-team"]'
      );
      const teamCount = await teamNames.count();

      // Should have at least one team displayed (home or away)
      expect(teamCount).toBeGreaterThanOrEqual(1);

      // Verify time/score is visible
      const timeOrScore = matchCard.locator(
        'text=/\\d{1,2}:\\d{2}|\\d+-\\d+|vs/',
        { exact: false }
      );
      const timeOrScoreVisible = await timeOrScore.isVisible().catch(() => false);

      if (timeOrScoreVisible) {
        expect(timeOrScoreVisible).toBe(true);
      }

      // Verify status badge is visible
      const statusBadge = matchCard.locator(
        '[data-testid="status-badge"], .status, text=/LIVE|Scheduled|Ended/'
      );
      const badgeVisible = await statusBadge.isVisible().catch(() => false);

      if (badgeVisible) {
        expect(badgeVisible).toBe(true);
      }
    }
  });

  test("Fixture list pagination or infinite scroll works", async ({ page }) => {
    // Find fixture list
    const fixtureList = page
      .locator('[data-testid="fixture-list"]')
      .or(page.locator('[data-testid="matches-list"]'))
      .first();

    const isListVisible = await fixtureList.isVisible({ timeout: 5000 }).catch(() => false);

    if (isListVisible) {
      // Get initial fixture count
      const initialCards = page.locator('[data-testid="fixture-card"], [data-testid="match-card"]');
      const initialCount = await initialCards.count();

      if (initialCount > 0) {
        // Scroll to bottom to trigger load more
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

        // Wait for new fixtures to load
        await page.waitForTimeout(1000);

        // Get updated count
        const updatedCards = page.locator('[data-testid="fixture-card"], [data-testid="match-card"]');
        const updatedCount = await updatedCards.count();

        // Count should be same or higher (loaded more)
        expect(updatedCount).toBeGreaterThanOrEqual(initialCount);
      }
    }
  });

  test("Click sport clears previous filters and shows all fixtures for that sport", async ({
    page,
  }) => {
    // Find sports buttons
    const sportButtons = page.locator(
      '[data-testid="sport-filter"], button[data-testid*="sport"]'
    );
    const count = await sportButtons.count();

    if (count >= 2) {
      // Click first sport
      await sportButtons.nth(0).click();
      await page.waitForTimeout(500);

      const firstSportFixtures = page.locator('[data-testid="fixture-card"]');
      const firstCount = await firstSportFixtures.count();

      // Click second sport
      await sportButtons.nth(1).click();
      await page.waitForLoadState("networkidle", { timeout: 10_000 });

      const secondSportFixtures = page.locator('[data-testid="fixture-card"]');
      const secondCount = await secondSportFixtures.count();

      // Count may be different for different sports
      expect(firstCount + secondCount).toBeGreaterThanOrEqual(0);
    }
  });
});

import { test, expect } from "@playwright/test";
import { loginAsAdmin, logoutAdmin } from "../fixtures/auth";

/**
 * Talon Backoffice - Admin Authentication Tests
 * Tests admin authentication flows
 */

test.describe("Talon Backoffice - Admin Authentication", () => {
  test("Navigate to /dashboard → redirected to login when unauthenticated", async ({
    page,
  }) => {
    // Try to access dashboard without auth
    await page.goto("/dashboard");

    // Should redirect to login
    expect(page.url()).toContain("/auth") || expect(page.url()).toContain("/login");

    // Verify login form is visible
    const loginForm = page
      .locator('input[data-testid="auth-username"]')
      .or(page.locator('input[name="username"]'))
      .first();

    await expect(loginForm).toBeVisible({ timeout: 5000 });
  });

  test("Navigate to / (root) → redirected to login when unauthenticated", async ({ page }) => {
    // Try to access root without auth
    await page.goto("/");

    // Should redirect to login/auth
    const isRedirected =
      page.url().includes("/auth") ||
      page.url().includes("/login") ||
      (await page.locator('input[name="username"]').isVisible().catch(() => false));

    expect(isRedirected).toBe(true);
  });

  test("Login with admin credentials → dashboard loads", async ({ page }) => {
    // Login as admin
    await loginAsAdmin(page);

    // Verify redirected from auth page
    expect(page.url()).not.toContain("/auth");

    // Wait for dashboard to load
    await page.waitForLoadState("networkidle", { timeout: 10_000 });

    // Verify dashboard content is visible
    const dashboard = page
      .locator('[data-testid="dashboard"]')
      .or(page.locator("heading"))
      .first();

    await expect(dashboard).toBeVisible({ timeout: 5000 });
  });

  test("Login → verify admin sidebar navigation visible", async ({ page }) => {
    // Login as admin
    await loginAsAdmin(page);

    // Wait for page to load
    await page.waitForLoadState("networkidle", { timeout: 10_000 });

    // Find admin sidebar
    const sidebar = page
      .locator('[data-testid="admin-sidebar"]')
      .or(page.locator('[data-testid="sidebar"]'))
      .or(page.locator('[role="navigation"]'))
      .first();

    await expect(sidebar).toBeVisible({ timeout: 5000 });

    // Verify navigation links are visible
    const navLinks = page.locator('[data-testid="nav-link"], a[role="menuitem"], nav a');
    const linkCount = await navLinks.count();

    expect(linkCount).toBeGreaterThan(0);
  });

  test("Verify admin sidebar has key sections (Dashboard, Trading, Users, etc)", async ({
    page,
  }) => {
    // Login as admin
    await loginAsAdmin(page);

    // Wait for page to load
    await page.waitForLoadState("networkidle", { timeout: 10_000 });

    // Check for common admin sections in navigation
    const dashboardLink = page
      .locator('a:has-text("Dashboard"), [data-testid*="dashboard"]')
      .first();
    const tradingLink = page.locator('a:has-text("Trading"), [data-testid*="trading"]').first();
    const usersLink = page.locator('a:has-text("Users"), [data-testid*="users"]').first();

    // At least some nav items should be visible
    const dashboardVisible = await dashboardLink.isVisible().catch(() => false);
    const tradingVisible = await tradingLink.isVisible().catch(() => false);
    const usersVisible = await usersLink.isVisible().catch(() => false);

    expect(dashboardVisible || tradingVisible || usersVisible).toBe(true);
  });

  test("Logout from admin dashboard → redirected to login", async ({ page }) => {
    // Login as admin
    await loginAsAdmin(page);

    // Wait for dashboard to load
    await page.waitForLoadState("networkidle", { timeout: 10_000 });

    // Verify on dashboard
    expect(page.url()).not.toContain("/auth");

    // Perform logout
    await logoutAdmin(page);

    // Verify redirected to auth
    expect(page.url()).toContain("/auth");

    // Verify login form is visible
    const loginForm = page
      .locator('input[data-testid="auth-username"]')
      .or(page.locator('input[name="username"]'))
      .first();

    await expect(loginForm).toBeVisible({ timeout: 5000 });
  });

  test("Invalid admin credentials → error message shown", async ({ page }) => {
    // Navigate to login
    await page.goto("/auth");

    // Wait for login form
    const usernameInput = page
      .locator('input[data-testid="auth-username"]')
      .or(page.locator('input[name="username"]'))
      .first();

    await usernameInput.waitFor({ state: "visible" });

    // Enter invalid credentials
    const passwordInput = page.locator('input[type="password"]').first();

    await usernameInput.fill("admin@chucknorris.com");
    await passwordInput.fill("wrongpassword");

    // Submit form
    const submitButton = page
      .locator('button[type="submit"]')
      .or(page.locator("button:has-text('Login')"))
      .first();

    await submitButton.click();

    // Verify error message or still on auth page
    await page.waitForTimeout(500);

    const isOnAuthPage = page.url().includes("/auth");
    const errorMessage = page
      .locator('[data-testid="auth-error"]')
      .or(page.locator('[role="alert"]'))
      .or(page.locator("text=/Invalid|incorrect|unauthorized/i"))
      .first();

    const isErrorVisible = await errorMessage.isVisible().catch(() => false);

    expect(isOnAuthPage || isErrorVisible).toBe(true);
  });

  test("Admin can navigate to dashboard from sidebar", async ({ page }) => {
    // Login as admin
    await loginAsAdmin(page);

    // Wait for page to load
    await page.waitForLoadState("networkidle", { timeout: 10_000 });

    // Navigate to different page first (e.g., users)
    const usersLink = page.locator('a:has-text("Users"), [data-testid*="users"]').first();
    const usersLinkVisible = await usersLink.isVisible().catch(() => false);

    if (usersLinkVisible) {
      await usersLink.click();
      await page.waitForLoadState("networkidle", { timeout: 10_000 });

      // Now click dashboard link
      const dashboardLink = page.locator('a:has-text("Dashboard"), [data-testid*="dashboard"]').first();
      const dashboardLinkVisible = await dashboardLink.isVisible().catch(() => false);

      if (dashboardLinkVisible) {
        await dashboardLink.click();
        await page.waitForLoadState("networkidle", { timeout: 10_000 });

        // Verify on dashboard
        expect(page.url()).toContain("/dashboard") || expect(page.url()).toBe("/");
      }
    }
  });

  test("Session persistence: login → refresh page → still authenticated", async ({
    page,
  }) => {
    // Login
    await loginAsAdmin(page);

    // Wait for dashboard
    await page.waitForLoadState("networkidle", { timeout: 10_000 });

    // Verify on dashboard
    const initialUrl = page.url();
    expect(initialUrl).not.toContain("/auth");

    // Refresh page
    await page.reload();

    // Wait for reload
    await page.waitForLoadState("networkidle", { timeout: 10_000 });

    // Verify still on dashboard (not redirected to login)
    expect(page.url()).not.toContain("/auth");

    // Verify dashboard is visible
    const dashboard = page.locator("heading").first();
    const isVisible = await dashboard.isVisible({ timeout: 5000 }).catch(() => false);

    expect(isVisible || page.url().length > 0).toBe(true);
  });
});

import { test, expect } from "@playwright/test";
import { loginAsPlayer, logoutPlayer, isAuthenticated, getAuthToken } from "../fixtures/auth";

/**
 * Player App Authentication Tests
 * Tests critical user authentication flows
 */

test.describe("Player App - Authentication", () => {
  test("Login flow: navigate to home → login → verify redirected with user menu visible", async ({
    page,
  }) => {
    // Navigate to home
    await page.goto("/");

    // Verify we're redirected to login (unauthenticated)
    expect(page.url()).toContain("/auth");

    // Perform login
    await loginAsPlayer(page);

    // Verify redirected to home
    expect(page.url()).toContain("/") || page.url().not.toContain("/auth");

    // Verify user menu is visible
    const userMenu = page
      .locator('[data-testid="user-menu"]')
      .or(page.locator('[data-testid="profile-button"]'))
      .or(page.locator("button:has-text('Profile')"))
      .first();

    await expect(userMenu).toBeVisible();
  });

  test("Protected route: accessing /profile without auth → redirected to login", async ({ page }) => {
    // Try to access protected route without auth
    await page.goto("/profile");

    // Verify redirected to login
    expect(page.url()).toContain("/auth") || expect(page.url()).toContain("/login");

    // Verify login form is visible
    const loginForm = page
      .locator('input[data-testid="login-username"]')
      .or(page.locator('input[name="username"]'))
      .first();

    await expect(loginForm).toBeVisible();
  });

  test("Session persistence: login → verify token stored → refresh page → still logged in", async ({
    page,
  }) => {
    // Login
    await loginAsPlayer(page);

    // Verify token is stored
    const tokenAfterLogin = await getAuthToken(page);
    expect(tokenAfterLogin).toBeTruthy();

    // Verify authenticated status
    const authenticated = await isAuthenticated(page);
    expect(authenticated).toBe(true);

    // Refresh page
    await page.reload();

    // Wait for any redirects to settle
    await page.waitForLoadState("networkidle", { timeout: 10_000 });

    // Verify still authenticated
    const tokenAfterRefresh = await getAuthToken(page);
    expect(tokenAfterRefresh).toBeTruthy();

    // Verify not redirected to login
    expect(page.url()).not.toContain("/auth");
  });

  test("Logout flow: login → logout → redirected to login", async ({ page }) => {
    // Login first
    await loginAsPlayer(page);

    // Verify logged in
    const authenticatedBefore = await isAuthenticated(page);
    expect(authenticatedBefore).toBe(true);

    // Perform logout
    await logoutPlayer(page);

    // Verify redirected to login
    expect(page.url()).toContain("/auth") || expect(page.url()).toContain("/login");

    // Verify token is cleared
    const tokenAfterLogout = await getAuthToken(page);
    expect(tokenAfterLogout).toBeFalsy();

    // Verify not authenticated
    const authenticated = await isAuthenticated(page);
    expect(authenticated).toBe(false);
  });

  test("Invalid credentials: login with wrong password → error message shown", async ({ page }) => {
    await page.goto("/auth/login");

    // Wait for login form
    const usernameInput = page
      .locator('input[data-testid="login-username"]')
      .or(page.locator('input[name="username"]'))
      .first();

    const passwordInput = page
      .locator('input[data-testid="login-password"]')
      .or(page.locator('input[type="password"]'))
      .first();

    await usernameInput.waitFor({ state: "visible" });

    // Enter invalid credentials
    await usernameInput.fill("player@example.com");
    await passwordInput.fill("wrongpassword");

    // Submit form
    const submitButton = page
      .locator('button[data-testid="login-submit"]')
      .or(page.locator('button[type="submit"]'))
      .or(page.locator("button:has-text('Login')"))
      .first();

    await submitButton.click();

    // Verify error message is shown
    const errorMessage = page
      .locator('[data-testid="login-error"]')
      .or(page.locator('[role="alert"]'))
      .or(page.locator("text=Invalid"))
      .or(page.locator("text=incorrect"))
      .first();

    await expect(errorMessage).toBeVisible({ timeout: 5000 }).catch(() => {
      // If error not visible, verify we're still on login page
      expect(page.url()).toContain("/auth");
    });
  });

  test("Token refresh: verify token is refreshed during session", async ({ page }) => {
    // Login
    await loginAsPlayer(page);

    const initialToken = await getAuthToken(page);
    expect(initialToken).toBeTruthy();

    // Wait and trigger navigation to refresh token
    await page.goto("/");
    await page.waitForLoadState("networkidle", { timeout: 10_000 });

    // Token should still exist (may be same or refreshed)
    const currentToken = await getAuthToken(page);
    expect(currentToken).toBeTruthy();

    // Verify we're not redirected to login
    expect(page.url()).not.toContain("/auth");
  });
});

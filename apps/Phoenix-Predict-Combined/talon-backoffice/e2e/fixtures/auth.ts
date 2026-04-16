/**
 * Auth Helpers — Reusable login functions for both apps
 */
import { Page, expect } from "@playwright/test";

/**
 * Login to player app
 * Assumes fresh session (not logged in)
 */
export async function loginAsPlayer(page: Page, username = "player@example.com", password = "test123") {
  await page.goto("/auth/login");

  // Wait for login form to be visible
  const usernameInput = page
    .locator('input[data-testid="login-username"]')
    .or(page.locator('input[name="username"]'))
    .or(page.locator('input[placeholder*="user" i]'))
    .first();

  const passwordInput = page
    .locator('input[data-testid="login-password"]')
    .or(page.locator('input[type="password"]'))
    .first();

  await usernameInput.waitFor({ state: "visible", timeout: 15_000 });

  // Fill credentials
  await usernameInput.fill(username);
  await passwordInput.fill(password);

  // Submit form
  const submitButton = page
    .locator('button[data-testid="login-submit"]')
    .or(page.locator('button[type="submit"]'))
    .or(page.locator("button:has-text('Login')"))
    .or(page.locator("button:has-text('Sign In')"))
    .first();

  await submitButton.click();

  // Wait for redirect away from login
  await page.waitForURL((url) => !url.pathname.includes("/auth") && !url.pathname.includes("/login"), {
    timeout: 15_000,
  });
}

/**
 * Login to backoffice (admin)
 * Assumes fresh session (not logged in)
 */
export async function loginAsAdmin(page: Page, username = "admin@chucknorris.com", password = "test") {
  await page.goto("/auth");

  // Wait for login form to be visible
  const usernameInput = page
    .locator('input[data-testid="auth-username"]')
    .or(page.locator('input[id="username"]'))
    .or(page.locator('input[name="username"]'))
    .or(page.locator('input[placeholder*="user" i]'))
    .first();

  const passwordInput = page
    .locator('input[data-testid="auth-password"]')
    .or(page.locator('input[type="password"]'))
    .first();

  await usernameInput.waitFor({ state: "visible", timeout: 15_000 });

  // Fill credentials
  await usernameInput.fill(username);
  await passwordInput.fill(password);

  // Submit form
  const submitButton = page
    .locator('button[data-testid="auth-submit"]')
    .or(page.locator('button[type="submit"]'))
    .or(page.locator('button[htmlType="submit"]'))
    .or(page.locator("button:has-text('Login')"))
    .or(page.locator("button:has-text('Sign in')"))
    .first();

  await submitButton.click();

  // Wait for redirect away from /auth
  await page.waitForURL((url) => !url.pathname.includes("/auth"), {
    timeout: 15_000,
  });
}

/**
 * Logout from player app
 */
export async function logoutPlayer(page: Page) {
  // Look for user menu / profile button
  const userMenu = page
    .locator('[data-testid="user-menu"]')
    .or(page.locator('[data-testid="profile-button"]'))
    .or(page.locator("button:has-text('Profile')"))
    .first();

  if (await userMenu.isVisible()) {
    await userMenu.click();
  }

  // Click logout
  const logoutButton = page
    .locator('[data-testid="logout-button"]')
    .or(page.locator("button:has-text('Logout')"))
    .or(page.locator("button:has-text('Sign Out')"))
    .first();

  await logoutButton.click();

  // Wait for redirect to login
  await page.waitForURL((url) => url.pathname.includes("/auth") || url.pathname.includes("/login"), {
    timeout: 10_000,
  });
}

/**
 * Logout from backoffice
 */
export async function logoutAdmin(page: Page) {
  // Look for admin menu / profile button
  const adminMenu = page
    .locator('[data-testid="admin-menu"]')
    .or(page.locator('[data-testid="user-profile-menu"]'))
    .or(page.locator("button:has-text('Settings')"))
    .first();

  if (await adminMenu.isVisible()) {
    await adminMenu.click();
  }

  // Click logout
  const logoutButton = page
    .locator('[data-testid="admin-logout"]')
    .or(page.locator("button:has-text('Logout')"))
    .or(page.locator("button:has-text('Sign Out')"))
    .first();

  await logoutButton.click();

  // Wait for redirect to auth
  await page.waitForURL((url) => url.pathname.includes("/auth"), {
    timeout: 10_000,
  });
}

/**
 * Check if user is authenticated by verifying auth token in storage
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  const token = await page.evaluate(() => {
    return (
      localStorage.getItem("auth_token") ||
      localStorage.getItem("token") ||
      sessionStorage.getItem("auth_token") ||
      sessionStorage.getItem("token")
    );
  });

  return !!token;
}

/**
 * Get current auth token from storage
 */
export async function getAuthToken(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    return (
      localStorage.getItem("auth_token") ||
      localStorage.getItem("token") ||
      sessionStorage.getItem("auth_token") ||
      sessionStorage.getItem("token")
    );
  });
}

/**
 * Auth Helpers — Reusable login functions for both apps
 */
import { Page, expect } from "@playwright/test";

/**
 * Login to player app
 * Assumes fresh session (not logged in)
 */
export async function loginAsPlayer(
  page: Page,
  username = "player@example.com",
  password = "test123",
) {
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
  await page.waitForURL(
    (url) =>
      !url.pathname.includes("/auth") && !url.pathname.includes("/login"),
    {
      timeout: 15_000,
    },
  );
}

/**
 * Login to backoffice (admin) via the App Router login (/auth/login), which
 * proxies to the real Go auth service. The old /auth mock login died with
 * the Pages Router. Defaults are the auth service's dev-seeded admin.
 */
export async function loginAsAdmin(
  page: Page,
  username = process.env.E2E_ADMIN_USERNAME || "admin@phoenix.local",
  password = process.env.E2E_ADMIN_PASSWORD || "admin123",
) {
  await page.goto("/auth/login");

  const emailInput = page
    .locator('input[type="email"]')
    .or(page.locator('input[name="username"]'))
    .first();
  const passwordInput = page.locator('input[type="password"]').first();

  // Dev-mode first hit compiles the page; give it room.
  await emailInput.waitFor({ state: "visible", timeout: 45_000 });

  await emailInput.fill(username);
  await passwordInput.fill(password);

  const submitButton = page
    .locator('button[type="submit"]')
    .or(page.locator("button:has-text('Sign In')"))
    .first();

  await submitButton.click();

  // Redirect away from the login route signals success.
  await page.waitForURL((url) => !url.pathname.startsWith("/auth"), {
    timeout: 20_000,
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
  await page.waitForURL(
    (url) => url.pathname.includes("/auth") || url.pathname.includes("/login"),
    {
      timeout: 10_000,
    },
  );
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

import { test as setup, expect } from "@playwright/test";

/**
 * Auth setup — logs in via the mock-server and saves session state.
 * Other tests load this state to skip the login flow.
 */
const MOCK_ADMIN = {
  username: "admin@chucknorris.com",
  password: "test",
};

setup("authenticate as admin", async ({ page }) => {
  // Navigate to auth page
  await page.goto("/auth");

  // Wait for login form to be visible
  const usernameInput = page.locator('input[id="username"]').or(
    page.locator('input[name="username"]')
  ).or(
    page.locator('input[placeholder*="user" i]')
  ).first();

  const passwordInput = page.locator('input[type="password"]').first();

  await usernameInput.waitFor({ state: "visible", timeout: 15_000 });

  // Fill in credentials
  await usernameInput.fill(MOCK_ADMIN.username);
  await passwordInput.fill(MOCK_ADMIN.password);

  // Submit the form
  const submitButton = page.locator('button[type="submit"]').or(
    page.locator('button[htmlType="submit"]')
  ).or(
    page.locator("button:has-text('Login')").or(
      page.locator("button:has-text('Sign in')")
    )
  ).first();

  await submitButton.click();

  // Wait for redirect away from /auth — indicates successful login
  await page.waitForURL((url) => !url.pathname.includes("/auth"), {
    timeout: 15_000,
  });

  // Save signed-in state for reuse
  await page.context().storageState({ path: "e2e/.auth/admin.json" });
});

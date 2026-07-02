import { test as setup } from "@playwright/test";

/**
 * Auth setup — signs in through the office App Router login (/auth/login),
 * which proxies to the real Go auth service (NEXT_PUBLIC_AUTH_URL, default
 * :18081). The old mock-server login died with the Pages Router; running
 * this suite requires the local auth service + gateway (see e2e/README.md).
 * Credentials default to the auth service's dev-seeded admin.
 */
const ADMIN = {
  username: process.env.E2E_ADMIN_USERNAME || "admin@phoenix.local",
  password: process.env.E2E_ADMIN_PASSWORD || "admin123",
};

setup("authenticate as admin", async ({ page }) => {
  await page.goto("/auth/login");

  const emailInput = page
    .locator('input[type="email"]')
    .or(page.locator('input[name="username"]'))
    .first();
  const passwordInput = page.locator('input[type="password"]').first();

  // Dev-mode first hit compiles the page; give it room.
  await emailInput.waitFor({ state: "visible", timeout: 45_000 });

  await emailInput.fill(ADMIN.username);
  await passwordInput.fill(ADMIN.password);

  await page
    .locator('button[type="submit"]')
    .or(page.locator("button:has-text('Sign In')"))
    .first()
    .click();

  // Redirect away from the login route signals success.
  await page.waitForURL((url) => !url.pathname.startsWith("/auth"), {
    timeout: 20_000,
  });

  await page.context().storageState({ path: "e2e/.auth/admin.json" });
});

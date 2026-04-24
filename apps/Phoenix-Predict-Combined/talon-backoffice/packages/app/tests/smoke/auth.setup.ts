import { expect, test as setup } from "@playwright/test";
import { existsSync } from "node:fs";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

/**
 * Runs ONCE before the smoke suite. Performs the demo login and writes
 * the resulting browser storage state (cookies + localStorage) to
 * tests/.auth/demo.json. Every smoke test loads from this file via
 * storageState fixture, so we pay the auth cost once, not per test.
 *
 * Avoids the auth-service rate limit that fires after ~5 login attempts
 * in a short window.
 *
 * If tests/.auth/demo.json already exists and is fresh, we short-circuit.
 * Playwright's auth file is 1 test-run ephemeral; we don't bother with
 * mtime comparisons.
 */

const AUTH_FILE = "./tests/.auth/demo.json";
const DEMO_EMAIL = "demo@phoenix.local";
const DEMO_PASSWORD = "demo123";

setup("authenticate demo user", async ({ page }) => {
  // Ensure .auth directory exists.
  if (!existsSync(dirname(AUTH_FILE))) {
    mkdirSync(dirname(AUTH_FILE), { recursive: true });
  }

  // Go to the login page first so the browser has the origin in context.
  // Otherwise storageState may not persist cookies tied to the origin.
  await page.goto("/auth/login");

  // Fill + submit the form rather than posting JSON directly — this exercises
  // the real login path and avoids any CSRF or middleware the proxy applies
  // to programmatic POSTs.
  await page.locator('input[name="username"]').fill(DEMO_EMAIL);
  await page.locator('input[name="password"]').fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: /log ?in/i }).click();

  // Wait for the redirect off the login page. AuthProvider hydrates and the
  // app routes to / by default.
  await page.waitForURL((url) => !url.pathname.startsWith("/auth/login"), {
    timeout: 15_000,
  });

  // Sanity check: session endpoint should now return 200.
  const sessionCheck = await page.request.get("/api/v1/auth/session/");
  expect(
    sessionCheck.ok(),
    `auth setup: session check after login returned ${sessionCheck.status()}`,
  ).toBe(true);

  // Persist for the rest of the suite.
  await page.context().storageState({ path: AUTH_FILE });
});

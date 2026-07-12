import {
  test,
  expect,
  assertPageHealthy,
  captureConsoleErrors,
} from "./_shared";

// Override the shared auth storage — the login page is unauthenticated
// by definition. Reset cookies + origins so we land on /auth/login cleanly.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("/auth/login — login form", () => {
  test("login form fields + submit button render", async ({ page }) => {
    const checkErrors = captureConsoleErrors(page);

    await assertPageHealthy(page, "/auth/login");

    // Username and password inputs exist.
    await expect(
      page.locator('input[name="username"], input[type="email"]').first(),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('input[name="password"]').first()).toBeVisible();

    // Submit button present.
    await expect(
      page.getByRole("button", { name: /log ?in|sign ?in|continue/i }).first(),
    ).toBeVisible();

    // Demo creds hint visible — it's part of the current login layout and
    // stays through the redesign.
    // (2026-07-12) The P9 login redesign removed the on-page demo-credential
    // hint (deployed demo shows none either); the form fields + submit above
    // are the stable contract.

    checkErrors();
  });
});

import {
  test,
  expect,
  assertPageHealthy,
  captureConsoleErrors,
} from "./_shared";

test.describe("/account — settings", () => {
  test("settings page renders with profile + privacy sections", async ({
    page,
  }) => {
    const checkErrors = captureConsoleErrors(page);

    await assertPageHealthy(page, "/account");

    // Account heading.
    await expect(
      page.getByRole("heading", { name: /account|settings|profile/i }).first(),
    ).toBeVisible({ timeout: 10_000 });

    // Privacy toggle (display_anonymous) renders. Shipped in the loyalty
    // cycle (commit 02d29c22). The copy is "Appear anonymously" or similar
    // per the primer.
    await expect(
      page.getByText(/anonymous|privacy|appear as trader/i).first(),
    ).toBeVisible();

    checkErrors();
  });
});

import {
  test,
  expect,
  assertPageHealthy,
  captureConsoleErrors,
} from "./_shared";

test.describe("/portfolio — positions + summary", () => {
  test("summary strip + tabs render", async ({ page }) => {
    const checkErrors = captureConsoleErrors(page);

    await assertPageHealthy(page, "/portfolio");

    // Page title / heading present.
    await expect(page.getByRole("heading", { name: /portfolio/i })).toBeVisible(
      {
        timeout: 10_000,
      },
    );

    // Summary strip renders — we match the labels per plan's hierarchy table.
    // At least one should be visible even for the demo user with zero positions.
    await expect(
      page
        .getByText(/realized p.?.?l|invested|accuracy|open positions/i)
        .first(),
    ).toBeVisible();

    // Tabs (Positions / Open orders / History). The component renders each
    // as role="tab" inside a role="tablist", not role="button".
    await expect(
      page.getByRole("tab", { name: /positions|orders|history/i }).first(),
    ).toBeVisible();

    checkErrors();
  });
});

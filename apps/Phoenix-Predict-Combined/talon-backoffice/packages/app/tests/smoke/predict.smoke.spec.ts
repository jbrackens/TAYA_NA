import {
  test,
  expect,
  assertPageHealthy,
  captureConsoleErrors,
} from "./_shared";

test.describe("/predict — discovery landing", () => {
  test("renders market grid + categories", async ({ page }) => {
    const checkErrors = captureConsoleErrors(page);

    await assertPageHealthy(page, "/predict");

    // Category filter strip should render — it's present on every discovery
    // variant in the plan's hierarchy table.
    await expect(
      page.getByText(/politics|crypto|sports/i).first(),
    ).toBeVisible();

    // At least one market card should expose both sides in its accessible name.
    // The visual order can change (YES 65 percent vs 65 percent YES), but the card
    // still needs to announce the tradeable YES/NO prices.
    await expect(
      page
        .getByRole("link", { name: /YES \d+ percent.*NO \d+ percent/i })
        .first(),
    ).toBeVisible({ timeout: 10_000 });

    checkErrors();
  });
});

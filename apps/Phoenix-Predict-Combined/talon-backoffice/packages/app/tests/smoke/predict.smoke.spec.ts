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

    // At least one market-like element should render. We match on the YES/NO
    // cent text pattern since MarketCard's exact DOM shape is expected to
    // change during the redesign.
    await expect(page.getByText(/\d+¢\s*YES/i).first()).toBeVisible({
      timeout: 10_000,
    });

    checkErrors();
  });
});

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
      page
        .getByRole("tab", {
          name: /politics|sports|entertainment|technology|economics/i,
        })
        .first(),
    ).toBeVisible();

    // At least one market card should render its tradeable prices. The Phase 3
    // redesign shows YES/NO as ¢ price pills (MarketCard "Buy YES"/"Buy NO"
    // sibling links), matching the market-detail smoke assertion.
    await expect(page.getByText(/\d+¢/).first()).toBeVisible({
      timeout: 10_000,
    });

    checkErrors();
  });
});

import {
  test,
  expect,
  assertPageHealthy,
  captureConsoleErrors,
} from "./_shared";

test.describe("/rewards — loyalty ledger + tiers", () => {
  test("tier ladder + ledger table render", async ({ page }) => {
    const checkErrors = captureConsoleErrors(page);

    await assertPageHealthy(page, "/rewards");

    // "Rewards" kicker / heading. Rendered regardless of loyalty state.
    await expect(page.getByText(/^rewards$/i).first()).toBeVisible({
      timeout: 10_000,
    });

    // Either the tier ladder rendered (Newcomer/Trader/Sharp/Whale/Legend)
    // OR an empty-state prompt for a user who hasn't accrued yet.
    const hasTierOrLedgerContent = await page
      .getByText(
        /newcomer|trader|sharp|whale|legend|points|event|no ledger|earn your first|start trading/i,
      )
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);
    expect(
      hasTierOrLedgerContent,
      "/rewards should show tier ladder or empty-state copy",
    ).toBe(true);

    checkErrors();
  });
});

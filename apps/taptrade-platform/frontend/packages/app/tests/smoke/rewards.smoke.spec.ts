import {
  test,
  expect,
  assertPageHealthy,
  captureConsoleErrors,
} from "./_shared";

test.describe("/rewards — loyalty ledger + tiers", () => {
  test("tier ladder, ledger, and active point-play bonus render", async ({
    page,
  }) => {
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

    const activeBonusResponse = await page.request.get(
      "/api/v1/bonuses/active",
    );
    expect(
      activeBonusResponse.ok(),
      `active bonus API returned ${activeBonusResponse.status()}`,
    ).toBe(true);
    const activeBonusPayload = await activeBonusResponse.json();
    const activeBonuses = activeBonusPayload.bonuses ?? [];
    expect(
      activeBonuses.length,
      "demo rewards smoke should include seeded active point-play bonus rows",
    ).toBeGreaterThan(0);
    const demoBonus = activeBonuses.find(
      (bonus: Record<string, unknown>) =>
        bonus.campaignName === "Demo Point-Play Bonus" ||
        bonus.campaign_name === "Demo Point-Play Bonus",
    );
    expect(demoBonus, "demo active point-play bonus missing").toBeTruthy();
    expect(demoBonus.unit).toBe("PTS");
    // Whole-Points unit model (2026-07-09, migration 050): wire fields
    // are *Points; the transitional *PointsCents names are retired.
    // (Smoke re-encoded 2026-07-12 during the P10 pass — it had gone
    // stale against the points migration.)
    expect(demoBonus.remainingPoints).toBe(15_000);
    expect(demoBonus.playRequiredPoints).toBe(100_000);
    expect(demoBonus.playCompletedPoints).toBe(25_000);
    for (const retired of [
      "remainingAmountCents",
      "wageringRequiredCents",
      "wageringCompletedCents",
      "wageringProgressPct",
      "remainingPointsCents",
      "playRequiredPointsCents",
      "playCompletedPointsCents",
    ]) {
      expect(
        demoBonus[retired],
        `retired bonus API field ${retired} should not be present`,
      ).toBeUndefined();
    }

    await expect(
      page.getByText(/active point-play bonuses/i).first(),
    ).toBeVisible();
    await expect(page.getByText("Demo Point-Play Bonus")).toBeVisible();
    await expect(page.getByText(/pts remaining/i).first()).toBeVisible();
    const playProgress = page
      .getByRole("progressbar", {
        name: /play progress/i,
      })
      .first();
    await expect(playProgress).toBeVisible();
    await expect(playProgress).toHaveAttribute("value", "25");

    checkErrors();
  });
});

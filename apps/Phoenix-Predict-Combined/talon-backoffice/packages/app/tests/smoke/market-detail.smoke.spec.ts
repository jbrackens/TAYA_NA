import {
  test,
  expect,
  assertPageHealthy,
  captureConsoleErrors,
} from "./_shared";

test.describe("/market/[ticker] — market detail", () => {
  test("first seeded market renders chart + trade ticket", async ({ page }) => {
    const checkErrors = captureConsoleErrors(page);

    // Discover a real seeded ticker rather than hardcoding one. If seed
    // changes, the test shouldn't break.
    const discoveryResponse = await page.request.get("/api/v1/discovery");
    expect(
      discoveryResponse.ok(),
      `/api/v1/discovery returned ${discoveryResponse.status()}`,
    ).toBe(true);

    const discovery = (await discoveryResponse.json()) as {
      featured?: Array<{ ticker?: string }>;
      trending?: Array<{ ticker?: string }>;
    };
    const firstTicker =
      discovery.featured?.[0]?.ticker ?? discovery.trending?.[0]?.ticker;

    if (!firstTicker) {
      test.skip(
        true,
        "No seeded markets returned from /api/v1/discovery — skipping smoke",
      );
      return;
    }

    await assertPageHealthy(page, `/market/${firstTicker}`);

    // Market question renders — the market head card prints the question
    // as the largest text on the page.
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 10_000 });

    // YES and NO prices are both rendered somewhere on the page.
    await expect(page.getByText(/\d+¢/).first()).toBeVisible();

    // Trade ticket exists — we match the "Review trade" CTA text since the
    // component structure is redesigned in Phase 3.
    const ticketCta = page.getByRole("button", {
      name: /review|place|confirm|buy|yes|no/i,
    });
    await expect(ticketCta.first()).toBeVisible({ timeout: 10_000 });

    checkErrors();
  });

  test.describe("unauthenticated trade ticket", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("quick amount chips keep the selected amount when balance is zero", async ({
      page,
    }) => {
      const checkErrors = captureConsoleErrors(page);

      const discoveryResponse = await page.request.get("/api/v1/discovery");
      expect(
        discoveryResponse.ok(),
        `/api/v1/discovery returned ${discoveryResponse.status()}`,
      ).toBe(true);

      const discovery = (await discoveryResponse.json()) as {
        featured?: Array<{ ticker?: string }>;
        trending?: Array<{ ticker?: string }>;
      };
      const firstTicker =
        discovery.featured?.[0]?.ticker ?? discovery.trending?.[0]?.ticker;

      if (!firstTicker) {
        test.skip(
          true,
          "No seeded markets returned from /api/v1/discovery — skipping smoke",
        );
        return;
      }

      await assertPageHealthy(page, `/market/${firstTicker}`);

      // Regression: ISSUE-001 — quick amount chips displayed $0.00 when
      // balance was zero because they clamped to the user's balance.
      // Found by /qa on 2026-04-25.
      // Report: .gstack/qa-reports/qa-report-localhost-3000-2026-04-25.md
      await page.getByRole("button", { name: "$100" }).click();
      await expect(
        page.getByRole("button", { name: "Review trade · $100.00" }),
      ).toBeVisible();

      checkErrors();
    });
  });
});

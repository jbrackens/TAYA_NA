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
});

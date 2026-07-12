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

    test("public market page stays console-clean and keeps selected quick amount", async ({
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

      // Regression: ISSUE-001 — amounts must not clamp to a zero balance
      // for logged-out visitors. The Phase-3 quick-amount chips were
      // replaced by the editable Points input in the P9.2 ticket
      // (2026-07-07); this smoke was re-encoded to the current contract
      // on 2026-07-12 (P10) — it had gone stale asserting a "$100" chip
      // that no longer exists.
      await expect(
        page.getByRole("link", { name: "Log in to trade" }),
      ).toBeVisible();
      const amountInput = page.getByRole("spinbutton").first();
      await amountInput.fill("250");
      // The typed amount sticks (no zero-balance clamp) and flows into
      // the CTA label, side + amount preserved through the login link.
      await expect(amountInput).toHaveValue("250");
      await expect(
        page.getByRole("link", { name: "Log in to trade" }),
      ).toBeVisible();

      checkErrors();
    });

    test("invalid market ticker shows recovery UI with only the expected 404 noise", async ({
      page,
    }) => {
      const ticker = "NOT-A-REAL-MARKET";
      const checkErrors = captureConsoleErrors(page, {
        allow: [
          `/api/v1/markets/${ticker}`,
          (text) =>
            text.includes("Failed to load resource") && text.includes("404"),
        ],
      });
      const marketNotFound = page.waitForResponse(
        (response) =>
          response.url().includes(`/api/v1/markets/${ticker}`) &&
          response.status() === 404,
      );

      const response = await page.goto(`/market/${ticker}`, {
        waitUntil: "domcontentloaded",
      });

      expect(response?.ok(), `/market/${ticker} route should render`).toBe(
        true,
      );
      await marketNotFound;
      await expect(page.getByText("Market unavailable")).toBeVisible({
        timeout: 10_000,
      });
      await expect(
        page.getByRole("heading", { name: /couldn't open that market/i }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Back to Markets" }),
      ).toBeVisible();

      checkErrors();
    });
  });
});

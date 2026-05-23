import { test, expect, Page } from "@playwright/test";

/**
 * Lenient UI smoke: confirms the prediction pages render against the live stack
 * with no Next.js runtime/build error overlay. Deep behaviour (trading,
 * accounting, KYC, authz) is covered by critical-paths.api.spec.ts. Runs with
 * the demo session (storageState from auth.setup.ts).
 */

async function assertNoNextError(page: Page): Promise<void> {
  await expect(page.locator("[data-nextjs-dialog]")).toHaveCount(0);
}

test("discovery page renders", async ({ page }) => {
  const resp = await page.goto("/predict/", { waitUntil: "domcontentloaded" });
  expect(
    resp?.status() ?? 0,
    "discovery responds without server error",
  ).toBeLessThan(400);
  await assertNoNextError(page);
  await expect(page.locator("body")).toBeVisible();
});

test("market detail renders for a real market", async ({ page, request }) => {
  const markets =
    (
      await (
        await request.get("/api/v1/markets?status=open&pageSize=50")
      ).json()
    ).data ?? [];
  test.skip(markets.length === 0, "no open markets to view");
  const ticker = markets[0].ticker as string;
  const resp = await page.goto(`/market/${encodeURIComponent(ticker)}/`, {
    waitUntil: "domcontentloaded",
  });
  expect(resp?.status() ?? 0).toBeLessThan(400);
  await assertNoNextError(page);
});

test("authenticated portfolio page loads", async ({ page }) => {
  const resp = await page.goto("/portfolio/", {
    waitUntil: "domcontentloaded",
  });
  expect(resp?.status() ?? 0).toBeLessThan(400);
  await assertNoNextError(page);
  expect(page.url(), "should stay on portfolio (session present)").toContain(
    "/portfolio",
  );
});

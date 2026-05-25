import { expect, test, type APIRequestContext } from "@playwright/test";

async function login(
  request: APIRequestContext,
  username: string,
  password: string,
  baseUrl = "",
): Promise<string> {
  const res = await request.post(`${baseUrl}/api/v1/auth/login`, {
    data: { username, password },
  });
  expect(res.ok(), `login ${username} (got ${res.status()})`).toBeTruthy();
  const state = await request.storageState();
  return state.cookies.find((c) => c.name === "csrf_token")?.value ?? "";
}

function csrfHeaders(csrf: string): Record<string, string> {
  return { "X-CSRF-Token": csrf, "Content-Type": "application/json" };
}

test("market created in backoffice is published to the player app", async ({
  page,
  request,
}) => {
  const adminApiBase =
    process.env.PREDICT_ADMIN_API_URL || "http://localhost:18080";
  const adminCsrf = await login(
    request,
    "admin@phoenix.local",
    "admin123",
    adminApiBase,
  );
  const suffix = `${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 6)}`.toUpperCase();
  const ticker = `E2E-PUB-${suffix}`;
  const title = `E2E publish smoke ${suffix}: Will this market appear on player?`;
  const closeAt = new Date(Date.now() + 45 * 60 * 1000).toISOString();

  const eventsRes = await request.get("/api/v1/events?status=open&pageSize=20");
  expect(eventsRes.ok(), `events (got ${eventsRes.status()})`).toBe(true);
  const events = (await eventsRes.json()).data ?? [];
  expect(
    events.length,
    "at least one existing event for market creation",
  ).toBeGreaterThan(0);
  const event = events[0];
  let marketId: string | undefined;

  try {
    const marketRes = await request.post(
      `${adminApiBase}/api/v1/admin/markets`,
      {
        headers: csrfHeaders(adminCsrf),
        data: {
          eventId: event.id,
          ticker,
          title,
          description:
            "Synthetic market created by Playwright to verify player visibility.",
          settlementSourceKey: "manual",
          settlementRule: "manual_attestation",
          settlementParams: { test: "market-publish-ui", suffix },
          closeAt,
          settlementCutoffAt: closeAt,
          ammLiquidityParam: 100,
          ammSubsidyCents: 0,
        },
      },
    );
    expect(marketRes.ok(), `create market (got ${marketRes.status()})`).toBe(
      true,
    );
    const market = await marketRes.json();
    marketId = market.id;

    const openRes = await request.post(
      `${adminApiBase}/api/v1/admin/markets/${market.id}/lifecycle/open`,
      {
        headers: csrfHeaders(adminCsrf),
        data: { reason: "E2E publish-to-player smoke test" },
      },
    );
    expect(openRes.ok(), `open market (got ${openRes.status()})`).toBe(true);

    const publicRes = await request.get(
      `/api/v1/markets?status=open&ticker=${encodeURIComponent(
        ticker,
      )}&pageSize=5`,
    );
    expect(
      publicRes.ok(),
      `public market list (got ${publicRes.status()})`,
    ).toBe(true);
    const publicMarkets = (await publicRes.json()).data ?? [];
    expect(
      publicMarkets.some((m: { ticker: string; title: string }) => {
        return m.ticker === ticker && m.title === title;
      }),
      "newly opened market is returned by player API",
    ).toBe(true);

    const resp = await page.goto("/predict/", { waitUntil: "networkidle" });
    expect(resp?.status() ?? 0, "player predict page status").toBeLessThan(400);
    await expect(page.locator("[data-nextjs-dialog]")).toHaveCount(0);
    const titleMatches = page.getByText(title, { exact: true });
    expect(await titleMatches.count()).toBeGreaterThan(0);
    await expect(titleMatches.first()).toBeVisible();
  } finally {
    if (marketId) {
      await request.post(
        `${adminApiBase}/api/v1/admin/markets/${marketId}/lifecycle/void`,
        {
          headers: csrfHeaders(adminCsrf),
          data: { reason: "E2E cleanup after publish-to-player smoke test" },
        },
      );
    }
  }
});

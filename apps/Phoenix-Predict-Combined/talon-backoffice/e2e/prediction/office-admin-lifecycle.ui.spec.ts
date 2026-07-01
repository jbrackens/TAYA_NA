import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });
test.setTimeout(120_000);

async function login(
  request: APIRequestContext,
  username: string,
  password: string,
  baseUrl: string,
): Promise<{ accessToken: string; csrf: string }> {
  const res = await request.post(`${baseUrl}/api/v1/auth/login`, {
    data: { username, password },
  });
  expect(res.ok(), `login ${username} (got ${res.status()})`).toBeTruthy();
  const body = await res.json();
  const csrf =
    res
      .headersArray()
      .find(
        (header) =>
          header.name.toLowerCase() === "set-cookie" &&
          header.value.startsWith("csrf_token="),
      )
      ?.value.match(/^csrf_token=([^;]+)/)?.[1] ?? "";
  expect(body.accessToken, "admin access token").toBeTruthy();
  expect(csrf, "admin csrf token").toBeTruthy();
  return { accessToken: body.accessToken, csrf };
}

function adminHeaders(auth: {
  accessToken: string;
  csrf: string;
}): Record<string, string> {
  return {
    Authorization: `Bearer ${auth.accessToken}`,
    Cookie: `access_token=${auth.accessToken}; csrf_token=${auth.csrf}`,
    "X-Admin-Role": "admin",
    "X-CSRF-Token": auth.csrf,
    "Content-Type": "application/json",
  };
}

async function loginOffice(page: Page, officeBaseUrl: string): Promise<void> {
  await page.context().clearCookies();
  await page.goto(
    `${officeBaseUrl}/auth/login?returnUrl=/prediction-admin/markets`,
    {
      waitUntil: "load",
    },
  );
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.reload({ waitUntil: "load" });
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { name: "Backoffice" })).toBeVisible();
  const email = page.locator('input[type="email"]');
  const password = page.locator('input[type="password"]');
  await email.fill("admin@phoenix.local");
  await password.fill("admin123");
  await expect(email).toHaveValue("admin@phoenix.local");
  await expect(password).toHaveValue("admin123");
  await Promise.all([
    page.waitForResponse(
      (res) =>
        res.url().includes("/api/auth/login") &&
        res.request().method() === "POST" &&
        res.ok(),
      { timeout: 20_000 },
    ),
    page.getByRole("button", { name: "Sign In" }).click(),
  ]);
  await page.waitForURL(/\/prediction-admin\/markets\/?$/, { timeout: 20_000 });
  await expect(page.locator("[data-nextjs-dialog]")).toHaveCount(0);
}

test("office admin opens, closes, and audits a prediction market through the browser", async ({
  page,
  request,
}) => {
  const officeBaseUrl =
    process.env.PREDICT_OFFICE_BASE_URL || "http://localhost:3000";
  const adminApiBase =
    process.env.PREDICT_ADMIN_API_URL || "http://127.0.0.1:18080";
  const suffix = `${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 6)}`.toUpperCase();
  const ticker = `OFFICE-LC-${suffix}`;
  const title = `Office lifecycle proof ${suffix}`;
  const closeReason = `Loop 359 office browser close ${suffix}`;
  let marketId: string | undefined;

  const adminAuth = await login(
    request,
    "admin@phoenix.local",
    "admin123",
    adminApiBase,
  );

  try {
    const eventsRes = await request.get(
      `${adminApiBase}/api/v1/events?status=open&pageSize=20`,
    );
    expect(eventsRes.ok(), `events (got ${eventsRes.status()})`).toBeTruthy();
    const events = (await eventsRes.json()).data ?? [];
    expect(events.length, "at least one seeded event").toBeGreaterThan(0);

    const createRes = await request.post(
      `${adminApiBase}/api/v1/admin/markets`,
      {
        headers: adminHeaders(adminAuth),
        data: {
          eventId: events[0].id,
          ticker,
          title,
          description:
            "Synthetic market created to prove office browser lifecycle controls.",
          settlementSourceKey: "admin-manual",
          settlementRule: "binary_outcome",
          settlementParams: {
            source: "office-admin-lifecycle-ui",
            criteria: "YES if the operator attests the proof condition",
          },
          closeAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          settlementCutoffAt: new Date(
            Date.now() + 90 * 60 * 1000,
          ).toISOString(),
          ammLiquidityParam: 100,
          feeRateBps: 0,
          ammSubsidyPointsCents: 0,
        },
      },
    );
    expect(
      createRes.ok(),
      `create market (got ${createRes.status()})`,
    ).toBeTruthy();
    const market = await createRes.json();
    marketId = market.id;

    await loginOffice(page, officeBaseUrl);
    await expect(
      page.getByRole("heading", { name: "Prediction Markets" }),
    ).toBeVisible();

    const draftRow = page.getByRole("row", { name: new RegExp(ticker) });
    await expect(draftRow).toBeVisible({ timeout: 20_000 });
    await expect(draftRow.getByText("Draft", { exact: true })).toBeVisible();
    await draftRow.getByRole("button", { name: "Open" }).click();
    await expect(draftRow.getByText("Open", { exact: true })).toBeVisible({
      timeout: 20_000,
    });
    await expect(draftRow.getByRole("button", { name: "Close" })).toBeVisible();

    await draftRow.getByRole("button", { name: "Close" }).click();
    const closeDialog = page.getByRole("dialog", {
      name: new RegExp(`Close ${ticker}\\?`),
    });
    await expect(closeDialog).toBeVisible();
    await closeDialog.getByRole("textbox").fill(closeReason);
    await closeDialog.getByRole("button", { name: "Close market" }).click();
    await expect(draftRow.getByText("Closed", { exact: true })).toBeVisible({
      timeout: 20_000,
    });

    await draftRow.getByRole("button", { name: "Audit" }).click();
    const auditDialog = page.getByRole("dialog", {
      name: new RegExp(`Lifecycle Audit.*${ticker}`),
    });
    await expect(auditDialog).toBeVisible();
    await expect(auditDialog.getByText("Open", { exact: true })).toBeVisible();
    await expect(
      auditDialog.getByText("Closed", { exact: true }),
    ).toBeVisible();
    await expect(auditDialog.getByText(closeReason)).toBeVisible();

    for (const path of [
      "/cashier",
      "/cashout",
      "/crypto",
      "/deposit",
      "/withdraw",
    ]) {
      const res = await page.goto(`${officeBaseUrl}${path}`, {
        waitUntil: "domcontentloaded",
      });
      expect(res?.status() ?? 0, `${path} absent from office routes`).toBe(404);
    }
  } finally {
    if (marketId) {
      await request.post(
        `${adminApiBase}/api/v1/admin/markets/${marketId}/lifecycle/void`,
        {
          headers: adminHeaders(adminAuth),
          data: { reason: "E2E cleanup after office lifecycle browser proof" },
        },
      );
    }
  }
});

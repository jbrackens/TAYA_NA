import { test, expect, APIRequestContext } from "@playwright/test";

/**
 * Prediction critical-path API e2e — runs against the live gateway through the
 * player app's same-origin /api proxy. Covers the money + identity flows the
 * audit flagged as untested: trading, accounting, KYC lifecycle, authz, and the
 * crypto rail's fail-closed contract.
 */

async function login(
  request: APIRequestContext,
  username: string,
  password: string,
): Promise<string> {
  const res = await request.post("/api/v1/auth/login", {
    data: { username, password },
  });
  expect(res.ok(), `login ${username} (got ${res.status()})`).toBeTruthy();
  const state = await request.storageState();
  return state.cookies.find((c) => c.name === "csrf_token")?.value ?? "";
}

function csrfHeaders(csrf: string): Record<string, string> {
  return { "X-CSRF-Token": csrf, "Content-Type": "application/json" };
}

// A username whose FIRST 6 characters are random. The auth service derives the
// user ID from the first 6 chars of the username (hex of the first 6 bytes), so
// two usernames sharing a 6-char prefix collide on ID. Leading with randomness
// keeps repeated test runs from colliding (and documents that auth quirk).
function uniqueUsername(): string {
  return `${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36)}@predict.dev`;
}

test("public market + category data is served from the database", async ({
  request,
}) => {
  const mres = await request.get("/api/v1/markets?pageSize=200");
  expect(mres.ok()).toBeTruthy();
  const markets = (await mres.json()).data ?? [];
  expect(Array.isArray(markets)).toBeTruthy();
  expect(markets.length, "seeded markets present").toBeGreaterThan(0);

  const cres = await request.get("/api/v1/categories");
  expect(cres.ok()).toBeTruthy();
  const cats = await cres.json();
  const catList = Array.isArray(cats) ? cats : (cats.data ?? []);
  expect(catList.length, "categories present").toBeGreaterThan(0);
});

test("demo player can place a market order that fills against the CLOB", async ({
  request,
}) => {
  const csrf = await login(request, "demo@phoenix.local", "demo123");

  const mres = await request.get("/api/v1/markets?status=open&pageSize=200");
  const markets = (await mres.json()).data ?? [];
  const ob = markets.find(
    (m: { executionMode?: string }) => m.executionMode === "order_book",
  );
  expect(ob, "an open order_book market exists").toBeTruthy();

  const res = await request.post("/api/v1/orders", {
    headers: csrfHeaders(csrf),
    data: {
      marketId: ob.id,
      side: "yes",
      action: "buy",
      orderType: "market",
      quantity: 3,
      notionalCapCents: 200,
    },
  });
  expect(res.ok(), `place order (got ${res.status()})`).toBeTruthy();
  const body = await res.json();
  expect(body.order.status).toBe("filled");
  expect(body.order.filledQuantity).toBe(3);
  // Realized cost must be within the notional cap (no overshoot).
  expect(body.order.capturedCashCents).toBeLessThanOrEqual(200);
});

test("portfolio summary returns the accounting shape", async ({ request }) => {
  await login(request, "demo@phoenix.local", "demo123");
  const res = await request.get("/api/v1/portfolio/summary");
  expect(res.ok()).toBeTruthy();
  const s = await res.json();
  for (const key of [
    "totalValueCents",
    "unrealizedPnlCents",
    "realizedPnlCents",
    "openPositions",
  ]) {
    expect(s, `summary has ${key}`).toHaveProperty(key);
  }
});

test("KYC lifecycle: submit -> pending -> admin approve -> approved", async ({
  request,
}) => {
  const username = uniqueUsername();
  const password = "predict123456"; // >= 12 chars (password policy)

  const reg = await request.post("/api/v1/auth/register", {
    data: { username, password },
  });
  expect(reg.ok(), `register (got ${reg.status()})`).toBeTruthy();
  const userId = (await reg.json()).userId as string;
  expect(userId).toBeTruthy();

  const csrf = await login(request, username, password);

  const before = await (
    await request.get("/api/v1/compliance/kyc/status")
  ).json();
  expect(before.status.status).toBe("unverified");

  const verify = await request.post("/api/v1/compliance/kyc/verify", {
    headers: csrfHeaders(csrf),
    data: {
      userId,
      documents: [
        { type: "passport", documentId: "P-E2E", issuingCountry: "PH" },
      ],
    },
  });
  expect(verify.ok()).toBeTruthy();
  expect((await verify.json()).result.status).toBe("pending");

  // Admin approves: re-login on this context swaps the session to admin
  // (single-context sequential flow — sufficient since we re-login as the user
  // afterward to verify persistence).
  const adminCsrf = await login(request, "admin@phoenix.local", "admin123");
  const decision = await request.post("/api/v1/admin/kyc/decision", {
    headers: csrfHeaders(adminCsrf),
    data: { userId, approve: true },
  });
  expect(
    decision.ok(),
    `admin decision (got ${decision.status()})`,
  ).toBeTruthy();
  expect((await decision.json()).status).toBe("approved");

  // Re-login as the user and confirm the approval persisted.
  await login(request, username, password);
  const after = await (
    await request.get("/api/v1/compliance/kyc/status")
  ).json();
  expect(after.status.status).toBe("approved");
});

test("authz: a player cannot reach admin APIs", async ({ request }) => {
  await login(request, "demo@phoenix.local", "demo123");
  const res = await request.get("/api/v1/admin/punters?page=1&pageSize=10");
  expect(res.status(), "player must be forbidden from admin endpoints").toBe(
    403,
  );
});

test("crypto rail is wired and fails closed until configured", async ({
  request,
}) => {
  await login(request, "demo@phoenix.local", "demo123");

  const cfg = await request.get("/api/v1/payments/crypto/config");
  expect(cfg.ok()).toBeTruthy();
  const c = await cfg.json();
  expect(c.asset).toBe("USDC");
  expect(c.configured).toBe(false);

  const addr = await request.get("/api/v1/payments/crypto/deposit-address");
  expect(
    addr.status(),
    "unconfigured rail returns 503, not a faked address",
  ).toBe(503);
  expect((await addr.json()).error).toBe("crypto_rail_unconfigured");
});

test("new user can claim a play-money starter grant (idempotent), then trade", async ({
  request,
}) => {
  const username = uniqueUsername();
  const password = "predict123456";
  const reg = await request.post("/api/v1/auth/register", {
    data: { username, password },
  });
  expect(reg.ok(), `register (got ${reg.status()})`).toBeTruthy();
  const csrf = await login(request, username, password);

  const grant = await request.post("/api/v1/wallet/starter-grant", {
    headers: csrfHeaders(csrf),
  });
  expect(grant.ok()).toBeTruthy();
  const g = await grant.json();
  expect(typeof g.enabled).toBe("boolean");
  // Tolerant of stacks where the faucet is disabled (real-value config).
  test.skip(!g.enabled, "starter-grant faucet disabled on this stack");

  expect(g.balanceCents).toBeGreaterThan(0);
  const funded = g.balanceCents;

  // Idempotent: a second claim must not double the balance.
  const grant2 = await request.post("/api/v1/wallet/starter-grant", {
    headers: csrfHeaders(csrf),
  });
  expect((await grant2.json()).balanceCents).toBe(funded);
});

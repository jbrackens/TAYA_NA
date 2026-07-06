import { test, expect, APIRequestContext } from "@playwright/test";

/**
 * Prediction critical-path API e2e — runs against the live gateway through the
 * player app's same-origin /api proxy. Covers launch identity, prediction
 * trading/accounting, authz, point grants, and the no-money route boundary.
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

function launchRegisterPayload(username: string, password: string) {
  return {
    username,
    password,
    terms_accepted: true,
    terms_version: "taptrade-launch-v1",
    launch_disclosure_accepted: true,
    launch_disclosure_version: "points-no-cashout-v1",
  };
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
      notionalCapPointsCents: 200,
    },
  });
  expect(res.ok(), `place order (got ${res.status()})`).toBeTruthy();
  const body = await res.json();
  expect(body.order.status).toBe("filled");
  expect(body.order.filledQuantity).toBe(3);
  // Realized cost must be within the notional cap (no overshoot).
  expect(body.order.unit).toBe("PTS");
  expect(body.order.capturedPointsCents).toBeLessThanOrEqual(200);
});

test("portfolio summary returns the accounting shape", async ({ request }) => {
  await login(request, "demo@phoenix.local", "demo123");
  const res = await request.get("/api/v1/portfolio/summary");
  expect(res.ok()).toBeTruthy();
  const s = await res.json();
  for (const key of [
    "totalValuePointsCents",
    "portfolioValuePointsCents",
    "investedPointsCents",
    "unrealizedPointsCents",
    "realizedPointsCents",
    "unit",
    "openPositions",
  ]) {
    expect(s, `summary has ${key}`).toHaveProperty(key);
  }
  for (const retired of [
    "totalValueCents",
    "unrealizedPnlCents",
    "realizedPnlCents",
  ]) {
    expect(s, `summary omits retired ${retired}`).not.toHaveProperty(retired);
  }
  expect(s.unit).toBe("PTS");
});

test("KYC lifecycle: submit -> pending -> admin approve -> approved", async ({
  request,
}) => {
  const username = uniqueUsername();
  const password = "predict123456"; // >= 12 chars (password policy)

  const reg = await request.post("/api/v1/auth/register", {
    data: launchRegisterPayload(username, password),
  });
  expect(reg.ok(), `register (got ${reg.status()})`).toBeTruthy();
  const regBody = await reg.json();
  expect(regBody.termsAccepted).toBe(true);
  expect(regBody.launchDisclosureAccepted).toBe(true);
  expect(regBody.launchDisclosureVersion).toBe("points-no-cashout-v1");
  const userId = regBody.userId as string;
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

test("launch money and crypto routes are absent", async ({ request }) => {
  await login(request, "demo@phoenix.local", "demo123");

  const status = await request.get("/api/v1/status");
  expect(status.ok()).toBeTruthy();
  const statusBody = await status.json();
  expect(statusBody.pointMode).toBe("non_redeemable_points");
  expect(statusBody.legacyMoneyRoutes).toBe("disabled");
  expect(statusBody.domains ?? []).not.toContain("payments");
  expect(statusBody.domains ?? []).not.toContain("crypto_payments");

  for (const path of [
    "/api/v1/payments/deposit",
    "/api/v1/payments/withdraw",
    "/api/v1/payments/crypto/config",
    "/api/v1/payments/crypto/deposit-address",
    "/api/v1/cashier/alpha/config",
  ]) {
    const res = await request.get(path);
    expect(res.status(), `${path} should be absent`).toBe(404);
  }
});

test("new user can claim a gameplay-point starter grant (idempotent), then trade", async ({
  request,
}) => {
  const username = uniqueUsername();
  const password = "predict123456";
  const reg = await request.post("/api/v1/auth/register", {
    data: launchRegisterPayload(username, password),
  });
  expect(reg.ok(), `register (got ${reg.status()})`).toBeTruthy();
  const regBody = await reg.json();
  const userId = regBody.userId as string;
  expect(userId).toBeTruthy();
  const csrf = await login(request, username, password);

  const grant = await request.post("/api/v1/wallet/starter-grant", {
    headers: csrfHeaders(csrf),
  });
  expect(grant.ok()).toBeTruthy();
  const g = await grant.json();
  expect(typeof g.enabled).toBe("boolean");
  // Tolerant of stacks where the faucet is disabled (real-value config).
  test.skip(!g.enabled, "starter-grant faucet disabled on this stack");

  expect(g.unit).toBe("PTS");
  expect(g.balancePointsCents).toBeGreaterThan(0);
  expect(g).not.toHaveProperty("grantCents");
  expect(g).not.toHaveProperty("balanceCents");
  const funded = g.balancePointsCents;

  // Idempotent: a second claim must not double the balance.
  const grant2 = await request.post("/api/v1/wallet/starter-grant", {
    headers: csrfHeaders(csrf),
  });
  const g2 = await grant2.json();
  expect(g2.balancePointsCents).toBe(funded);
  expect(g2).not.toHaveProperty("balanceCents");

  const mres = await request.get("/api/v1/markets?status=open&pageSize=200");
  expect(mres.ok()).toBeTruthy();
  const markets = (await mres.json()).data ?? [];
  const ob = markets.find(
    (m: { executionMode?: string }) => m.executionMode === "order_book",
  );
  expect(ob, "an open order_book market exists").toBeTruthy();

  const order = await request.post("/api/v1/orders", {
    headers: csrfHeaders(csrf),
    data: {
      marketId: ob.id,
      side: "yes",
      action: "buy",
      orderType: "market",
      quantity: 1,
      notionalCapPointsCents: 100,
    },
  });
  expect(order.ok(), `place order (got ${order.status()})`).toBeTruthy();
  const orderBody = await order.json();
  expect(orderBody.order.status).toBe("filled");
  expect(orderBody.order.unit).toBe("PTS");
  expect(orderBody.order.filledQuantity).toBe(1);
  expect(orderBody.order.capturedPointsCents).toBeLessThanOrEqual(100);
  expect(orderBody.order).not.toHaveProperty("capturedCashCents");

  const noOrder = await request.post("/api/v1/orders", {
    headers: csrfHeaders(csrf),
    data: {
      marketId: ob.id,
      side: "no",
      action: "buy",
      orderType: "market",
      quantity: 1,
      notionalCapPointsCents: 100,
    },
  });
  expect(noOrder.ok(), `place NO order (got ${noOrder.status()})`).toBeTruthy();
  const noOrderBody = await noOrder.json();
  expect(noOrderBody.order.status).toBe("filled");
  expect(noOrderBody.order.unit).toBe("PTS");
  expect(noOrderBody.order.filledQuantity).toBe(1);
  expect(noOrderBody.order.capturedPointsCents).toBeLessThanOrEqual(100);
  expect(noOrderBody.order).not.toHaveProperty("capturedCashCents");

  const ledger = await request.get(`/api/v1/wallet/${userId}/ledger?limit=20`);
  expect(ledger.ok(), `wallet ledger (got ${ledger.status()})`).toBeTruthy();
  const ledgerBody = await ledger.json();
  expect(ledgerBody.userId).toBe(userId);
  expect(Array.isArray(ledgerBody.items)).toBeTruthy();
  expect(
    ledgerBody.items.some(
      (entry: { idempotencyKey?: string }) =>
        entry.idempotencyKey === `starter_grant:${userId}`,
    ),
    "starter grant ledger entry present",
  ).toBeTruthy();
  expect(
    ledgerBody.items.some((entry: { idempotencyKey?: string }) =>
      (entry.idempotencyKey ?? "").startsWith("prediction_fill:"),
    ),
    "prediction fill ledger entry present",
  ).toBeTruthy();
  const fillCount = ledgerBody.items.filter(
    (entry: { idempotencyKey?: string }) =>
      (entry.idempotencyKey ?? "").startsWith("prediction_fill:"),
  ).length;
  expect(
    fillCount,
    "YES and NO fill ledger entries present",
  ).toBeGreaterThanOrEqual(2);
  for (const entry of ledgerBody.items as Array<Record<string, unknown>>) {
    expect(entry.unit).toBe("PTS");
    expect(entry).toHaveProperty("amountPointsCents");
    expect(entry).toHaveProperty("balancePointsCents");
    expect(entry).not.toHaveProperty("amountCents");
    expect(entry).not.toHaveProperty("balanceCents");
  }

  const missions = await request.get("/api/v1/wallet/missions");
  expect(missions.ok(), `missions (got ${missions.status()})`).toBeTruthy();
  const missionsBody = await missions.json();
  const firstPrediction = (missionsBody.items ?? []).find(
    (mission: { id?: string }) => mission.id === "first_prediction_order",
  );
  expect(firstPrediction, "first prediction mission exists").toBeTruthy();
  expect(firstPrediction.unit).toBe("PTS");
  expect(firstPrediction.completed).toBe(true);
  test.skip(
    !firstPrediction.enabled,
    "first-prediction mission reward disabled on this stack",
  );

  const missionClaim = await request.post("/api/v1/wallet/missions/claim", {
    headers: csrfHeaders(csrf),
    data: { missionId: "first_prediction_order" },
  });
  expect(
    missionClaim.ok(),
    `claim first-prediction mission (got ${missionClaim.status()})`,
  ).toBeTruthy();
  const claimBody = await missionClaim.json();
  expect(claimBody.unit).toBe("PTS");
  expect(claimBody.claimPointsCents).toBeGreaterThan(0);
  expect(claimBody.balancePointsCents).toBeGreaterThan(0);
  expect(claimBody).not.toHaveProperty("claimCents");
  expect(claimBody).not.toHaveProperty("balanceCents");

  const rewardLedger = await request.get(
    `/api/v1/wallet/${userId}/ledger?limit=20`,
  );
  expect(
    rewardLedger.ok(),
    `reward ledger (got ${rewardLedger.status()})`,
  ).toBeTruthy();
  const rewardLedgerBody = await rewardLedger.json();
  expect(
    rewardLedgerBody.items.some(
      (entry: { idempotencyKey?: string; reason?: string }) =>
        entry.reason === "mission_reward" &&
        entry.idempotencyKey ===
          `mission_reward:${userId}:first_prediction_order`,
    ),
    "first-prediction mission reward ledger entry present",
  ).toBeTruthy();

  const comment = await request.post(
    `/api/v1/social/markets/${ob.id}/comments`,
    {
      headers: csrfHeaders(csrf),
      data: { body: "Launch API proof: points-only prediction path works." },
    },
  );
  expect(comment.ok(), `create comment (got ${comment.status()})`).toBeTruthy();
  const commentBody = await comment.json();
  expect(commentBody.comment.marketId).toBe(ob.id);
  expect(commentBody.comment.userId).toBe(userId);
  expect(commentBody.comment.body).toContain("points-only");

  const follow = await request.post("/api/v1/social/users/u-1/follow", {
    headers: csrfHeaders(csrf),
  });
  expect(follow.ok(), `follow user (got ${follow.status()})`).toBeTruthy();
  const followBody = await follow.json();
  expect(followBody.profile.userId).toBe("u-1");
  expect(followBody.profile.viewerFollowing).toBe(true);

  const userActivity = await request.get(
    `/api/v1/social/users/${userId}/activity?limit=20`,
  );
  expect(userActivity.ok()).toBeTruthy();
  const userActivityBody = await userActivity.json();
  const activityTypes = (userActivityBody.items ?? []).map(
    (item: { type?: string }) => item.type,
  );
  expect(activityTypes).toContain("comment");
  expect(activityTypes).toContain("follow");
  expect(activityTypes).toContain("trade");

  const boards = await request.get("/api/v1/leaderboards");
  expect(boards.ok(), `leaderboards (got ${boards.status()})`).toBeTruthy();
  const boardsBody = await boards.json();
  const board = (boardsBody.items ?? []).find(
    (item: { id?: string; unit?: string }) => item.unit === "PTS" && item.id,
  );
  expect(board, "PTS leaderboard board exists").toBeTruthy();

  const entries = await request.get(
    `/api/v1/leaderboards/${encodeURIComponent(board.id)}/entries?limit=10`,
  );
  expect(
    entries.ok(),
    `leaderboard entries (got ${entries.status()})`,
  ).toBeTruthy();
  const entriesBody = await entries.json();
  expect(Array.isArray(entriesBody.items)).toBeTruthy();
});

test("admin can close and resolve a traded market, crediting the user's point ledger", async ({
  request,
}) => {
  const username = uniqueUsername();
  const password = "predict123456";
  const reg = await request.post("/api/v1/auth/register", {
    data: launchRegisterPayload(username, password),
  });
  expect(reg.ok(), `register (got ${reg.status()})`).toBeTruthy();
  const userId = (await reg.json()).userId as string;
  expect(userId).toBeTruthy();

  const csrf = await login(request, username, password);
  const grant = await request.post("/api/v1/wallet/starter-grant", {
    headers: csrfHeaders(csrf),
  });
  expect(grant.ok(), `starter grant (got ${grant.status()})`).toBeTruthy();
  const grantBody = await grant.json();
  test.skip(!grantBody.enabled, "starter-grant faucet disabled on this stack");

  const marketsRes = await request.get(
    "/api/v1/markets?status=open&pageSize=200",
  );
  expect(marketsRes.ok(), `markets (got ${marketsRes.status()})`).toBeTruthy();
  const markets = (await marketsRes.json()).data ?? [];
  const market = markets.find(
    (item: { executionMode?: string }) => item.executionMode === "order_book",
  );
  expect(market, "an open order_book market exists").toBeTruthy();

  const order = await request.post("/api/v1/orders", {
    headers: csrfHeaders(csrf),
    data: {
      marketId: market.id,
      side: "yes",
      action: "buy",
      orderType: "market",
      quantity: 1,
      notionalCapPointsCents: 100,
    },
  });
  expect(order.ok(), `place order (got ${order.status()})`).toBeTruthy();
  const orderBody = await order.json();
  expect(orderBody.order.status).toBe("filled");
  expect(orderBody.order.unit).toBe("PTS");

  const adminCsrf = await login(request, "admin@phoenix.local", "admin123");
  const close = await request.post(
    `/api/v1/admin/markets/${market.id}/lifecycle/close`,
    {
      headers: csrfHeaders(adminCsrf),
      data: { reason: "Loop 355 API proof admin close before settlement" },
    },
  );
  expect(close.ok(), `admin close (got ${close.status()})`).toBeTruthy();
  const closeBody = await close.json();
  expect(closeBody.status).toBe("closed");
  expect(closeBody.taptradeLifecycle.stage).toBe("closed");

  const settle = await request.post(`/api/v1/admin/settlements/${market.id}`, {
    headers: csrfHeaders(adminCsrf),
    data: {
      result: "yes",
      attestationSource: "admin-manual",
      reason: "Loop 355 API proof YES resolution",
    },
  });
  expect(settle.ok(), `admin settle (got ${settle.status()})`).toBeTruthy();
  const settleBody = await settle.json();
  expect(settleBody.unit).toBe("PTS");
  expect(settleBody.settlement.result).toBe("yes");
  expect(settleBody.settlement.marketId).toBe(market.id);
  expect(settleBody.taptradeLifecycle.stage).toBe("settled");
  expect(settleBody.totalSettlementPointsCents).toBeGreaterThan(0);
  expect(Array.isArray(settleBody.pointDisbursements)).toBeTruthy();
  const userDisbursement = settleBody.pointDisbursements.find(
    (entry: {
      userId?: string;
      settlementPointsCents?: number;
      unit?: string;
    }) => entry.userId === userId,
  );
  expect(userDisbursement, "user settlement disbursement present").toBeTruthy();
  expect(userDisbursement.unit).toBe("PTS");
  expect(userDisbursement.settlementPointsCents).toBeGreaterThan(0);
  for (const retired of [
    "payouts",
    "payoutCents",
    "totalPayoutCents",
    "currency",
  ]) {
    expect(
      settleBody,
      `settlement omits retired ${retired}`,
    ).not.toHaveProperty(retired);
  }

  const recompute = await request.post(
    "/api/v1/admin/leaderboards/pnl_weekly/recompute",
    { headers: csrfHeaders(adminCsrf) },
  );
  expect(
    recompute.ok(),
    `admin leaderboard recompute (got ${recompute.status()})`,
  ).toBeTruthy();
  const recomputeBody = await recompute.json();
  expect(recomputeBody.status).toBe("recomputed");
  const weeklyRecompute = (recomputeBody.items ?? []).find(
    (item: { boardId?: string }) => item.boardId === "pnl_weekly",
  );
  expect(weeklyRecompute, "weekly leaderboard recomputed").toBeTruthy();
  expect(weeklyRecompute.rows).toBeGreaterThan(0);

  const audit = await request.get(
    `/api/v1/admin/markets/${market.id}/lifecycle`,
  );
  expect(audit.ok(), `lifecycle audit (got ${audit.status()})`).toBeTruthy();
  const auditBody = await audit.json();
  const lifecycleEvents = (auditBody.data ?? []).map(
    (entry: {
      eventType?: string;
      taptradeLifecycle?: { stage?: string };
    }) => ({
      eventType: entry.eventType,
      stage: entry.taptradeLifecycle?.stage,
    }),
  );
  expect(lifecycleEvents).toContainEqual(
    expect.objectContaining({ eventType: "closed", stage: "closed" }),
  );
  expect(lifecycleEvents).toContainEqual(
    expect.objectContaining({ eventType: "settled", stage: "settled" }),
  );

  await login(request, username, password);
  const ledger = await request.get(`/api/v1/wallet/${userId}/ledger?limit=50`);
  expect(ledger.ok(), `wallet ledger (got ${ledger.status()})`).toBeTruthy();
  const ledgerBody = await ledger.json();
  const settlementCredit = (ledgerBody.items ?? []).find(
    (entry: { idempotencyKey?: string; reason?: string }) =>
      (entry.idempotencyKey ?? "").startsWith(
        `prediction_payout:${market.id}:`,
      ) && (entry.reason ?? "").startsWith("prediction settlement:"),
  );
  expect(settlementCredit, "settlement ledger credit present").toBeTruthy();
  expect(settlementCredit.unit).toBe("PTS");
  expect(settlementCredit.amountPointsCents).toBe(
    userDisbursement.settlementPointsCents,
  );
  expect(settlementCredit).not.toHaveProperty("amountCents");
  expect(settlementCredit).not.toHaveProperty("balanceCents");

  const standings = await request.get("/api/v1/me/leaderboards");
  expect(
    standings.ok(),
    `my leaderboards (got ${standings.status()})`,
  ).toBeTruthy();
  const standingsBody = await standings.json();
  expect(standingsBody.userId).toBe(userId);
  const myWeekly = (standingsBody.items ?? []).find(
    (entry: { boardId?: string; userId?: string; unit?: string }) =>
      entry.boardId === "pnl_weekly" && entry.userId === userId,
  );
  expect(myWeekly, "settled user appears on weekly leaderboard").toBeTruthy();

  const weeklyEntries = await request.get(
    "/api/v1/leaderboards/pnl_weekly/entries?limit=50",
  );
  expect(
    weeklyEntries.ok(),
    `weekly leaderboard entries (got ${weeklyEntries.status()})`,
  ).toBeTruthy();
  const weeklyEntriesBody = await weeklyEntries.json();
  expect(
    (weeklyEntriesBody.items ?? []).some(
      (entry: { boardId?: string; userId?: string }) =>
        entry.boardId === "pnl_weekly" && entry.userId === userId,
    ),
    "weekly leaderboard entries include the settled user",
  ).toBeTruthy();

  const history = await request.get(
    "/api/v1/portfolio/history?page=1&pageSize=20",
  );
  expect(
    history.ok(),
    `portfolio history (got ${history.status()})`,
  ).toBeTruthy();
  const historyBody = await history.json();
  expect(
    (historyBody.data ?? []).some(
      (entry: {
        marketId?: string;
        settlementPointsCents?: number;
        unit?: string;
      }) =>
        entry.marketId === market.id &&
        entry.unit === "PTS" &&
        entry.settlementPointsCents === userDisbursement.settlementPointsCents,
    ),
    "settled portfolio history row present",
  ).toBeTruthy();
});

test("dual-admin challenge resolution reviews disputes before point settlement", async ({
  request,
}) => {
  const username = "demo@phoenix.local";
  const password = "demo123";
  const userId = "u-1";
  const userCsrf = await login(request, username, password);

  const marketsRes = await request.get(
    "/api/v1/markets?status=open&pageSize=200",
  );
  expect(marketsRes.ok(), `markets (got ${marketsRes.status()})`).toBeTruthy();
  const markets = (await marketsRes.json()).data ?? [];
  const market =
    markets.find(
      (item: { executionMode?: string; ticker?: string }) =>
        item.executionMode === "order_book" &&
        ["VAL-MASTERS-FINAL", "FED-CUT-MAY26", "FED-HOLD-MAY26"].includes(
          item.ticker ?? "",
        ),
    ) ??
    markets.find(
      (item: { executionMode?: string; ticker?: string }) =>
        item.executionMode === "order_book" &&
        !(item.ticker ?? "").startsWith("IMP-"),
    );
  expect(market, "an open order_book market exists").toBeTruthy();

  const order = await request.post("/api/v1/orders", {
    headers: csrfHeaders(userCsrf),
    data: {
      marketId: market.id,
      side: "yes",
      action: "buy",
      orderType: "market",
      quantity: 1,
      notionalCapPointsCents: 100,
    },
  });
  expect(order.ok(), `place order (got ${order.status()})`).toBeTruthy();
  const orderBody = await order.json();
  expect(orderBody.order.status).toBe("filled");
  expect(orderBody.order.unit).toBe("PTS");

  const proposingAdminCsrf = await login(
    request,
    "admin@phoenix.local",
    "admin123",
  );
  const close = await request.post(
    `/api/v1/admin/markets/${market.id}/lifecycle/close`,
    {
      headers: csrfHeaders(proposingAdminCsrf),
      data: { reason: "Loop 357 dual-admin proof close" },
    },
  );
  expect(close.ok(), `admin close (got ${close.status()})`).toBeTruthy();
  expect((await close.json()).taptradeLifecycle.stage).toBe("closed");

  const propose = await request.post(
    `/api/v1/admin/markets/${market.id}/propose?windowHours=0`,
    {
      headers: csrfHeaders(proposingAdminCsrf),
      data: {
        result: "yes",
        attestationSource: "admin-manual",
        reason: "Loop 357 dual-admin proposed resolution",
      },
    },
  );
  expect(propose.ok(), `admin propose (got ${propose.status()})`).toBeTruthy();
  const proposal = await propose.json();
  expect(proposal.status).toBe("proposed");
  expect(proposal.marketId).toBe(market.id);
  expect(proposal.result).toBe("yes");
  expect(proposal.proposedBy).toBeTruthy();
  for (const retired of [
    "payouts",
    "payoutCents",
    "pnlCents",
    "totalPayoutCents",
    "currency",
  ]) {
    expect(proposal, `proposal omits retired ${retired}`).not.toHaveProperty(
      retired,
    );
  }

  const directSettle = await request.post(
    `/api/v1/admin/settlements/${market.id}`,
    {
      headers: csrfHeaders(proposingAdminCsrf),
      data: {
        result: "yes",
        attestationSource: "admin-manual",
        reason: "direct settle must not bypass challenge flow",
      },
    },
  );
  expect(
    directSettle.status(),
    `direct settle rejected body=${await directSettle.text()}`,
  ).toBe(400);

  const selfFinalize = await request.post(
    `/api/v1/admin/markets/${market.id}/finalize`,
    { headers: csrfHeaders(proposingAdminCsrf) },
  );
  expect(
    selfFinalize.status(),
    `same-admin finalize rejected body=${await selfFinalize.text()}`,
  ).toBe(400);

  const holderCsrf = await login(request, username, password);
  const dispute = await request.post("/api/v1/disputes", {
    headers: csrfHeaders(holderCsrf),
    data: {
      marketId: market.id,
      reason: "Loop 357 holder challenge before finalization",
    },
  });
  expect(dispute.ok(), `file dispute (got ${dispute.status()})`).toBeTruthy();
  const disputeBody = await dispute.json();
  expect(disputeBody.status).toBe("open");
  expect(disputeBody.marketId).toBe(market.id);
  expect(disputeBody.userId).toBe(userId);
  expect(disputeBody.unit).toBe("PTS");
  expect(disputeBody).toHaveProperty("bondPointsCents");
  expect(disputeBody).not.toHaveProperty("bondCents");

  const proposingAgainCsrf = await login(
    request,
    "admin@phoenix.local",
    "admin123",
  );
  const proposerReview = await request.post(
    `/api/v1/admin/disputes/${disputeBody.id}/resolve`,
    {
      headers: csrfHeaders(proposingAgainCsrf),
      data: {
        decision: "reject",
        note: "proposer must not review own proposed result",
      },
    },
  );
  expect(
    proposerReview.status(),
    `proposer dispute review rejected body=${await proposerReview.text()}`,
  ).toBe(400);

  const opsCsrf = await login(request, "ops@phoenix.local", "admin123");
  const queue = await request.get("/api/v1/admin/disputes?status=open");
  expect(
    queue.ok(),
    `admin dispute queue (got ${queue.status()})`,
  ).toBeTruthy();
  const queueBody = await queue.json();
  expect(
    (queueBody.items ?? []).some(
      (item: { id?: string; unit?: string; bondPointsCents?: number }) =>
        item.id === disputeBody.id &&
        item.unit === "PTS" &&
        typeof item.bondPointsCents === "number",
    ),
    "second admin can see open dispute with point-native bond",
  ).toBeTruthy();

  const resolve = await request.post(
    `/api/v1/admin/disputes/${disputeBody.id}/resolve`,
    {
      headers: csrfHeaders(opsCsrf),
      data: {
        decision: "reject",
        note: "challenge reviewed by second admin",
      },
    },
  );
  expect(
    resolve.ok(),
    `resolve dispute (got ${resolve.status()})`,
  ).toBeTruthy();
  const resolveBody = await resolve.json();
  expect(resolveBody.status).toBe("rejected");
  expect(resolveBody.resolvedBy).toBeTruthy();
  expect(resolveBody.resolvedBy).not.toBe(proposal.proposedBy);
  expect(resolveBody.unit).toBe("PTS");
  expect(resolveBody).toHaveProperty("bondPointsCents");
  expect(resolveBody).not.toHaveProperty("bondCents");

  const finalize = await request.post(
    `/api/v1/admin/markets/${market.id}/finalize`,
    { headers: csrfHeaders(opsCsrf) },
  );
  expect(finalize.ok(), `finalize (got ${finalize.status()})`).toBeTruthy();
  const finalizeBody = await finalize.json();
  expect(finalizeBody.unit).toBe("PTS");
  expect(finalizeBody.settlement.result).toBe("yes");
  expect(finalizeBody.taptradeLifecycle.stage).toBe("settled");
  expect(finalizeBody.totalSettlementPointsCents).toBeGreaterThan(0);
  expect(Array.isArray(finalizeBody.pointDisbursements)).toBeTruthy();
  const userDisbursement = finalizeBody.pointDisbursements.find(
    (entry: {
      userId?: string;
      settlementPointsCents?: number;
      unit?: string;
    }) => entry.userId === userId,
  );
  expect(
    userDisbursement,
    "holder settlement disbursement present",
  ).toBeTruthy();
  expect(userDisbursement.unit).toBe("PTS");
  expect(userDisbursement.settlementPointsCents).toBeGreaterThan(0);
  for (const retired of [
    "payouts",
    "payoutCents",
    "pnlCents",
    "totalPayoutCents",
    "payoutsTotal",
    "payoutsCompleted",
    "currency",
  ]) {
    expect(
      finalizeBody,
      `finalize omits retired ${retired}`,
    ).not.toHaveProperty(retired);
  }

  await login(request, username, password);
  const ledger = await request.get(`/api/v1/wallet/${userId}/ledger?limit=50`);
  expect(ledger.ok(), `wallet ledger (got ${ledger.status()})`).toBeTruthy();
  const ledgerBody = await ledger.json();
  const settlementCredit = (ledgerBody.items ?? []).find(
    (entry: { idempotencyKey?: string; reason?: string }) =>
      (entry.idempotencyKey ?? "").startsWith(
        `prediction_payout:${market.id}:`,
      ) && (entry.reason ?? "").startsWith("prediction settlement:"),
  );
  expect(
    settlementCredit,
    "dual-admin settlement ledger credit present",
  ).toBeTruthy();
  expect(settlementCredit.unit).toBe("PTS");
  expect(settlementCredit.amountPointsCents).toBe(
    userDisbursement.settlementPointsCents,
  );
  expect(settlementCredit).not.toHaveProperty("amountCents");
  expect(settlementCredit).not.toHaveProperty("balanceCents");
});

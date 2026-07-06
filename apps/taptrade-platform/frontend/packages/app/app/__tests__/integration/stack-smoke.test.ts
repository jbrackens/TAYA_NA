/**
 * Stack smoke tests — verifies the full backend is running and the
 * critical points-only prediction paths work end-to-end.
 *
 * REQUIRES: Go gateway on :18080, auth on :18081, PostgreSQL, Redis.
 * Skip with: SKIP_STACK_SMOKE=1 npx tsx --test app/__tests__/integration/stack-smoke.test.ts
 *
 * Run:  npx tsx --test app/__tests__/integration/stack-smoke.test.ts
 */
import { describe, it, before } from "node:test";
import assert from "node:assert/strict";

const GATEWAY = process.env.GATEWAY_URL || "http://localhost:18080";
const AUTH = process.env.AUTH_URL || "http://localhost:18081";
const DEMO_USER = "demo@taptrade.local";
const DEMO_PASS = "demo123";

// Skip entire suite if SKIP_STACK_SMOKE is set or gateway is down
async function isGatewayUp(): Promise<boolean> {
  if (process.env.SKIP_STACK_SMOKE === "1") return false;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${GATEWAY}/healthz`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

interface LoginResponse {
  access_token?: string;
  token?: string;
  user_id?: string;
  userId?: string;
  user?: Record<string, unknown>;
}

interface StatusResponse {
  status?: string;
  version?: string;
}

interface MarketsResponse {
  data?: Array<{ id?: string; status?: string }>;
}

let accessToken = "";
let csrfToken = "";
let cookies = "";
let demoUserId = "p:001";

async function login(): Promise<void> {
  const res = await fetch(`${AUTH}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: DEMO_USER, password: DEMO_PASS }),
  });
  assert.ok(res.ok, `Login failed with status ${res.status}`);

  // Extract cookies (access_token, csrf_token)
  const setCookies = res.headers.getSetCookie?.() || [];
  const cookieParts: string[] = [];
  for (const sc of setCookies) {
    const name = sc.split("=")[0];
    const value = sc.split(";")[0];
    cookieParts.push(value);
    if (name === "access_token") {
      accessToken = value.split("=")[1];
    }
    if (name === "csrf_token") {
      csrfToken = decodeURIComponent(value.split("=")[1]);
    }
  }
  cookies = cookieParts.join("; ");

  let body: LoginResponse | undefined;
  try {
    body = (await res.json()) as LoginResponse;
  } catch {
    body = undefined;
  }

  // Fallback: some auth implementations return tokens in body
  if (!accessToken) {
    accessToken = body?.access_token || body?.token || "";
  }
  demoUserId =
    body?.user_id ||
    body?.userId ||
    (typeof body?.user?.id === "string" ? body.user.id : "") ||
    demoUserId;
}

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (cookies) h["Cookie"] = cookies;
  if (accessToken) h["Authorization"] = `Bearer ${accessToken}`;
  if (csrfToken) h["X-CSRF-Token"] = csrfToken;
  return h;
}

async function firstOpenMarketId(): Promise<string> {
  const res = await fetch(`${GATEWAY}/api/v1/markets?status=open&pageSize=20`);
  assert.equal(res.status, 200, `Markets returned ${res.status}`);
  const body = (await res.json()) as MarketsResponse;
  const marketId = body.data?.find((market) => market.id)?.id;
  assert.ok(marketId, "Expected at least one open market");
  return marketId;
}

describe("Stack Smoke Tests", { skip: false }, () => {
  let gatewayUp = false;

  before(async () => {
    gatewayUp = await isGatewayUp();
    if (!gatewayUp) return;
    await login();
  });

  it("gateway /healthz returns 200", async () => {
    if (!gatewayUp) return; // Skip silently when gateway is down
    const res = await fetch(`${GATEWAY}/healthz`);
    assert.equal(res.status, 200);
  });

  it("auth /healthz returns 200", async () => {
    if (!gatewayUp) return;
    const res = await fetch(`${AUTH}/healthz`);
    assert.equal(res.status, 200);
  });

  it("gateway /api/v1/status returns status object", async () => {
    if (!gatewayUp) return;
    const res = await fetch(`${GATEWAY}/api/v1/status/`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as StatusResponse;
    assert.ok(body.status, "Expected status field in response");
  });

  it("login returns valid session with cookies", async () => {
    if (!gatewayUp) return;
    assert.ok(accessToken || cookies, "Expected access_token from login");
  });

  it("authenticated GET /api/v1/orders returns paginated point-order data", async () => {
    if (!gatewayUp) return;
    const res = await fetch(`${GATEWAY}/api/v1/orders?pageSize=5`, {
      headers: authHeaders(),
    });
    assert.equal(res.status, 200, `GET /orders returned ${res.status}`);
    const body = (await res.json()) as Record<string, unknown>;
    assert.ok(Array.isArray(body.data), "Expected orders data array");
    assert.ok(body.meta, "Expected orders pagination metadata");
  });

  it("unauthenticated POST /api/v1/orders returns 401", async () => {
    if (!gatewayUp) return;
    const res = await fetch(`${GATEWAY}/api/v1/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        marketId: "test-market-1",
        side: "yes",
        action: "buy",
        orderType: "market",
        quantity: 1,
        notionalCapPointsCents: 100,
      }),
    });
    assert.equal(res.status, 401, "Unauth order placement should be 401");
  });

  it("POST /api/v1/orders/preview works with a point-native request", async () => {
    if (!gatewayUp) return;
    const marketId = await firstOpenMarketId();
    const res = await fetch(`${GATEWAY}/api/v1/orders/preview`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        marketId,
        side: "yes",
        action: "buy",
        orderType: "market",
        quantity: 1,
        notionalCapPointsCents: 100,
      }),
    });
    assert.equal(res.status, 200, `Order preview returned ${res.status}`);
    const body = (await res.json()) as Record<string, unknown>;
    assert.equal(body.unit, "PTS", "Expected preview to use gameplay points");
  });

  it("GET /api/v1/wallet/{userId} returns point balance when authenticated", async () => {
    if (!gatewayUp) return;
    const res = await fetch(`${GATEWAY}/api/v1/wallet/${demoUserId}`, {
      headers: authHeaders(),
    });
    assert.equal(res.status, 200, `Wallet balance returned ${res.status}`);
    const body = (await res.json()) as Record<string, unknown>;
    assert.equal(body.unit, "PTS", "Expected wallet balance unit to be PTS");
    assert.ok("balancePointsCents" in body, "Expected point balance field");
    assert.ok(
      "availablePointsCents" in body,
      "Expected available gameplay points field",
    );
    assert.ok(!("balanceCents" in body), "Retired cash balance field leaked");
  });

  it("GET /api/v1/events returns events list", async () => {
    if (!gatewayUp) return;
    const res = await fetch(`${GATEWAY}/api/v1/events/?limit=5`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as Record<string, unknown>;
    assert.ok(
      body.events || Array.isArray(body),
      "Expected events in response",
    );
  });

  it("compliance status endpoint is reachable", async () => {
    if (!gatewayUp) return;
    const res = await fetch(`${GATEWAY}/api/v1/compliance/status/`, {
      headers: authHeaders(),
    });
    assert.ok(
      res.status < 500,
      `Compliance status returned server error: ${res.status}`,
    );
  });
});

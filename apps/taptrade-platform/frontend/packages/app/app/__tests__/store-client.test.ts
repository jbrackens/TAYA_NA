/**
 * Point Store client — wire mapping + checkout idempotency semantics.
 *
 * Backend contract: STORE_AND_PAYMENTS.md §7 (routes) + §2 (pack schema,
 * totalPoints computed never stored) + §4 (UNIQUE(user, idempotencyKey)
 * dedupe on checkout). fetch is mocked; the assertions pin the request
 * shapes the live gateway was verified to accept on 2026-07-12.
 *
 * Run: npx tsx --test app/__tests__/store-client.test.ts
 */
import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  confirmPurchase,
  createCheckout,
  getPacks,
  getPurchase,
  listPurchases,
  resolveCheckoutIdempotency,
  type PendingCheckoutKey,
} from "../lib/api/store-client";

interface FetchCall {
  url: string;
  method?: string;
  body?: string;
}

const calls: FetchCall[] = [];
let responseQueue: Array<{ status: number; body: unknown }> = [];

function fakeResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

globalThis.fetch = (async (
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> => {
  calls.push({
    url: String(input),
    method: init?.method,
    body: typeof init?.body === "string" ? init.body : undefined,
  });
  const next = responseQueue.shift();
  if (!next) throw new Error(`unexpected fetch: ${String(input)}`);
  return fakeResponse(next.status, next.body);
}) as typeof fetch;

beforeEach(() => {
  calls.length = 0;
  responseQueue = [];
});

describe("store-client wire mapping", () => {
  it("getPacks maps the catalogue, re-derives totals, and sorts by displayOrder", async () => {
    responseQueue.push({
      status: 200,
      body: {
        firstPurchase: true,
        unit: "PTS",
        packs: [
          {
            id: "pro",
            name: "Pro",
            priceUsdCents: 5000,
            basePoints: 5000,
            bonusPoints: 750,
            totalPoints: 5750,
            displayOrder: 4,
            badge: "Best Value",
            introOnly: false,
            unit: "PTS",
          },
          {
            id: "starter",
            name: "Starter",
            priceUsdCents: 500,
            basePoints: 500,
            bonusPoints: 0,
            // wire totalPoints deliberately absent — client must derive
            displayOrder: 1,
            introOnly: false,
            unit: "PTS",
          },
        ],
      },
    });

    const catalogue = await getPacks();
    assert.equal(calls.length, 1);
    assert.ok(calls[0].url.includes("/api/v1/store/packs"));
    assert.equal(catalogue.firstPurchase, true);
    assert.deepEqual(
      catalogue.packs.map((p) => p.id),
      ["starter", "pro"],
      "packs sort by displayOrder",
    );
    // Pack math invariant: total = base + bonus, always.
    for (const pack of catalogue.packs) {
      assert.equal(pack.totalPoints, pack.basePoints + pack.bonusPoints);
    }
    assert.equal(catalogue.packs[0].totalPoints, 500);
    assert.equal(catalogue.packs[1].totalPoints, 5750);
    assert.equal(catalogue.packs[1].badge, "Best Value");
    assert.equal(catalogue.packs[0].badge, undefined);
  });

  it("createCheckout POSTs only packId + idempotencyKey and maps the purchase", async () => {
    responseQueue.push({
      status: 201,
      body: {
        purchase: {
          id: "sp_abc",
          userId: "u-1",
          packId: "popular",
          status: "pending_payment",
          priceUsdCents: 2500,
          basePoints: 2500,
          bonusPoints: 250,
          totalPoints: 2750,
          provider: "demo",
          providerSessionId: "demo_cs_sp_abc",
          createdAt: "2026-07-12T00:00:00Z",
          unit: "PTS",
        },
        checkout: {
          providerSessionId: "demo_cs_sp_abc",
          checkoutToken: "demo_tok_sp_abc",
        },
      },
    });

    const result = await createCheckout("popular", "key-123");
    assert.equal(calls.length, 1);
    assert.ok(calls[0].url.includes("/api/v1/store/checkout"));
    assert.equal(calls[0].method, "POST");
    assert.deepEqual(JSON.parse(calls[0].body ?? "{}"), {
      packId: "popular",
      idempotencyKey: "key-123",
    });
    assert.equal(result.purchase.status, "pending_payment");
    assert.equal(result.purchase.totalPoints, 2750);
    assert.equal(result.checkout?.checkoutToken, "demo_tok_sp_abc");
  });

  it("getPurchase and listPurchases hit the purchases routes", async () => {
    responseQueue.push({
      status: 200,
      body: {
        purchase: {
          id: "sp_abc",
          status: "completed",
          basePoints: 500,
          bonusPoints: 0,
          priceUsdCents: 500,
          completedAt: "2026-07-12T00:00:10Z",
        },
      },
    });
    const purchase = await getPurchase("sp_abc");
    assert.ok(calls[0].url.includes("/api/v1/store/purchases/sp_abc"));
    assert.equal(purchase.status, "completed");
    assert.equal(purchase.totalPoints, 500);

    responseQueue.push({
      status: 200,
      body: { items: [{ id: "sp_abc", status: "completed" }], total: 1 },
    });
    const list = await listPurchases(10);
    assert.ok(calls[1].url.includes("/api/v1/store/purchases"));
    assert.ok(calls[1].url.includes("limit=10"));
    assert.equal(list.total, 1);
    assert.equal(list.items[0].id, "sp_abc");
  });

  it("confirmPurchase POSTs the demo outcome and maps alreadyFulfilled", async () => {
    responseQueue.push({
      status: 200,
      body: {
        purchase: {
          id: "sp_abc",
          status: "completed",
          basePoints: 500,
          bonusPoints: 0,
        },
        alreadyFulfilled: true,
      },
    });
    const result = await confirmPurchase("sp_abc", "success");
    assert.ok(calls[0].url.includes("/api/v1/store/purchases/sp_abc/confirm"));
    assert.equal(calls[0].method, "POST");
    assert.deepEqual(JSON.parse(calls[0].body ?? "{}"), {
      outcome: "success",
    });
    assert.equal(result.alreadyFulfilled, true);
    assert.equal(result.purchase.status, "completed");
  });
});

describe("checkout idempotency key reuse", () => {
  const mintSeq = () => {
    let n = 0;
    return () => `uuid-${++n}`;
  };

  it("mints a fresh key when nothing is pending", () => {
    const mint = mintSeq();
    const { key, pending } = resolveCheckoutIdempotency(null, "popular", mint);
    assert.equal(key, "uuid-1");
    assert.deepEqual(pending, { packId: "popular", key: "uuid-1" });
  });

  it("REUSES the pending key for a retry of the same unconfirmed pack", () => {
    const mint = mintSeq();
    const first = resolveCheckoutIdempotency(null, "popular", mint);
    const retry = resolveCheckoutIdempotency(first.pending, "popular", mint);
    assert.equal(retry.key, first.key, "same pack retry replays the same key");
  });

  it("a different pack gets a fresh key, never a stale replay", () => {
    const mint = mintSeq();
    const first = resolveCheckoutIdempotency(null, "popular", mint);
    const other = resolveCheckoutIdempotency(first.pending, "pro", mint);
    assert.notEqual(other.key, first.key);
    assert.equal(other.pending.packId, "pro");
  });

  it("clearing pending after purchase creation makes the next attempt a new order", () => {
    const mint = mintSeq();
    const first = resolveCheckoutIdempotency(null, "popular", mint);
    // Caller clears pending once the purchase row exists server-side.
    const cleared: PendingCheckoutKey | null = null;
    const next = resolveCheckoutIdempotency(cleared, "popular", mint);
    assert.notEqual(next.key, first.key);
  });
});

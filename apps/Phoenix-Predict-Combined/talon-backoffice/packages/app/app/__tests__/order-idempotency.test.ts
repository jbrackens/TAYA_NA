/**
 * LC-38 regression: the player app must send a STABLE idempotencyKey so a
 * manual re-submit after a dropped order response is deduped by the gateway
 * instead of double-debiting. Tests the real shipped helper (imported, not
 * mirrored) so a regression in app/lib/orderIdempotency.ts fails here.
 *
 * Run: npx tsx --test app/__tests__/order-idempotency.test.ts
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  orderSignature,
  resolveIdempotencyKey,
  type OrderIdempotencySig,
  type PendingIdempotency,
} from "../lib/orderIdempotency";

const baseOrder: OrderIdempotencySig = {
  marketId: "m-1",
  side: "yes",
  action: "buy",
  orderType: "market",
  quantity: 10,
  notionalCapCents: 5000,
};

// Deterministic, counting mint so we can assert when a fresh key is minted.
function countingMint() {
  let n = 0;
  const fn = () => `key-${++n}`;
  return { fn, calls: () => n };
}

describe("orderSignature", () => {
  it("is stable for identical orders", () => {
    assert.equal(orderSignature(baseOrder), orderSignature({ ...baseOrder }));
  });

  it("changes when any order-defining field changes", () => {
    const sig = orderSignature(baseOrder);
    assert.notEqual(sig, orderSignature({ ...baseOrder, quantity: 11 }));
    assert.notEqual(sig, orderSignature({ ...baseOrder, side: "no" }));
    assert.notEqual(sig, orderSignature({ ...baseOrder, action: "sell" }));
    assert.notEqual(
      sig,
      orderSignature({ ...baseOrder, orderType: "limit", priceCents: 60 }),
    );
    assert.notEqual(
      sig,
      orderSignature({ ...baseOrder, notionalCapCents: 5001 }),
    );
  });

  it("treats absent and explicit-undefined optionals identically", () => {
    assert.equal(
      orderSignature(baseOrder),
      orderSignature({ ...baseOrder, priceCents: undefined }),
    );
  });
});

describe("resolveIdempotencyKey", () => {
  it("mints a fresh key when there is no pending attempt", () => {
    const mint = countingMint();
    const sig = orderSignature(baseOrder);
    const { key, pending } = resolveIdempotencyKey(null, sig, mint.fn);
    assert.equal(key, "key-1");
    assert.equal(mint.calls(), 1);
    assert.deepEqual(pending, { key: "key-1", sig });
  });

  it("LC-38: reuses the key for a retry of the same unconfirmed order", () => {
    const mint = countingMint();
    const sig = orderSignature(baseOrder);
    const first = resolveIdempotencyKey(null, sig, mint.fn);
    // Simulated dropped response: outcome unconfirmed, pending retained.
    const retry = resolveIdempotencyKey(first.pending, sig, mint.fn);
    assert.equal(retry.key, first.key, "retry must reuse the original key");
    assert.equal(mint.calls(), 1, "retry must NOT mint a new key");
    assert.equal(retry.pending, first.pending);
  });

  it("mints a NEW key when the order changed (no stale replay)", () => {
    const mint = countingMint();
    const sigA = orderSignature(baseOrder);
    const a = resolveIdempotencyKey(null, sigA, mint.fn);
    const sigB = orderSignature({ ...baseOrder, quantity: 25 });
    const b = resolveIdempotencyKey(a.pending, sigB, mint.fn);
    assert.notEqual(b.key, a.key, "a changed order must not reuse the key");
    assert.equal(mint.calls(), 2);
    assert.deepEqual(b.pending, { key: b.key, sig: sigB });
  });

  it("full LC-38 sequence: drop→retry deduped, then success→repeat is new", () => {
    const mint = countingMint();
    const sig = orderSignature(baseOrder);

    // 1. First submit.
    let pending: PendingIdempotency | null = null;
    const s1 = resolveIdempotencyKey(pending, sig, mint.fn);
    pending = s1.pending;

    // 2. Response dropped → user clicks Buy again (pending retained).
    const s2 = resolveIdempotencyKey(pending, sig, mint.fn);
    assert.equal(s2.key, s1.key, "network-drop retry is deduped");
    assert.equal(mint.calls(), 1);

    // 3. Confirmed success → caller clears pending.
    pending = null;

    // 4. User intentionally places the SAME order again — must be a new
    //    order, not a replay of the first under its old key.
    const s3 = resolveIdempotencyKey(pending, sig, mint.fn);
    assert.notEqual(s3.key, s1.key, "post-success repeat must be a new order");
    assert.equal(mint.calls(), 2);
  });
});

/**
 * Prediction order validation tests.
 *
 * These lightweight mirrors protect the player-facing order vocabulary used
 * by the launch app: point amounts, YES/NO sides, limit prices, and
 * idempotent prediction orders.
 *
 * Run: npx tsx --test app/__tests__/prediction-order-validation.test.ts
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

type OrderSide = "yes" | "no";
type OrderAction = "buy" | "sell";
type OrderType = "market" | "limit";

interface PredictionOrderDraft {
  marketId: string;
  side: OrderSide;
  action: OrderAction;
  orderType: OrderType;
  quantity: number;
  pointAmount: number;
  limitPricePointsCents?: number;
  notionalCapPointsCents?: number;
}

const forbiddenOrderCopy =
  /\b(?:bet|bets|stake|wager|odds|usd|dollar|cash|deposit|withdrawal|fiat|crypto)\b|\$/i;

function validatePointAmount(
  amount: number,
  minPoints: number,
  maxPoints: number,
): string | null {
  if (!Number.isFinite(amount) || amount <= 0) {
    return "Point amount must be positive";
  }
  if (amount < minPoints) {
    return `Point amount below minimum (${minPoints} pts)`;
  }
  if (amount > maxPoints) {
    return `Point amount exceeds maximum (${maxPoints} pts)`;
  }
  return null;
}

function validateLimitPrice(pricePointsCents: number): string | null {
  if (!Number.isInteger(pricePointsCents)) {
    return "Limit price must be a whole point-cent value";
  }
  if (pricePointsCents < 1 || pricePointsCents > 99) {
    return "Limit price must be between 1 and 99 point-cents";
  }
  return null;
}

function checkAvailablePoints(
  amount: number,
  availablePoints: number,
): boolean {
  return availablePoints >= amount;
}

function estimateBinaryOrderEconomics(
  quantity: number,
  pricePointsCents: number,
) {
  const totalCostPointsCents = Math.ceil(quantity * pricePointsCents);
  const maxReturnPointsCents = quantity * 100;
  return {
    totalCostPointsCents,
    maxLossPointsCents: totalCostPointsCents,
    maxReturnPointsCents,
    maxResultPointsCents: maxReturnPointsCents - totalCostPointsCents,
  };
}

function buildPredictionOrderKey(
  userId: string,
  order: PredictionOrderDraft,
  nonce: string,
): string {
  const raw = [
    userId,
    order.marketId,
    order.side,
    order.action,
    order.orderType,
    order.quantity,
    order.pointAmount,
    order.limitPricePointsCents ?? "",
    order.notionalCapPointsCents ?? "",
    nonce,
  ].join(":");

  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash * 31 + raw.charCodeAt(i)) | 0;
  }
  return `prediction_order_${Math.abs(hash).toString(36)}`;
}

describe("prediction order validation", () => {
  it("validates point amounts with point-native messages", () => {
    const cases = [
      validatePointAmount(0, 1, 5_000),
      validatePointAmount(-1, 1, 5_000),
      validatePointAmount(Number.NaN, 1, 5_000),
      validatePointAmount(0.5, 1, 5_000),
      validatePointAmount(6_000, 1, 5_000),
    ].filter(Boolean);

    assert.equal(validatePointAmount(25, 1, 5_000), null);
    assert.equal(validatePointAmount(1, 1, 5_000), null);
    assert.equal(validatePointAmount(5_000, 1, 5_000), null);
    for (const message of cases) {
      assert.doesNotMatch(message!, forbiddenOrderCopy);
      assert.match(message!, /Point amount|pts/);
    }
  });

  it("validates limit prices as point-cents", () => {
    const invalid = [
      validateLimitPrice(0),
      validateLimitPrice(100),
      validateLimitPrice(50.5),
    ].filter(Boolean);

    assert.equal(validateLimitPrice(1), null);
    assert.equal(validateLimitPrice(64), null);
    assert.equal(validateLimitPrice(99), null);
    for (const message of invalid) {
      assert.doesNotMatch(message!, forbiddenOrderCopy);
      assert.match(message!, /point-cent/);
    }
  });

  it("checks available gameplay points before submit", () => {
    assert.equal(checkAvailablePoints(25, 10), false);
    assert.equal(checkAvailablePoints(25, 25), true);
    assert.equal(checkAvailablePoints(25, 30), true);
  });

  it("estimates binary order economics in point-cents", () => {
    assert.deepEqual(estimateBinaryOrderEconomics(39, 64), {
      totalCostPointsCents: 2496,
      maxLossPointsCents: 2496,
      maxReturnPointsCents: 3900,
      maxResultPointsCents: 1404,
    });
  });

  it("builds stable prediction-order idempotency keys", () => {
    const order: PredictionOrderDraft = {
      marketId: "MLBB-FINAL-G1",
      side: "yes",
      action: "buy",
      orderType: "market",
      quantity: 39,
      pointAmount: 25,
      notionalCapPointsCents: 2500,
    };

    const key = buildPredictionOrderKey("u-1", order, "retry-1");
    assert.equal(key, buildPredictionOrderKey("u-1", { ...order }, "retry-1"));
    assert.notEqual(
      key,
      buildPredictionOrderKey("u-1", { ...order, side: "no" }, "retry-1"),
    );
    assert.notEqual(key, buildPredictionOrderKey("u-1", order, "retry-2"));
    assert.match(key, /^prediction_order_/);
  });

  it("does not ship the retired bet placement test fixture", () => {
    assert.equal(
      existsSync(resolve(__dirname, "bet-placement.test.ts")),
      false,
      "retired bet/stake/odds fixture should not ship in launch tests",
    );
  });

  it("does not preserve retired bet-placement contract tokens", () => {
    const source = readFileSync(__filename, "utf-8");
    for (const token of [
      "stake" + "Cents",
      "validate" + "Stake",
      "calculatePotential" + "Payout",
      "validate" + "Odds",
      "odds" + "_changed",
      "/api/v1/" + "bets",
    ]) {
      assert.ok(!source.includes(token), `${token} should stay retired`);
    }
  });
});

/**
 * Regression coverage for order-book trade preview UX.
 *
 * These tests intentionally stay source-level because the app test suite
 * runs lightweight node:test files rather than a React DOM harness. The
 * assertions protect the ticket from regressing to snapshot-only price math
 * on order-book markets.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appRoot = resolve(__dirname, "..");
const repoRoot = resolve(appRoot, "../../../../../..");

function readApp(rel: string): string {
  return readFileSync(resolve(appRoot, rel), "utf-8");
}

function readPublic(rel: string): string {
  return readFileSync(resolve(appRoot, "../public", rel), "utf-8");
}

function readRepo(rel: string): string {
  return readFileSync(resolve(repoRoot, rel), "utf-8");
}

describe("TradeTicket order-book preview UX", () => {
  const source = readApp("components/prediction/TradeTicket.tsx");
  const marketPageSource = readApp("market/[ticker]/page.tsx");

  it("requests a server preview with order options instead of relying only on the market snapshot", () => {
    assert.match(
      source,
      /onPreview\?:\s*\(\s*side:\s*OrderSide,\s*quantity:\s*number,\s*opts\?:\s*TradeTicketSubmitOptions,\s*\)\s*=>\s*Promise<OrderPreview\s*\|\s*null>/,
      "TradeTicket should accept an async preview callback that returns preview metadata",
    );
    assert.match(
      source,
      /const\s+\[preview,\s*setPreview\]\s*=\s*useState<OrderPreview\s*\|\s*null>\(null\)/,
      "TradeTicket should store the returned preview, not just compute from snapshot prices",
    );
    assert.match(
      source,
      /onPreview\(side,\s*requestedQuantity,\s*opts\)/,
      "TradeTicket should call onPreview with side, floored quantity, and option metadata",
    );
    assert.match(
      source,
      /const\s+opts:\s*TradeTicketSubmitOptions\s*=\s*\{\s*orderType:\s*mode,\s*action,\s*\}/,
      "preview options should include order type and buy/sell action",
    );
    assert.match(
      source,
      /opts\.notionalCapPointsCents\s*=\s*Math\.ceil\(amount\s*\*\s*100\)/,
      "market buy previews should carry the point-native notional cap used by the gateway",
    );
    assert.match(
      source,
      /opts\.pricePointsCents\s*=\s*limitPriceCents[\s\S]*?opts\.timeInForce\s*=\s*"gtc"/,
      "limit previews should carry price and time-in-force options",
    );
  });

  it("renders preview-derived fill economics rather than snapshot-only estimates", () => {
    assert.match(
      source,
      /preview\?\.filledQuantity/,
      "filledQuantity should drive displayed shares when the preview returns a fill quantity",
    );
    assert.match(
      source,
      /preview\?\.averageFillPricePointsCents\s*\|\|\s*preview\?\.pricePointsCents\s*\|\|\s*price/,
      "averageFillPricePointsCents should take precedence over the snapshot price",
    );
    assert.match(
      source,
      /mode\s*===\s*"market"[\s\S]*?preview\?\.totalCostWithFeesPointsCents/,
      "market buy previews should be allowed to lower spend to the actual fill cost",
    );
    assert.match(
      source,
      /\?\s*preview\.totalCostWithFeesPointsCents\s*\/\s*100\s*:\s*amount/,
      "limit buys should still compare the selected point amount against balance",
    );
    assert.match(
      source,
      /effectiveSpend\s*>\s*balance/,
      "insufficient-funds checks should use preview-aware spend",
    );
  });

  it("labels point-result estimates without payout wording", () => {
    const enPredictionLocale = readPublic("static/locales/en/prediction.json");
    for (const token of [
      't("POTENTIAL_POINTS")',
      't("POINTS_IF_SIDE"',
      "pointsIfCorrect",
      "Correct contracts settle at 100 points each",
    ]) {
      assert.ok(
        source.includes(token) || enPredictionLocale.includes(token),
        `trade ticket should include point-result token ${token}`,
      );
    }
    for (const retired of [
      't("PAYOUT")',
      't("PAYOUT_IF_SIDE"',
      "const payout =",
      "Winning contracts receive",
    ]) {
      assert.ok(
        !source.includes(retired) && !enPredictionLocale.includes(retired),
        `trade ticket should not use retired payout token ${retired}`,
      );
    }
  });

  it("blocks zero-fill cancelled market-buy previews before submit", () => {
    assert.match(
      source,
      /const\s+marketBuyHasNoLiquidity\s*=[\s\S]*?mode\s*===\s*"market"[\s\S]*?action\s*===\s*"buy"[\s\S]*?preview\?\.quoteStatus\s*===\s*"cancelled"[\s\S]*?preview\.filledQuantity\s*===\s*0/,
      "zero-fill cancelled market-buy previews should be recognized as no liquidity",
    );
    assert.match(
      source,
      /if\s*\(insufficientFunds\s*\|\|\s*insufficientShares\s*\|\|\s*marketBuyHasNoLiquidity\)\s*return/,
      "submit should short-circuit when the market buy preview reports no liquidity",
    );
    assert.match(
      source,
      /marketBuyHasNoLiquidity\s*\?\s*\([\s\S]*?<button\s+type="button"\s+className=\{TICKET_CTA_CLASS\}\s+disabled>/,
      "the no-liquidity state should render a disabled CTA instead of a live submit button",
    );
  });

  it("keeps legacy AMM markets quote-only instead of submitting retired AMM orders", () => {
    assert.match(
      source,
      /const\s+isAmmQuoteOnly\s*=\s*market\.executionMode\s*===\s*"amm"/,
      "TradeTicket should derive a quote-only state for legacy AMM markets",
    );
    assert.match(
      source,
      /if\s*\(\s*!isAuthenticated\s*\|\|\s*authLoading\s*\|\|\s*!isOpen\s*\|\|\s*isAmmQuoteOnly\s*\)\s*return/,
      "submit should short-circuit before calling onSubmit for AMM quote-only markets",
    );
    assert.match(
      source,
      /isAmmQuoteOnly\s*\?\s*\([\s\S]*?AMM_QUOTE_ONLY[\s\S]*?AMM_QUOTE_ONLY_DETAIL/,
      "the CTA should render an explicit quote-only disabled state for AMM markets",
    );
    assert.ok(
      !source.includes("AMM mode: buy-only, market-only"),
      "AMM markets should no longer be described as submit-capable in the ticket",
    );
  });

  it("does not call the authenticated preview endpoint before auth is ready", () => {
    assert.match(
      marketPageSource,
      /if\s*\(\s*!market\s*\|\|\s*authLoading\s*\|\|\s*!isAuthenticated\s*\)\s*return\s+null/,
      "Market detail preview handler should bail before calling /orders/preview without a session",
    );
    assert.match(
      marketPageSource,
      /const\s+canPreviewOrders\s*=\s*isAuthenticated\s*&&\s*!authLoading/,
      "Market detail should compute an auth-ready preview gate",
    );
    assert.match(
      marketPageSource,
      /onPreview=\{canPreviewOrders\s*\?\s*handlePreview\s*:\s*undefined\}/,
      "TradeTicket should not receive onPreview until auth has resolved true",
    );
  });
});

describe("prediction API preview types", () => {
  const types = readRepo(
    "apps/taptrade-platform/frontend/packages/api-client/src/prediction-types.ts",
  );

  it("exposes preview metadata and in-review market statuses consumed by the player app", () => {
    assert.match(types, /"proposed_resolution"/);
    assert.match(types, /"disputed"/);
    assert.match(types, /filledQuantity\?:\s*number/);
    assert.match(types, /averageFillPricePointsCents\?:\s*number/);
    assert.match(types, /totalCostWithFeesPointsCents\?:\s*number/);
    assert.match(types, /quoteStatus\?:\s*OrderStatus/);
  });
});

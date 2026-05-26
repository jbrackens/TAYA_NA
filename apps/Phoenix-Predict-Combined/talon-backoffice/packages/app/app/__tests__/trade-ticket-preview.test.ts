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
      /opts\.notionalCapCents\s*=\s*Math\.ceil\(amount\s*\*\s*100\)/,
      "market buy previews should carry the notional cap used by the gateway",
    );
    assert.match(
      source,
      /opts\.priceCents\s*=\s*limitPriceCents[\s\S]*?opts\.timeInForce\s*=\s*"gtc"/,
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
      /preview\?\.averageFillPriceCents\s*\|\|\s*preview\?\.priceCents\s*\|\|\s*price/,
      "averageFillPriceCents should take precedence over the snapshot price",
    );
    assert.match(
      source,
      /preview\?\.totalCostWithFeesCents/,
      "totalCostWithFeesCents should be used for balance checks when present",
    );
    assert.match(
      source,
      /effectiveSpend\s*>\s*balance/,
      "insufficient-funds checks should use preview-aware spend",
    );
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
    "apps/Phoenix-Predict-Combined/talon-backoffice/packages/api-client/src/prediction-types.ts",
  );

  it("exposes preview metadata and in-review market statuses consumed by the player app", () => {
    assert.match(types, /"proposed_resolution"/);
    assert.match(types, /"disputed"/);
    assert.match(types, /filledQuantity\?:\s*number/);
    assert.match(types, /averageFillPriceCents\?:\s*number/);
    assert.match(types, /totalCostWithFeesCents\?:\s*number/);
    assert.match(types, /quoteStatus\?:\s*OrderStatus/);
  });
});

/**
 * Regression: ISSUE-018 — the sell input is labeled "Shares to sell"
 * but its value ran through the buy-side points math
 * (floor(amount / price)). Typing "1" to sell one share became 1 POINT
 * → 0 shares → silently disabled CTA labeled "Sell · 1 pts"; large
 * numbers executed as points. Selling your exact position required
 * doing shares × price arithmetic by hand.
 * Found by /qa on 2026-07-26
 * Report: .gstack/qa-reports/qa-report-localhost-3012-2026-07-26.md
 *
 * Source-level assertions, matching trade-ticket-preview.test.ts.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appRoot = resolve(__dirname, "..");

function readApp(rel: string): string {
  return readFileSync(resolve(appRoot, rel), "utf-8");
}

function readPublic(rel: string): string {
  return readFileSync(resolve(appRoot, "../public", rel), "utf-8");
}

describe("TradeTicket sell units (ISSUE-018)", () => {
  const source = readApp("components/prediction/TradeTicket.tsx");

  it("treats the sell input as a share count, not points", () => {
    assert.match(
      source,
      /if \(action === "sell"\) return Math\.max\(0, Math\.floor\(amount\)\)/,
      "sell-mode quantity must be the entered value itself",
    );
  });

  it("labels the sell CTA with shares and estimated proceeds", () => {
    assert.match(
      source,
      /SELL_SHARES_CTA/,
      "sell CTA must state the share count, never 'N pts' for a share count",
    );
  });

  it("prices the fill toast from the actual fill, not the raw input", () => {
    assert.match(
      source,
      /averageFillPricePoints \?\? price/,
      "full-fill toast must use the fill economics (amount is shares in sell mode)",
    );
  });

  it("ships the SELL_SHARES_CTA key in every locale", () => {
    for (const locale of ["en", "id", "ms", "tl", "zh-Hans", "zh-Hant"]) {
      const dict = JSON.parse(
        readPublic(`static/locales/${locale}/prediction.json`),
      ) as Record<string, string>;
      assert.ok(
        typeof dict.SELL_SHARES_CTA === "string" &&
          dict.SELL_SHARES_CTA.includes("{{quantity}}"),
        `locale ${locale} must define SELL_SHARES_CTA with {{quantity}}`,
      );
    }
  });
});

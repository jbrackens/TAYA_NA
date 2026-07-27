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

  // Updated for Ink & lime step 10: the CTA moved to NATIVE i18next
  // plural keys (_one/_other with {{count}}) — the old {{plural}} suffix
  // interpolation only worked for English. Locales whose CLDR rules have
  // no "one" form (id, ms, zh-Hans, zh-Hant) ship _other only.
  it("ships native SELL_SHARES_CTA plural keys in every locale", () => {
    const NEEDS_ONE = new Set(["en", "tl"]);
    for (const locale of ["en", "id", "ms", "tl", "zh-Hans", "zh-Hant"]) {
      const dict = JSON.parse(
        readPublic(`static/locales/${locale}/prediction.json`),
      ) as Record<string, string>;
      assert.ok(
        !("SELL_SHARES_CTA" in dict),
        `${locale}: the un-pluralized key must be retired`,
      );
      assert.ok(
        typeof dict.SELL_SHARES_CTA_other === "string" &&
          dict.SELL_SHARES_CTA_other.includes("{{count}}"),
        `${locale}: SELL_SHARES_CTA_other with {{count}} required`,
      );
      if (NEEDS_ONE.has(locale)) {
        assert.ok(
          typeof dict.SELL_SHARES_CTA_one === "string" &&
            dict.SELL_SHARES_CTA_one.includes("{{count}}"),
          `${locale}: SELL_SHARES_CTA_one required`,
        );
      }
    }
  });
});

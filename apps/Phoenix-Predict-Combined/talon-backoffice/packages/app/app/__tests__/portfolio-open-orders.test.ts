/**
 * Regression: ISSUE-001 — Portfolio Open orders showed cancelled/filled rows.
 * Found by /qa on 2026-05-13.
 * Report: .gstack/qa-reports/qa-report-localhost-3010-2026-05-13.md
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appRoot = resolve(__dirname, "..");

function read(rel: string): string {
  return readFileSync(resolve(appRoot, rel), "utf-8");
}

describe("portfolio open orders tab", () => {
  const source = read("portfolio/page.tsx");

  it("uses the active-order subset for both the count and table rows", () => {
    assert.match(
      source,
      /const\s+activeOrders\s*=\s*useMemo\(/,
      "portfolio should derive an activeOrders subset",
    );
    assert.match(
      source,
      /o\.status\s*===\s*"open"\s*\|\|\s*o\.status\s*===\s*"partial"/,
      "activeOrders should keep only open and partial orders",
    );
    assert.match(
      source,
      /orders:\s*activeOrders\.length/,
      "Open orders badge should count only active orders",
    );
    assert.match(
      source,
      /<OrdersTable\s+orders=\{activeOrders\}\s+marketsById=\{marketsById\}\s*\/>/,
      "Open orders table should render only active orders",
    );
    assert.doesNotMatch(
      source,
      /<OrdersTable\s+orders=\{orders\}/,
      "Open orders table must not receive the unfiltered order history",
    );
  });
});

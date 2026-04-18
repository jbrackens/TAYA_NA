/**
 * QA regression tests — 2026-04-18
 *
 * Locks in the fixes found during /qa on localhost after the
 * Pariflow dark-broadcast redesign shipped. Each test maps to a
 * specific bug found via gstack browse.
 *
 * Run: npx tsx --test app/__tests__/qa-regressions-2026-04-18.test.ts
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appRoot = resolve(__dirname, "..");

function read(rel: string): string {
  return readFileSync(resolve(appRoot, rel), "utf-8");
}

// ── Bug C: cashier must guard wallet fetches on empty userId ──────

describe("cashier page: userId guard", () => {
  const source = read("cashier/page.tsx");

  it('load effect no longer passes "" fallback for the initial fetches', () => {
    // Before: the mount useEffect did `getBalance(user?.id || "")` which
    // produced /wallet//ledger (double slash → 308 → 403) and
    // /wallets//transactions (404) when auth had not resolved yet.
    // We now extract userId once, bail if empty, and pass it through.
    const loadEffect =
      /useEffect\(\(\)\s*=>\s*\{[\s\S]*?const\s+load\s*=[\s\S]*?load\(\);[\s\S]*?\}/m.exec(
        source,
      );
    assert.ok(loadEffect, "cashier should have a load useEffect");
    assert.ok(
      /const\s+userId\s*=\s*user\?\.id/.test(loadEffect![0]),
      "load effect should extract userId from user?.id",
    );
    assert.ok(
      !/getBalance\(user\?\.id\s*\|\|\s*""\)/.test(loadEffect![0]),
      "load effect should not call getBalance with empty-string fallback",
    );
    assert.ok(
      !/getTransactions\(user\?\.id\s*\|\|\s*""/.test(loadEffect![0]),
      "load effect should not call getTransactions with empty-string fallback",
    );
  });

  it("effect bails out when userId is not yet loaded", () => {
    assert.ok(
      /if\s*\(\s*!userId\s*\)\s*return/.test(source),
      "cashier load effect should early-return when userId is empty",
    );
  });

  it("effect deps array includes user?.id so it re-runs on auth resolve", () => {
    assert.ok(
      /\[dispatch,\s*user\?\.id\]/.test(source),
      "cashier useEffect deps should include user?.id",
    );
  });
});

// ── Bug C: wallet-client drops broken sportsbook fallback ─────────

describe("wallet-client: no sportsbook fallbacks", () => {
  const source = read("lib/api/wallet-client.ts");

  it("getTransactions no longer falls back to /wallets/{id}/transactions", () => {
    // The plural /wallets/ sportsbook endpoint does not exist in the
    // Predict gateway — it always 404ed.
    assert.ok(
      !source.includes("/api/v1/wallets/${userId}/transactions"),
      "wallet-client should not reference the sportsbook transactions endpoint",
    );
  });

  it("getTransactions primary path is /wallet/{id}/ledger", () => {
    assert.ok(
      source.includes("/api/v1/wallet/${userId}/ledger"),
      "wallet-client should use /wallet/{id}/ledger as the primary path",
    );
  });
});

// ── Bug E: compliance cool-off check is a no-op stub ──────────────

describe("compliance-client: cool-off stub", () => {
  const source = read("lib/api/compliance-client.ts");

  it("getCoolOffStatus does not fetch /compliance/rg/restrictions", () => {
    // The endpoint does not exist in the Predict gateway. We stubbed
    // the function to return "inactive" without a network call until
    // we ship predict-native player protections.
    const m = /export async function getCoolOffStatus[\s\S]*?^\}/m.exec(source);
    assert.ok(m, "getCoolOffStatus should be defined");
    assert.ok(
      !m![0].includes("/api/v1/compliance/rg/restrictions"),
      "getCoolOffStatus body should not call /compliance/rg/restrictions",
    );
  });

  it("getCoolOffStatus returns inactive status", () => {
    const m = /export async function getCoolOffStatus[\s\S]*?^\}/m.exec(source);
    assert.ok(
      /status:\s*"inactive"/.test(m![0]),
      'stub should return status: "inactive"',
    );
  });
});

// ── Bug D: MarketCard <style> must not be inside <Link> ───────────

describe("MarketCard: style hoisted outside Link", () => {
  const source = read("components/prediction/MarketCard.tsx");

  it("does not render <style> as a child of <Link>", () => {
    // The bug: a <style>{...}</style> block was placed right after the
    // opening <Link> tag, so its text content was concatenated into
    // the link's accessible name. The fix hoists styles out via a
    // MarketCardStyles sibling component.
    const linkBlock = /<Link[\s\S]*?<\/Link>/.exec(source);
    assert.ok(linkBlock, "<Link> should exist in MarketCard");
    assert.ok(
      !linkBlock![0].includes("<style>"),
      "Link element should not contain a <style> tag — use MarketCardStyles sibling instead",
    );
  });

  it("exposes a MarketCardStyles sibling component", () => {
    assert.ok(
      /function\s+MarketCardStyles\s*\(/.test(source),
      "MarketCardStyles component should exist as the style container",
    );
    assert.ok(
      /<MarketCardStyles\s*\/>/.test(source),
      "MarketCard should render <MarketCardStyles /> as a sibling of <Link>",
    );
  });
});

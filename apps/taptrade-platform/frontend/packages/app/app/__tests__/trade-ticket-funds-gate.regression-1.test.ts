/**
 * Regression: ISSUE-013 — the insufficient-funds gate compared the
 * PREVIEW cost (the fillable slice of a market order) against the
 * balance, so an over-balance request on a thin book sailed past the
 * client gate and died server-side ("hold reservation: insufficient
 * funds") with the raw error clipped below the rail fold.
 * Found by /qa on 2026-07-26
 * Report: .gstack/qa-reports/qa-report-localhost-3012-2026-07-26.md
 *
 * Source-level assertions, matching trade-ticket-preview.test.ts: the
 * app suite runs lightweight node:test files, not a DOM harness.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appRoot = resolve(__dirname, "..");

function readApp(rel: string): string {
  return readFileSync(resolve(appRoot, rel), "utf-8");
}

describe("TradeTicket insufficient-funds gate (ISSUE-013)", () => {
  const source = readApp("components/prediction/TradeTicket.tsx");

  it("prices the full requested notional for buys", () => {
    assert.match(
      source,
      /requestedNotional\s*=\s*action === "buy" \? quantity \* price : 0/,
      "gate must compute the raw requested notional (quantity × price), mirroring the gateway's full-notional hold",
    );
  });

  it("gates on BOTH preview cost and requested notional", () => {
    assert.match(
      source,
      /effectiveSpend > balance \|\| requestedNotional > balance/,
      "insufficientFunds must never rely on the preview's fillable-slice cost alone",
    );
  });

  it("keeps the gate scoped to authenticated buys with a known balance", () => {
    const gate = source.slice(
      source.indexOf("const insufficientFunds"),
      source.indexOf("const insufficientShares"),
    );
    for (const clause of [
      'action === "buy"',
      "isAuthenticated",
      "hasKnownBalance",
    ]) {
      assert.ok(gate.includes(clause), `gate must retain clause: ${clause}`);
    }
  });
});

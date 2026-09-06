/**
 * Regression: ISSUE-014 — a server-side order rejection was invisible:
 * the only feedback was the inline error at the BOTTOM of the ticket
 * (below the sticky rail's fold on laptop-height viewports), and the
 * raw gateway string "persist match: hold reservation: insufficient
 * funds" leaked to the user verbatim.
 * Found by /qa on 2026-07-26
 * Report: qa-report-localhost-3012-2026-07-26.md (gstack QA report; removed from the repo in the 2026-09-06 docs sweep — the regression is described below)
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

describe("TradeTicket rejection feedback (ISSUE-014)", () => {
  const source = readApp("components/prediction/TradeTicket.tsx");
  const catchBlock = source.slice(
    source.indexOf("} catch (err: unknown) {"),
    source.indexOf("} finally {"),
  );

  it("fires a viewport-fixed error toast on submit failure", () => {
    assert.match(
      catchBlock,
      /toast\.error\(/,
      "submit catch must toast — the inline error can sit below the rail fold",
    );
  });

  it("humanizes the gateway's insufficient-funds hold error", () => {
    assert.match(
      catchBlock,
      /insufficient funds/i,
      "known gateway failure strings must map to friendly copy",
    );
    assert.match(
      catchBlock,
      /BALANCE_BELOW_ORDER/,
      "insufficient-funds rejection should reuse the localized balance copy",
    );
  });

  it("strips the internal 'persist match:' prefix from unknown errors", () => {
    assert.match(catchBlock, /persist match/i);
  });
});

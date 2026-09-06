/**
 * Regression: ISSUE-007 — the market header's close stamp mixed a
 * LOCAL-time month with a UTC day: 2026-07-31T23:59Z rendered as
 * "AUG 31, 23:59 UTC" in any UTC+n timezone, contradicting the
 * countdown ("Closes in 5d …") beside it.
 * Found by /qa on 2026-07-26
 * Report: qa-report-localhost-3012-2026-07-26.md (gstack QA report; removed from the repo in the 2026-09-06 docs sweep — the regression is described below)
 *
 * Source-level assertion (repo convention): every component of the
 * "… UTC"-labeled stamp must be derived in UTC.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appRoot = resolve(__dirname, "..");

describe("MarketHead close-date stamp (ISSUE-007)", () => {
  const source = readFileSync(
    resolve(appRoot, "components/prediction/MarketHead.tsx"),
    "utf-8",
  );

  it("formats the month in UTC to match the UTC day/time", () => {
    const fn = source.slice(
      source.indexOf("function formatCloseDate"),
      source.indexOf("const MARKET_HEAD_CLASS"),
    );
    assert.match(
      fn,
      /month:\s*"short",\s*timeZone:\s*"UTC"/,
      "month must carry timeZone:'UTC' — local month + UTC day contradicts the countdown at month boundaries",
    );
    assert.match(fn, /getUTCDate\(\)/);
  });

  it("demonstrates the boundary case that used to lie", () => {
    // The exact behavior the fix pins: for a UTC+8 viewer,
    // 2026-07-31T23:59Z is already August LOCALLY but must render July in
    // a UTC-labeled stamp.
    const d = new Date("2026-07-31T23:59:00Z");
    const utcMonth = d.toLocaleString("en-US", {
      month: "short",
      timeZone: "UTC",
    });
    assert.equal(utcMonth, "Jul");
    assert.equal(d.getUTCDate(), 31);
  });
});

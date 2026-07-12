import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  complementSeries,
  heroChartPath,
  movementFromSeries,
  sparklineFromValues,
  syntheticHeroValues,
} from "../components/prediction/utils/spark";

/**
 * 2026-07-12 integrity fix: movement claims must derive from real price
 * series. These tests pin the honesty rules — null on unusable data
 * (never an invented number), correct math on real data, and the
 * ticker-hash generator surviving ONLY as the flag-gated chart fill.
 */

describe("movementFromSeries — honest movement claims only", () => {
  it("computes delta and pct from range open to last sample", () => {
    const m = movementFromSeries([40, 42, 45, 50]);
    assert.ok(m);
    assert.equal(m.deltaPoints, 10);
    assert.equal(Math.round(m.pct), 25);
    assert.equal(m.up, true);
  });

  it("reports downward movement", () => {
    const m = movementFromSeries([50, 48, 45]);
    assert.ok(m);
    assert.equal(m.deltaPoints, -5);
    assert.equal(m.up, false);
  });

  it("returns null instead of inventing movement", () => {
    assert.equal(movementFromSeries(null), null);
    assert.equal(movementFromSeries(undefined), null);
    assert.equal(movementFromSeries([]), null);
    assert.equal(movementFromSeries([42]), null, "single sample");
    assert.equal(movementFromSeries([42, 42, 42]), null, "flat series");
    assert.equal(movementFromSeries([0, 5]), null, "zero open price");
  });

  it("is a pure function of the series — not of any ticker string", () => {
    // The retired deterministicDelta(ticker, price) fabricated movement
    // from the ticker; the replacement takes no ticker at all. Same
    // series → same movement, regardless of market identity.
    const a = movementFromSeries([30, 33]);
    const b = movementFromSeries([30, 33]);
    assert.deepEqual(a, b);
  });
});

describe("complementSeries — NO-side view of a YES series", () => {
  it("mirrors prices around 100 so NO movement is honest", () => {
    assert.deepEqual(complementSeries([40, 45, 60]), [60, 55, 40]);
    const yes = [40, 45];
    const no = complementSeries(yes);
    const yesMove = movementFromSeries(yes);
    const noMove = movementFromSeries(no);
    assert.ok(yesMove && noMove);
    assert.equal(noMove.deltaPoints, -yesMove.deltaPoints);
    assert.equal(noMove.up, !yesMove.up);
  });
});

describe("sparklineFromValues — real-series sparklines", () => {
  it("returns an SVG path for a real series", () => {
    const d = sparklineFromValues([40, 42, 41, 45, 50]);
    assert.ok(d.startsWith("M"));
    assert.ok(d.length > 10);
  });

  it("returns empty for series that cannot support a shape", () => {
    assert.equal(sparklineFromValues([]), "");
    assert.equal(sparklineFromValues([42]), "");
  });
});

describe("heroChartPath — real values in, geometry out", () => {
  it("builds line/fill/end from a series and pins the baseline to the open", () => {
    const chart = heroChartPath([40, 45, 50], 800, 220);
    assert.ok(chart.line.startsWith("M"));
    assert.ok(chart.fill.endsWith("Z"));
    assert.equal(chart.end.x, 800);
  });
});

describe("syntheticHeroValues — demo-only chart fill", () => {
  it("is deterministic per ticker and ends at the current price", () => {
    const a = syntheticHeroValues("IMP-ABC123", 42);
    const b = syntheticHeroValues("IMP-ABC123", 42);
    assert.deepEqual(a, b);
    assert.equal(a[a.length - 1], 42);
    assert.equal(a.length, 24);
  });
});

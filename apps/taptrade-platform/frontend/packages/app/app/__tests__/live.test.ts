/**
 * Live-ness — pure contract (app/components/prediction/live.ts).
 *
 * The motion doctrine's data layer: market events apply through a ts
 * watermark (stale events drop), point fields survive only when
 * well-typed, and tick direction/classes derive strictly from real
 * value changes — no change, no motion.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyMarketEvent,
  normalizeMarketUpdateFields,
  tickClass,
  tickDirection,
} from "../components/prediction/live";

describe("live market event contract", () => {
  it("keeps well-typed point fields and defaults the unit", () => {
    const fields = normalizeMarketUpdateFields({
      yesPricePoints: 51,
      noPricePoints: 49,
      volumePoints: 1_370,
    });
    assert.equal(fields.yesPricePoints, 51);
    assert.equal(fields.noPricePoints, 49);
    assert.equal(fields.volumePoints, 1_370);
    assert.equal(fields.unit, "PTS");
  });

  it("drops mis-typed point fields instead of merging garbage", () => {
    const fields = normalizeMarketUpdateFields({
      yesPricePoints: "51" as unknown as number,
      volumePoints: Number.NaN,
    });
    assert.ok(!("yesPricePoints" in fields));
    // NaN is a number by type — the normalizer passes it; consumers
    // (tickDirection) treat it as no-change. Documented behavior.
    assert.ok("volumePoints" in fields);
  });

  it("applies events through the ts watermark and rejects stale ones", () => {
    const first = applyMarketEvent(
      { ts: "2026-08-07T10:00:00Z", yesPricePoints: 50 },
      "",
    );
    assert.ok(first);
    assert.equal(first.ts, "2026-08-07T10:00:00Z");
    const stale = applyMarketEvent(
      { ts: "2026-08-07T09:59:59Z", yesPricePoints: 48 },
      first.ts,
    );
    assert.equal(stale, null);
    const newer = applyMarketEvent(
      { ts: "2026-08-07T10:00:01Z", yesPricePoints: 52 },
      first.ts,
    );
    assert.ok(newer);
    assert.equal(newer.fields.yesPricePoints, 52);
  });

  it("rejects malformed payloads and keeps the watermark on ts-less events", () => {
    assert.equal(applyMarketEvent(null, ""), null);
    assert.equal(applyMarketEvent("string", ""), null);
    const tsless = applyMarketEvent({ yesPricePoints: 44 }, "2026-08-07T10:00:00Z");
    assert.ok(tsless);
    assert.equal(tsless.ts, "2026-08-07T10:00:00Z");
  });

  it("tick direction exists only for real changes — no change, no motion", () => {
    assert.equal(tickDirection(50, 51), "up");
    assert.equal(tickDirection(51, 50), "down");
    assert.equal(tickDirection(50, 50), null);
    assert.equal(tickDirection(Number.NaN, 50), null);
    assert.equal(tickClass("up"), "price-tick-up");
    assert.equal(tickClass("down"), "price-tick-down");
    assert.equal(tickClass(null), "");
  });
});

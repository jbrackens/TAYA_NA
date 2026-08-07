/**
 * Moments IA — pure derivation contract (app/components/prediction/moments.ts).
 *
 * The IA groups discovery by the domain's event layer (markets share
 * eventId) and computes every time claim from the real closeAt:
 *  - clusters need 2+ members; singles stay flat, order preserved
 *  - the settles-soon lane admits only OPEN markets inside the window
 *  - moment headlines are the loudest member (volume, ties → close)
 *  - countdowns never render at/after the deadline (no fake urgency)
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { PredictionMarket } from "@taptrade-ui/api-client/src/prediction-types";
import {
  deriveMoments,
  formatCompactCountdown,
  groupFeedByEvent,
  settlingSoon,
} from "../components/prediction/moments";

const NOW = Date.parse("2026-08-07T12:00:00Z");
const hoursFromNow = (h: number) =>
  new Date(NOW + h * 3_600_000).toISOString();

function market(over: Partial<PredictionMarket>): PredictionMarket {
  return {
    id: "m-" + Math.abs(JSON.stringify(over).length * 7919 + (over.id?.length ?? 0)),
    eventId: "e-default",
    categoryId: "c1",
    categorySlug: "tech",
    categoryName: "Technology",
    ticker: "IMP-TEST",
    title: "Test market",
    status: "open",
    yesPricePoints: 50,
    noPricePoints: 50,
    volumePoints: 0,
    liquidityPoints: 100,
    openInterestPoints: 0,
    closeAt: hoursFromNow(100),
    ...over,
  } as PredictionMarket;
}

describe("Moments IA derivations", () => {
  it("clusters 2+ same-event markets and keeps singles flat, order preserved", () => {
    const groups = groupFeedByEvent([
      market({ id: "a", eventId: "e1" }),
      market({ id: "b", eventId: "e2" }),
      market({ id: "c", eventId: "e1" }),
      market({ id: "d", eventId: "e3" }),
    ]);
    assert.equal(groups.length, 3);
    assert.equal(groups[0].kind, "cluster");
    if (groups[0].kind === "cluster") {
      assert.deepEqual(
        groups[0].cluster.markets.map((m) => m.id),
        ["a", "c"],
      );
    }
    assert.equal(groups[1].kind, "single");
    assert.equal(groups[2].kind, "single");
  });

  it("derives cluster facts from members: majority category, earliest close", () => {
    const groups = groupFeedByEvent([
      market({ id: "a", eventId: "e1", categoryName: "Sports", closeAt: hoursFromNow(30) }),
      market({ id: "b", eventId: "e1", categoryName: "Sports", closeAt: hoursFromNow(18) }),
      market({ id: "c", eventId: "e1", categoryName: "General", closeAt: hoursFromNow(40) }),
    ]);
    assert.equal(groups[0].kind, "cluster");
    if (groups[0].kind === "cluster") {
      assert.equal(groups[0].cluster.categoryName, "Sports");
      assert.equal(groups[0].cluster.firstCloseMs, NOW + 18 * 3_600_000);
    }
  });

  it("settles-soon admits only open markets inside the window, soonest first", () => {
    const soon = settlingSoon(
      [
        market({ id: "late", closeAt: hoursFromNow(30) }),
        market({ id: "soon", closeAt: hoursFromNow(3) }),
        market({ id: "sooner", closeAt: hoursFromNow(1) }),
        market({ id: "closed", status: "settled", closeAt: hoursFromNow(2) }),
        market({ id: "past", closeAt: hoursFromNow(-1) }),
      ],
      NOW,
      24 * 3_600_000,
      3,
    );
    assert.deepEqual(
      soon.map((m) => m.id),
      ["sooner", "soon"],
    );
  });

  it("moment headline is the loudest member; secondary is next", () => {
    const moments = deriveMoments(
      [
        market({ id: "quiet", eventId: "e1", volumePoints: 10 }),
        market({ id: "loud", eventId: "e1", volumePoints: 500 }),
        market({ id: "mid", eventId: "e1", volumePoints: 40 }),
      ],
      4,
    );
    assert.equal(moments.length, 1);
    assert.equal(moments[0].headline.id, "loud");
    assert.equal(moments[0].secondary.id, "mid");
    assert.equal(moments[0].marketCount, 3);
  });

  it("orders moments by earliest close and respects the cap", () => {
    const moments = deriveMoments(
      [
        market({ id: "a1", eventId: "late", closeAt: hoursFromNow(50) }),
        market({ id: "a2", eventId: "late", closeAt: hoursFromNow(60) }),
        market({ id: "b1", eventId: "soon", closeAt: hoursFromNow(5) }),
        market({ id: "b2", eventId: "soon", closeAt: hoursFromNow(9) }),
      ],
      1,
    );
    assert.equal(moments.length, 1);
    assert.equal(moments[0].eventId, "soon");
  });

  it("countdowns are compact, honest, and never render past the deadline", () => {
    assert.equal(formatCompactCountdown(30_000), "<1m");
    assert.equal(formatCompactCountdown(43 * 60_000), "43m");
    assert.equal(formatCompactCountdown(18.4 * 3_600_000), "18h");
    assert.equal(formatCompactCountdown(72 * 3_600_000), "3d");
    assert.equal(formatCompactCountdown(0), null);
    assert.equal(formatCompactCountdown(-5), null);
    assert.equal(formatCompactCountdown(Number.NaN), null);
  });
});

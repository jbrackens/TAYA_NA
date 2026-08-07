/**
 * First-trade onboarding — pure contract (app/components/prediction/onboarding.ts).
 *
 *  - the teaching market is open, liquid, tradeable, nearest 50/50
 *  - drafts expire after a day and reject malformed/foreign shapes
 *  - the coach is exactly three beats plus the restored note
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { PredictionMarket } from "@taptrade-ui/api-client/src/prediction-types";
import {
  COACH_BEATS,
  DRAFT_TTL_MS,
  parseTradeDraft,
  pickTeachingMarket,
} from "../components/prediction/onboarding";

const NOW = Date.parse("2026-08-07T12:00:00Z");
const hoursFromNow = (h: number) =>
  new Date(NOW + h * 3_600_000).toISOString();

function market(over: Partial<PredictionMarket>): PredictionMarket {
  return {
    id: "m-" + JSON.stringify(over).length,
    eventId: "e1",
    categoryId: "c1",
    categorySlug: "general",
    categoryName: "General",
    ticker: "IMP-TEST",
    title: "Test market",
    status: "open",
    yesPricePoints: 50,
    noPricePoints: 50,
    volumePoints: 0,
    liquidityPoints: 100,
    openInterestPoints: 0,
    closeAt: hoursFromNow(24),
    ...over,
  } as PredictionMarket;
}

describe("first-trade onboarding contract", () => {
  it("picks the tradeable market nearest 50/50, liquidity as tiebreak", () => {
    const pick = pickTeachingMarket(
      [
        market({ id: "far", yesPricePoints: 6 }),
        market({ id: "near", yesPricePoints: 51 }),
        market({ id: "nearer-but-closed", yesPricePoints: 50, status: "settled" }),
        market({ id: "near-no-liquidity", yesPricePoints: 50, liquidityPoints: 0 }),
        market({ id: "near-past-close", yesPricePoints: 50, closeAt: hoursFromNow(-1) }),
      ],
      NOW,
    );
    assert.equal(pick?.id, "near");
  });

  it("breaks 50/50 ties toward real activity, then depth", () => {
    const byVolume = pickTeachingMarket(
      [
        market({ id: "quiet", yesPricePoints: 51, volumePoints: 5, liquidityPoints: 100 }),
        market({ id: "active", yesPricePoints: 49, volumePoints: 1_370, liquidityPoints: 100 }),
      ],
      NOW,
    );
    assert.equal(byVolume?.id, "active");
    const byDepth = pickTeachingMarket(
      [
        market({ id: "thin", yesPricePoints: 51, liquidityPoints: 100 }),
        market({ id: "deep", yesPricePoints: 49, liquidityPoints: 10_000 }),
      ],
      NOW,
    );
    assert.equal(byDepth?.id, "deep");
  });

  it("never teaches on a junk-titled market, even a perfect 50/50 one", () => {
    const pick = pickTeachingMarket(
      [
        market({
          id: "spam",
          yesPricePoints: 50,
          liquidityPoints: 10_000,
          title: "11kk Bangladesh | Best Online Betting & Live Casino Platform",
        }),
        market({ id: "clean", yesPricePoints: 51, title: "Daily Coinflip" }),
      ],
      NOW,
    );
    assert.equal(pick?.id, "clean");
  });

  it("returns null when nothing is tradeable — the ribbon then has no flow to start", () => {
    assert.equal(pickTeachingMarket([market({ status: "settled" })], NOW), null);
    assert.equal(pickTeachingMarket([], NOW), null);
  });

  it("round-trips a fresh draft and rejects an expired one", () => {
    const draft = { marketId: "m1", side: "yes" as const, savedAtMs: NOW };
    const raw = JSON.stringify(draft);
    assert.deepEqual(parseTradeDraft(raw, NOW + 1000), draft);
    assert.equal(parseTradeDraft(raw, NOW + DRAFT_TTL_MS + 1), null);
  });

  it("rejects malformed drafts instead of throwing", () => {
    for (const bad of [
      null,
      "",
      "not json",
      JSON.stringify({}),
      JSON.stringify({ marketId: "", side: "yes", savedAtMs: NOW }),
      JSON.stringify({ marketId: "m1", side: "maybe", savedAtMs: NOW }),
      JSON.stringify({ marketId: "m1", side: "yes", savedAtMs: "yesterday" }),
    ]) {
      assert.equal(parseTradeDraft(bad, NOW), null);
    }
  });

  it("the coach is exactly three beats — a coach mark, not a tour", () => {
    assert.equal(COACH_BEATS.length, 3);
  });
});

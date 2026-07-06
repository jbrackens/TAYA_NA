import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isOpenMarketStatus,
  marketStatusLabel,
} from "../components/prediction/market-display";

const labels: Record<string, string> = {
  LIVE: "LIVE",
  UNOPENED: "Unopened",
  HALTED: "Halted",
  CLOSED: "Closed",
  PROPOSED_RESOLUTION: "Resolution proposed",
  DISPUTED: "Disputed",
  SETTLED: "Settled",
  VOIDED: "Voided",
};

function t(key: string, options?: Record<string, unknown>): string {
  if (key === "MARKET_STATUS") return `Market ${options?.status}`;
  return labels[key] ?? key;
}

describe("market lifecycle display", () => {
  it("only treats open markets as close-date markets", () => {
    assert.equal(isOpenMarketStatus("open"), true);
    assert.equal(isOpenMarketStatus("voided"), false);
    assert.equal(isOpenMarketStatus("settled"), false);
    assert.equal(isOpenMarketStatus("closed"), false);
  });

  it("labels voided markets by status instead of their original close date", () => {
    assert.equal(marketStatusLabel("voided", t), "Voided");
  });
});

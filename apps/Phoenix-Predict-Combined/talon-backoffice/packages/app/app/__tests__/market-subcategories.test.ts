import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  extractMarketSubcategories,
  marketMatchesSubcategory,
} from "../components/prediction/marketSubcategories";

describe("market subcategory extraction", () => {
  it("keeps All and General out of the secondary nav", () => {
    assert.deepEqual(extractMarketSubcategories([], "all"), []);
    assert.deepEqual(extractMarketSubcategories([], "general"), []);
  });

  it("extracts known niches from raw provider-shaped market fields", () => {
    const markets = [
      {
        question: "Will Solana trade above $300 before July?",
        category: "Crypto",
        tags: ["Solana", "L1"],
      },
      {
        title: "Ethereum above $5,000 in 2026?",
        groupSlug: "ethereum-price",
      },
      {
        title: "Bitcoin ETF net inflows positive this month?",
        event_group: "btc-etf",
      },
    ];

    assert.deepEqual(extractMarketSubcategories(markets, "crypto"), [
      "Bitcoin",
      "Ethereum",
      "Solana",
    ]);
  });

  it("falls back to the expected taxonomy when the raw array has no niche signal", () => {
    assert.deepEqual(extractMarketSubcategories([], "Politics"), [
      "US Elections",
      "Congress",
      "White House",
      "Global Policy",
    ]);
  });

  it("filters markets by the selected secondary niche", () => {
    const markets = [
      { title: "Will the Federal Reserve cut interest rates?" },
      { title: "Will CPI inflation be above forecast?" },
      { title: "Will the Nasdaq close green today?" },
    ];

    assert.deepEqual(
      markets
        .filter((market) =>
          marketMatchesSubcategory(market, "Fed Rates", "economics"),
        )
        .map((market) => market.title),
      ["Will the Federal Reserve cut interest rates?"],
    );
  });
});

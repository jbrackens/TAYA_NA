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

  it("extracts known esports niches from raw provider-shaped market fields", () => {
    const markets = [
      {
        question: "Will this MLBB team win the weekend series?",
        category: "Esports",
        tags: ["MLBB", "Mobile Legends"],
      },
      {
        title: "Will Valorant Champions go to a fifth map?",
        groupSlug: "valorant-champions",
      },
      {
        title: "Will League of Legends Worlds final be decided in game five?",
        event_group: "lol-worlds",
      },
    ];

    assert.deepEqual(extractMarketSubcategories(markets, "esports"), [
      "MLBB",
      "Valorant",
      "League of Legends",
    ]);
  });

  it("extracts sports leagues from live normalized market text", () => {
    const markets = [
      {
        title: "Will the Vegas Golden Knights win the 2026 NHL Stanley Cup?",
        description:
          "The resolution source for this market will be information from the NHL.",
      },
      {
        title: "Will the San Antonio Spurs win the 2026 NBA Finals?",
        description: "This resolves based off the rules of the NBA.",
      },
      {
        title: "Will Ivory Coast win the 2026 FIFA World Cup?",
        description:
          "The primary resolution source will be official information from FIFA.",
      },
      {
        title: "Tigers wins by over 4.5 runs?",
        description:
          "If Tigers wins by more than 4.5 runs in a professional baseball game.",
      },
      {
        title: "Mark Stone: 3+ goals",
        description:
          "If Mark Stone records at least 3+ goals in a professional hockey game.",
      },
      {
        title: "Barcelona wins Champions League 2025/26",
        description:
          "Resolves YES if Barcelona wins the 2025/26 UEFA Champions League final.",
        settlementParams: { club: "barcelona" },
      },
    ];

    assert.deepEqual(extractMarketSubcategories(markets, "sports"), [
      "NBA",
      "NHL",
      "MLB",
      "FIFA",
      "Soccer",
    ]);
  });

  it("does not promote settlement entities into subnavigation items", () => {
    const markets = [
      {
        title: "Barcelona wins Champions League 2025/26",
        description:
          "Resolves YES if Barcelona wins the 2025/26 UEFA Champions League final.",
        settlementParams: { club: "barcelona" },
      },
    ];

    assert.deepEqual(extractMarketSubcategories(markets, "sports"), ["Soccer"]);
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

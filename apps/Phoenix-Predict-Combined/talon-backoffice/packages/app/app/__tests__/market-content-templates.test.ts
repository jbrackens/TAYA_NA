import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { PredictionMarket } from "@phoenix-ui/api-client/src/prediction-types";
import {
  marketDescription,
  marketTitle,
} from "../components/prediction/market-content";
import i18n from "../lib/i18n/config";

function makeT(resources: Record<string, string>) {
  return (key: string, options: Record<string, unknown> = {}) => {
    const raw = resources[key];
    if (!raw) return String(options.defaultValue ?? key);
    return raw.replace(/\{\{(\w+)\}\}/g, (_match, token: string) =>
      String(options[token] ?? ""),
    );
  };
}

function market(overrides: Partial<PredictionMarket>): PredictionMarket {
  return {
    id: "m1",
    eventId: "e1",
    ticker: "IMP-485DDC71",
    title: "Will the Colorado Avalanche win the 2026 NHL Stanley Cup?",
    description:
      "This market will resolve to “Yes” if the Colorado Avalanche win the 2026 NHL Stanley Cup. Otherwise, this market will resolve to “No”.\n",
    translations: {},
    status: "open",
    yesPricePointsCents: 40,
    noPricePointsCents: 60,
    volumePointsCents: 0,
    openInterestPointsCents: 0,
    liquidityPointsCents: 0,
    settlementSourceKey: "manual",
    settlementRule: "manual_attestation",
    feeRateBps: 100,
    closeAt: "2026-06-30T00:00:00Z",
    createdAt: "2026-05-17T00:00:00Z",
    ...overrides,
  };
}

async function withLanguage<T>(
  language: string,
  run: () => T | Promise<T>,
): Promise<T> {
  const previous = i18n.language || "en";
  await i18n.changeLanguage(language);
  try {
    return await run();
  } finally {
    await i18n.changeLanguage(previous);
  }
}

describe("market-content dynamic templates", () => {
  const zhT = makeT({
    "competitions.NHL Stanley Cup": "NHL斯坦利杯",
    "templates.winCompetition.title":
      "{{team}}会赢得{{year}}年{{competition}}吗？",
    "templates.winCompetition.description":
      "如果{{team}}赢得{{year}}年{{competition}}，则结算为YES；如果他们已不可能夺冠，则结算为NO。",
  });

  it("localizes imported championship markets without per-ticker static copy", async () => {
    const m = market({});

    await withLanguage("zh-Hans", () => {
      assert.equal(
        marketTitle(zhT, m),
        "Colorado Avalanche会赢得2026年NHL斯坦利杯吗？",
      );
      assert.equal(
        marketDescription(zhT, m),
        "如果Colorado Avalanche赢得2026年NHL斯坦利杯，则结算为YES；如果他们已不可能夺冠，则结算为NO。",
      );
    });
  });

  it("keeps curated static translations ahead of pattern templates", () => {
    const t = makeT({
      "markets.CURATED.title": "Curated localized title",
      "competitions.NHL Stanley Cup": "NHL斯坦利杯",
      "templates.winCompetition.title":
        "{{team}}会赢得{{year}}年{{competition}}吗？",
    });

    assert.equal(
      marketTitle(t, market({ ticker: "CURATED" })),
      "Curated localized title",
    );
  });

  it("keeps English imported titles unchanged", async () => {
    const m = market({});
    const enT = makeT({
      "templates.winCompetition.title":
        "Will {{team}} win the {{year}} {{competition}}?",
    });

    await withLanguage("en", () => {
      assert.equal(marketTitle(enT, m), m.title);
    });
  });
});

/**
 * Ink & lime step 10 — commentCount (§3-09) + the single-column feed
 * (Predict Light Social 3a), plus the two i18n cleanups.
 *
 * Source-level assertions (repo convention — node:test, no DOM harness):
 *  - the gateway stitches commentCount onto user-facing ListMarkets only
 *    (worker sweeps use Sort:"id" and keep their cheap shape)
 *  - the feed draws NO sparkline and invents no deltas: one real /prices
 *    fetch for the hero, rows lean on the live price only
 *  - commentCount is trusted only when the API sent it
 *  - rows keep the watchlist star — the list star is the app's only save
 *    affordance (documented deviation from the reference)
 *  - movement derivation is shared between /discover and the feed
 *  - de/ is retired; SELL_SHARES_CTA uses native i18next plurals
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const appRoot = resolve(__dirname, "..");

function read(rel: string): string {
  return readFileSync(resolve(appRoot, rel), "utf-8");
}

const feed = read("components/prediction/MarketFeed.tsx");
const section = read("components/prediction/AllMarketsSection.tsx");
const sqlRepo = readFileSync(
  resolve(
    appRoot,
    "../../../../go-platform/services/gateway/internal/prediction/sql_repository.go",
  ),
  "utf-8",
);
const goTypes = readFileSync(
  resolve(
    appRoot,
    "../../../../go-platform/services/gateway/internal/prediction/types.go",
  ),
  "utf-8",
);
const apiTypes = readFileSync(
  resolve(appRoot, "../../api-client/src/prediction-types.ts"),
  "utf-8",
);

describe("§3-09 commentCount (step 10)", () => {
  it("stitches counts onto user-facing list responses only", () => {
    assert.match(
      sqlRepo,
      /strings\.TrimSpace\(filter\.Sort\) != "id"/,
      "worker sweeps (Sort:\"id\") keep their cheap shape",
    );
    assert.match(
      sqlRepo,
      /prediction_market_comments\s*\n?\s*WHERE market_id = ANY\(\$1\) GROUP BY market_id/,
      "one batched, index-backed GROUP BY over the page ids",
    );
    assert.match(goTypes, /CommentCount int `json:"commentCount,omitempty" db:"-"`/);
  });

  it("exposes the field as unknown-when-absent on the client", () => {
    assert.match(apiTypes, /commentCount\?: number/);
    assert.match(
      feed,
      /typeof market\.commentCount === "number"/,
      "the feed trusts the count only when the API sent it",
    );
  });

  it("survives BOTH wire whitelists — the field vanished twice during implementation", () => {
    // The gateway's Market.MarshalJSON and the api-client's
    // normalizePredictionMarket are each explicit field lists; a struct
    // tag or interface field alone never reaches the UI.
    assert.match(goTypes, /CommentCount:\s+m\.CommentCount,/);
    const client = readFileSync(
      resolve(appRoot, "../../api-client/src/prediction-client.ts"),
      "utf-8",
    );
    assert.match(
      client,
      /commentCount:\s*\n?\s*typeof row\.commentCount === "number" \? row\.commentCount : undefined/,
    );
  });
});

describe("single-column feed (Predict Light Social 3a)", () => {
  it("renders hero-then-rows and replaces the /predict grid", () => {
    assert.match(feed, /function FeedHeroCard/);
    assert.match(feed, /function FeedRow/);
    assert.match(section, /<MarketFeed/);
    assert.ok(
      !section.includes("<MarketGrid"),
      "the grid is gone from /predict (category pages keep MarketCard)",
    );
  });

  it("draws no sparkline and invents no deltas", () => {
    assert.ok(
      !feed.includes("<svg"),
      "no hand-drawn chart markup: the price-history endpoint for cards doesn't exist — draw nothing (icons are phosphor components)",
    );
    const historyCalls = feed.match(/getMarketPriceHistory/g) ?? [];
    assert.equal(
      historyCalls.length,
      1,
      "exactly one real history fetch — the hero; rows never fabricate movement",
    );
    assert.match(feed, /movement !== null && movement\.direction !== "flat"/);
  });

  it("keeps the activity meta row: comments + volume, magnitudes in mono ink", () => {
    assert.match(feed, /DISCUSSION_COUNT/);
    assert.match(feed, /formatCompactPoints\(market\.volumePoints\)/);
  });

  it("keeps the watchlist star on rows — the app's only save affordance", () => {
    const rowSlice = feed.slice(
      feed.indexOf("function FeedRow"),
      feed.indexOf("export function MarketFeed"),
    );
    assert.match(rowSlice, /aria-pressed=\{watched\}/);
  });

  it("ships feed skeletons that match the real geometry", () => {
    assert.match(feed, /export function FeedHeroSkeleton/);
    assert.match(feed, /export function FeedRowSkeleton/);
    assert.match(section, /<FeedHeroSkeleton \/>/);
  });

  it("shares movement derivation with /discover", () => {
    const discover = read("discover/page.tsx");
    for (const src of [feed, discover]) {
      assert.match(src, /from "(\.\.\/components\/prediction|\.)\/market-movement"/);
    }
  });
});

describe("i18n cleanups (step 10)", () => {
  const LOCALES = ["en", "id", "ms", "tl", "zh-Hans", "zh-Hant"];

  it("retires the de locale directory", () => {
    assert.ok(
      !existsSync(resolve(appRoot, "../public/static/locales/de")),
      "de carried only legacy sportsbook namespaces and was never registered",
    );
  });

  it("ships the share strings in every locale", () => {
    for (const locale of LOCALES) {
      const dict = JSON.parse(
        read(`../public/static/locales/${locale}/prediction.json`),
      ) as Record<string, string>;
      for (const key of ["SHARE_MARKET", "SHARE_COPIED", "SHARE_FAILED"]) {
        assert.ok(dict[key], `${locale}: ${key} missing`);
      }
    }
  });

  it("uses native plural interpolation in the sell CTA call site", () => {
    const ticket = read("components/prediction/TradeTicket.tsx");
    assert.match(ticket, /t\("SELL_SHARES_CTA", \{\s*\n?\s*count: requestedQuantity/);
    assert.ok(!ticket.includes("plural: requestedQuantity"));
  });
});

/**
 * Ink & lime step 10 — commentCount (§3-09) + the feed used by discovery,
 * plus the two i18n cleanups. Available Markets uses the restored grid.
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
 *  - de/ is retired; SELL_SHARES_HOLD_CTA uses native i18next plurals
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
const grid = read("components/prediction/MarketGrid.tsx");
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

describe("Markets grid and discovery feed", () => {
  it("renders Available Markets in a nine-card, responsive grid", () => {
    assert.match(section, /const PAGE_SIZE = 9/);
    assert.equal(
      (section.match(/pageSize: PAGE_SIZE/g) ?? []).length,
      2,
      "the initial request and each Load More request should use the nine-card batch size",
    );
    assert.match(
      section,
      /setMarkets\(\(prev\) => \[\.\.\.prev, \.\.\.next\]\)/,
      "Load More should append the next batch to the existing grid",
    );
    assert.match(section, /<MarketGrid[\s\S]*columns=\{3\}/);
    assert.match(
      grid,
      /grid-cols-3[\s\S]*max-\[1120px\]:grid-cols-2[\s\S]*max-\[640px\]:grid-cols-1/,
      "the restored grid should retain its desktop, tablet, and mobile columns",
    );
    assert.ok(
      !section.includes("<MarketFeed"),
      "Available Markets should not fall back to the single-column feed",
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

  it("ships a nine-card skeleton that matches the real grid", () => {
    assert.match(section, /function MarketCardSkeleton/);
    assert.match(section, /Array\.from\(\{ length: PAGE_SIZE \}/);
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
    assert.match(ticket, /t\("SELL_SHARES_HOLD_CTA", \{\s*\n?\s*count: requestedQuantity/);
    assert.ok(!ticket.includes("plural: requestedQuantity"));
  });
});

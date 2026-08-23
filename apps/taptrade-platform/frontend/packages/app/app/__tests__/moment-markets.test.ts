import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { resolve } from "node:path";

const appRoot = resolve(__dirname, "..");
const moments = readFileSync(
  resolve(appRoot, "components/prediction/MomentMarketsSection.tsx"),
  "utf8",
);
const grid = readFileSync(
  resolve(appRoot, "components/prediction/MarketGrid.tsx"),
  "utf8",
);

describe("Predict Moments market directory", () => {
  it("renders the seven approved rankings as in-place tabs", () => {
    assert.match(moments, /DISCOVER_RANKING_SECTIONS\.map/);
    assert.match(moments, /role="tablist"/);
    assert.match(moments, /role="tabpanel"/);
    assert.match(moments, /setActiveKey\(key\)/);
    assert.match(moments, /aria-selected=\{selected\}/);
  });

  it("keeps Trending as a real nine-card, server-paginated activity grid", () => {
    assert.match(moments, /const PAGE_SIZE = 9/);
    assert.match(moments, /page: 1,[\s\S]*pageSize: PAGE_SIZE,[\s\S]*sort: "activity"/);
    assert.match(moments, /page: trendingPage \+ 1,[\s\S]*pageSize: PAGE_SIZE/);
    assert.match(
      moments,
      /setTrendingMarkets\(\(current\) => dedupeMarkets\(\[\.\.\.current, \.\.\.next\]\)\)/,
    );
    assert.match(moments, /window\.setInterval\(/);
  });

  it("preserves the dense responsive 3×3 market grid and paired market actions", () => {
    assert.match(moments, /<MarketGrid markets=\{visibleMarkets\} columns=\{3\} \/>/);
    assert.match(
      grid,
      /grid-cols-3[\s\S]*max-\[1120px\]:grid-cols-2[\s\S]*max-\[640px\]:grid-cols-1/,
    );
    assert.doesNotMatch(moments, /<MarketFeed/);
  });

  it("uses verified one-day history only for YES mover rankings", () => {
    assert.match(moments, /activeKey === "gainers" \|\| activeKey === "decliners"/);
    assert.match(moments, /getMarketPriceHistory\(market\.id, "1d"\)/);
    assert.match(moments, /movementFromHistory\(history\)/);
    assert.doesNotMatch(moments, /deterministicDelta/);
  });

  it("does not cache a cancelled or incomplete 24-hour mover corpus", () => {
    const fetchStart = moments.indexOf("void mapWithConcurrency(");
    const cacheCommit = moments.indexOf(
      "completedMovementCorpusRef.current = corpusKey",
    );

    assert.ok(fetchStart >= 0, "the mover request should be present");
    assert.ok(
      cacheCommit > fetchStart,
      "the corpus must be cached only after its history requests resolve",
    );
    assert.match(moments, /entries\.some\(\(\[, movement\]\) => movement === null\)/);
    assert.match(moments, /setMovementError\(/);
    assert.match(moments, /\[activeKey, historyCandidates, retryNonce, usesMovement\]/);
  });

  it("keeps tabs operable by keyboard and retries a failed later batch", () => {
    assert.match(moments, /function handleRankingKeyDown/);
    assert.match(moments, /case "ArrowRight"/);
    assert.match(moments, /onKeyDown=\{\(event\) => handleRankingKeyDown/);
    assert.match(moments, /const \[loadMoreError, setLoadMoreError\]/);
    assert.match(moments, /COULD_NOT_LOAD_MORE_MARKETS/);
    assert.match(moments, /onClick=\{loadMore\}/);
  });

  it("keeps a delayed Trending append scoped to its own tab and topic", () => {
    assert.match(moments, /const \[loadingMoreKey, setLoadingMoreKey\]/);
    assert.match(moments, /loadMoreError\?\.key === activeKey/);
    assert.match(moments, /const requestId = loadMoreRequestRef\.current \+ 1/);
    assert.match(moments, /loadMoreRequestRef\.current !== requestId/);
    assert.match(moments, /categoryId,/);
  });
});

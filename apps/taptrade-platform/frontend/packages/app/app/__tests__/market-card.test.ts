import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { resolve } from "node:path";

const appRoot = resolve(__dirname, "..");
const card = readFileSync(
  resolve(appRoot, "components/prediction/MarketCard.tsx"),
  "utf8",
);
const grid = readFileSync(
  resolve(appRoot, "components/prediction/MarketGrid.tsx"),
  "utf8",
);

describe("Market Discovery Card", () => {
  it("keeps the approved ranked-market anatomy", () => {
    assert.match(card, /min-h-\[222px\]/);
    assert.match(card, /bg-\[var\(--brand-lavender\)\]/);
    assert.match(card, /t\("TRENDING", "Trending"\)/);
    assert.match(card, /PARTICIPANT_VIEW/);
    assert.match(card, /bg-\[var\(--yes\)\]/);
    assert.match(card, /bg-\[var\(--no\)\]/);
    assert.match(card, /formatCompactPoints\(volumePoints\)/);
  });

  it("renders the two live market sides as percentage actions", () => {
    assert.match(card, /href=\{`\/market\/\$\{ticker\}\?side=yes`\}/);
    assert.match(card, /href=\{`\/market\/\$\{ticker\}\?side=no`\}/);
    assert.match(card, /\{yesPercentage\}% \{t\("YES"\)\}/);
    assert.match(card, /\{noPercentage\}% \{t\("NO"\)\}/);
    assert.doesNotMatch(card, /¢/);
  });

  it("removes unapproved card media and explanatory content", () => {
    assert.doesNotMatch(card, /getMarketImageProps|<img|<Star/);
    assert.doesNotMatch(card, /Why it matters|What this settles|Derived from/);
  });

  it("receives stable one-based ranks from the grid", () => {
    assert.match(grid, /rankStart\?: number/);
    assert.match(grid, /rankStart = 1/);
    assert.match(grid, /rank=\{rankStart \+ index\}/);
  });
});

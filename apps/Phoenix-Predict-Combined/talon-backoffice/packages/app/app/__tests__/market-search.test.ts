/**
 * LC-26: top-bar search must rank by relevance — an exact/prefix ticker
 * match surfaces first and survives the top-N cap, with recall unchanged.
 * Tests the real shipped helper.
 *
 * Run: npx tsx --test app/__tests__/market-search.test.ts
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { searchMarkets } from "../lib/marketSearch";

const M = (ticker: string, title: string) => ({ ticker, title });

describe("searchMarkets (LC-26 relevance ranking)", () => {
  it("empty / blank query returns nothing", () => {
    assert.deepEqual(searchMarkets([M("BTC", "Bitcoin")], ""), []);
    assert.deepEqual(searchMarkets([M("BTC", "Bitcoin")], "   "), []);
  });

  it("exact ticker match ranks first even when title hits come earlier", () => {
    const markets = [
      M("AAA", "BTC price talk"), // title substring, earlier in API order
      M("BBB", "more btc chatter"),
      M("BTC", "Bitcoin above 100k?"), // the exact ticker, later
    ];
    const r = searchMarkets(markets, "btc");
    assert.equal(r[0].ticker, "BTC", "exact ticker must be first");
    assert.equal(r.length, 3, "recall unchanged (all 3 still match)");
  });

  it("exact ticker survives the top-N cap (the core regression)", () => {
    // 8 title-substring matches first, exact-ticker market last.
    const noise = Array.from({ length: 8 }, (_, i) =>
      M(`N${i}`, `eth related ${i}`),
    );
    const markets = [...noise, M("ETH", "Ethereum outcome")];
    const r = searchMarkets(markets, "eth", 8);
    assert.equal(r.length, 8);
    assert.equal(
      r[0].ticker,
      "ETH",
      "exact ticker must float to top, not be dropped by slice(8)",
    );
  });

  it("ticker prefix beats title substring; title-only still included", () => {
    const markets = [
      M("XYZ", "contains sol in the title"),
      M("SOLUSD", "Solana perp"), // ticker prefix 'sol'
    ];
    const r = searchMarkets(markets, "sol");
    assert.equal(r[0].ticker, "SOLUSD", "ticker-prefix outranks title hit");
    assert.equal(r.length, 2, "title-only match still recalled");
  });

  it("stable within a tier (API order preserved as tiebreak)", () => {
    const markets = [
      M("FED1", "Fed decision A"),
      M("FED2", "Fed decision B"),
      M("FED3", "Fed decision C"),
    ];
    const r = searchMarkets(markets, "fed");
    assert.deepEqual(
      r.map((m) => m.ticker),
      ["FED1", "FED2", "FED3"],
      "same-tier order matches input order",
    );
  });

  it("respects the limit", () => {
    const markets = Array.from({ length: 20 }, (_, i) =>
      M(`T${i}`, `gold question ${i}`),
    );
    assert.equal(searchMarkets(markets, "gold", 5).length, 5);
  });
});

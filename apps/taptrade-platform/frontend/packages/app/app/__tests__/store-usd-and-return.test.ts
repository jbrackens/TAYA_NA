/**
 * Point Store — USD price formatting (from integer cents, in code, never in
 * locale bundles) and ?return= context validation (same-origin paths only).
 *
 * Run: npx tsx --test app/__tests__/store-usd-and-return.test.ts
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatUsdCents } from "../lib/usd";
import { storeReturnPath, storeReturnSuffix } from "../lib/storeReturnPath";

describe("formatUsdCents", () => {
  it("formats integer cents as en-US USD", () => {
    assert.equal(formatUsdCents(500), "$5.00");
    assert.equal(formatUsdCents(1000), "$10.00");
    assert.equal(formatUsdCents(2500), "$25.00");
    assert.equal(formatUsdCents(10000), "$100.00");
  });

  it("keeps sub-dollar and odd-cent amounts exact", () => {
    assert.equal(formatUsdCents(1), "$0.01");
    assert.equal(formatUsdCents(99), "$0.99");
    assert.equal(formatUsdCents(1234567), "$12,345.67");
  });

  it("renders a safe zero for non-finite input", () => {
    assert.equal(formatUsdCents(Number.NaN), "$0.00");
    assert.equal(formatUsdCents(Number.POSITIVE_INFINITY), "$0.00");
  });
});

describe("storeReturnPath", () => {
  it("accepts same-origin absolute paths", () => {
    assert.equal(storeReturnPath("/market/BTC-DAILY"), "/market/BTC-DAILY");
    assert.equal(
      storeReturnPath("/market/UCL-BARCA-2526?side=yes"),
      "/market/UCL-BARCA-2526?side=yes",
    );
  });

  it("rejects external and open-redirect shapes with null", () => {
    assert.equal(storeReturnPath(null), null);
    assert.equal(storeReturnPath(""), null);
    assert.equal(storeReturnPath("//evil.com"), null);
    assert.equal(storeReturnPath("https://evil.com/market/x"), null);
    assert.equal(storeReturnPath("http://evil.com"), null);
    assert.equal(storeReturnPath("/\\evil.com"), null);
    assert.equal(storeReturnPath("relative/path"), null);
    assert.equal(storeReturnPath("javascript:alert(1)"), null);
  });

  it("suffix builder encodes safe paths and drops unsafe ones", () => {
    assert.equal(storeReturnSuffix("/market/abc"), "?return=%2Fmarket%2Fabc");
    assert.equal(storeReturnSuffix("//evil.com"), "");
    assert.equal(storeReturnSuffix(null), "");
  });

  it("round-trips through encode/decode", () => {
    const original = "/market/SENATE-DEM-2026?side=no";
    const suffix = storeReturnSuffix(original);
    const decoded = decodeURIComponent(suffix.split("=").slice(1).join("="));
    assert.equal(storeReturnPath(decoded), original);
  });
});

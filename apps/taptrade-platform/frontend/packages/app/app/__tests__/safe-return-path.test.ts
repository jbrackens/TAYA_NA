/**
 * LC-05: returnUrl must thread through the auth pages (login -> register ->
 * post-register) without being dropped, but only same-origin paths may be
 * honored (no open redirect). Tests the real shipped validator.
 *
 * Run: npx tsx --test app/__tests__/safe-return-path.test.ts
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { safeReturnPath, returnUrlSuffix } from "../lib/safeReturnPath";

describe("safeReturnPath", () => {
  it("falls back to /predict when absent", () => {
    assert.equal(safeReturnPath(null), "/predict");
    assert.equal(safeReturnPath(""), "/predict");
  });

  it("honors a same-origin absolute path", () => {
    assert.equal(safeReturnPath("/market/abc"), "/market/abc");
    assert.equal(safeReturnPath("/portfolio?tab=open"), "/portfolio?tab=open");
  });

  it("rejects open-redirect shapes", () => {
    assert.equal(safeReturnPath("//evil.com"), "/predict");
    assert.equal(safeReturnPath("https://evil.com"), "/predict");
    assert.equal(safeReturnPath("/\\evil.com"), "/predict");
    assert.equal(safeReturnPath("relative/path"), "/predict");
  });
});

describe("returnUrlSuffix", () => {
  it("is empty when there is no param", () => {
    assert.equal(returnUrlSuffix(null), "");
    assert.equal(returnUrlSuffix(""), "");
  });

  it("is empty (not forwarded) for an unsafe value", () => {
    assert.equal(returnUrlSuffix("//evil.com"), "");
    assert.equal(returnUrlSuffix("https://evil.com"), "");
  });

  it("encodes a safe same-origin path", () => {
    assert.equal(returnUrlSuffix("/market/abc"), "?returnUrl=%2Fmarket%2Fabc");
  });

  it("round-trips: a forwarded suffix decodes back to a safe path", () => {
    const original = "/market/UCL-BARCA-2526";
    const suffix = returnUrlSuffix(original);
    const decoded = decodeURIComponent(suffix.split("=")[1]);
    assert.equal(decoded, original);
    assert.equal(safeReturnPath(decoded), original);
  });
});

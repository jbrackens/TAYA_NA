/**
 * Settlement notice mapping — pure contract
 * (app/components/prediction/notifications.ts).
 *
 * One mapping renders both the live toast and the inbox rows: payload →
 * i18n key + params. Foreign portfolio events (fills, wallet changes) flow
 * on the same WS channel and MUST map to null, never to a wrong toast.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { settlementNotice } from "../components/prediction/notifications";

describe("settlement notice contract", () => {
  it("maps a paid settlement to the paid key with result and points", () => {
    const notice = settlementNotice({
      type: "settlement",
      kind: "settlement_paid",
      result: "yes",
      payoutPoints: 2000,
      title: "Will it rain tomorrow?",
      ticker: "T-9",
    });
    assert.ok(notice);
    assert.equal(notice.titleKey, "SETTLEMENT_TOAST_PAID_TITLE");
    assert.deepEqual(notice.params, { result: "YES", points: 2000 });
    assert.equal(notice.body, "Will it rain tomorrow?");
  });

  it("maps a losing settlement to the closed key", () => {
    const notice = settlementNotice({
      type: "settlement",
      kind: "settlement_closed",
      result: "no",
      payoutPoints: 0,
      ticker: "T-9",
    });
    assert.ok(notice);
    assert.equal(notice.titleKey, "SETTLEMENT_TOAST_CLOSED_TITLE");
    assert.deepEqual(notice.params, { result: "NO" });
    assert.equal(notice.body, "T-9");
  });

  it("maps a void to the voided key with the refund", () => {
    const notice = settlementNotice({
      type: "settlement",
      kind: "market_voided",
      payoutPoints: 240,
      title: "Sample market",
    });
    assert.ok(notice);
    assert.equal(notice.titleKey, "SETTLEMENT_TOAST_VOIDED_TITLE");
    assert.deepEqual(notice.params, { points: 240 });
  });

  it("ignores non-settlement portfolio events and malformed payloads", () => {
    assert.equal(
      settlementNotice({ userId: "u", marketId: "m", filledQuantity: 5 }),
      null,
    );
    assert.equal(settlementNotice({ type: "settlement" }), null);
    assert.equal(
      settlementNotice({ type: "settlement", kind: "something_else" }),
      null,
    );
    assert.equal(settlementNotice(null), null);
    assert.equal(settlementNotice("string"), null);
  });
});

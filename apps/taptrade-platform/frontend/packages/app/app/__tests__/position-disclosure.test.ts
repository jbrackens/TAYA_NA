/**
 * Ink & lime step 11 — per-comment position disclosure.
 *
 * The semantics that matter, pinned end to end:
 *  - opt-in, UNCHECKED by default, author decides per comment (the flag
 *    resets after every post)
 *  - the value is a SNAPSHOT at post time, captured by the gateway from
 *    the author's live positions — never recomputed on read, so an
 *    exited position stays disclosed
 *  - the chip's past-tense wording carries the snapshot semantics
 *    ("held … at the time"), pale side fill + dark direction text
 *  - the checkbox is gated on actually holding a position; the backend
 *    re-checks and posts chipless when nothing is held
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const appRoot = resolve(__dirname, "..");

function read(rel: string): string {
  return readFileSync(resolve(appRoot, rel), "utf-8");
}

const discussion = read("components/prediction/MarketDiscussion.tsx");
const client = read("lib/api/market-social-client.ts");
const marketPage = read("market/[ticker]/page.tsx");
const socialHandlers = readFileSync(
  resolve(
    appRoot,
    "../../../../go-platform/services/gateway/internal/http/market_social_handlers.go",
  ),
  "utf-8",
);

const SHIPPED_LOCALES = ["en", "id", "ms", "tl", "zh-Hans", "zh-Hant"];

describe("position disclosure — composer (step 11)", () => {
  it("is opt-in, unchecked by default, and resets after every post", () => {
    assert.match(discussion, /useState\(false\)/);
    assert.match(discussion, /setDisclosePosition\(false\)/);
    assert.match(
      discussion,
      /disclosePosition && canDisclosePosition/,
      "the submit passes the flag only when checked AND holding",
    );
  });

  it("gates the checkbox on holding a position", () => {
    assert.match(discussion, /disabled=\{!canDisclosePosition \|\| saving\}/);
    assert.match(discussion, /DISCLOSE_POSITION_NONE/);
    assert.match(
      marketPage,
      /canDisclosePosition=\{positions\.some\(\(p\) => p\.quantity > 0\)\}/,
    );
  });
});

describe("position disclosure — chip (step 11)", () => {
  it("renders the past-tense snapshot wording with pale side fills", () => {
    assert.match(discussion, /POSITION_DISCLOSURE_CHIP/);
    assert.match(
      discussion,
      /border-\[var\(--yes-border\)\] bg-\[var\(--yes-soft\)\] text-\[var\(--yes-text\)\]/,
    );
    assert.match(
      discussion,
      /border-\[var\(--no-border\)\] bg-\[var\(--no-soft\)\] text-\[var\(--no-text\)\]/,
    );
  });

  it("ships the copy in every locale, worded as a snapshot", () => {
    for (const locale of SHIPPED_LOCALES) {
      const dict = JSON.parse(
        read(`../public/static/locales/${locale}/prediction.json`),
      ) as Record<string, string>;
      for (const key of [
        "DISCLOSE_POSITION_LABEL",
        "DISCLOSE_POSITION_NONE",
        "POSITION_DISCLOSURE_CHIP",
      ]) {
        assert.ok(dict[key], `${locale}: ${key} missing`);
      }
      assert.ok(
        dict.POSITION_DISCLOSURE_CHIP.includes("{{amount}}") &&
          dict.POSITION_DISCLOSURE_CHIP.includes("{{side}}"),
        `${locale}: chip must carry amount and side`,
      );
    }
  });
});

describe("position disclosure — wire (step 11)", () => {
  it("client sends the opt-in flag and types the snapshot", () => {
    assert.match(client, /disclosePosition: disclosePosition === true/);
    assert.match(client, /positionDisclosure\?: CommentPositionDisclosure\[\]/);
  });

  it("gateway snapshots at post time and never on read", () => {
    assert.match(socialHandlers, /req\.DisclosePosition && positions != nil/);
    assert.match(
      socialHandlers,
      /p\.MarketID == marketID && p\.Quantity > 0/,
      "only THIS market's held sides are disclosed",
    );
    // Reads only SELECT the stored column — no recompute path exists.
    assert.match(socialHandlers, /c\.position_disclosure/);
    assert.ok(
      !/ListComments[\s\S]{0,800}ListPositions/.test(socialHandlers),
      "read paths must never recompute disclosure from live positions",
    );
  });

  it("ships the migration and the dev-schema column", () => {
    assert.ok(
      existsSync(
        resolve(
          appRoot,
          "../../../../go-platform/services/gateway/migrations/054_comment_position_disclosure.sql",
        ),
      ),
    );
    assert.match(
      socialHandlers,
      /ADD COLUMN IF NOT EXISTS position_disclosure JSONB NULL/,
    );
  });
});

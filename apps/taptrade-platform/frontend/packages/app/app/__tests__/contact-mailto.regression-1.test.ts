/**
 * Regression: ISSUE-004 — Contact Us posted to /api/v1/support/contact,
 * an endpoint the gateway does not expose; signed-out submissions died
 * with a raw 401 and the message was silently lost.
 * Found by /qa on 2026-07-26
 * Report: .gstack/qa-reports/qa-report-localhost-3012-2026-07-26.md
 *
 * The fix composes a prefilled support mailto instead. These tests pin
 * the mailto contract: correct recipient, subject prefix, reply-to
 * context in the body, and URI encoding of user input.
 *
 * Run: npx tsx --test app/__tests__/contact-mailto.regression-1.test.ts
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildSupportMailto } from "../contact-us/support-mailto";

describe("contact-us support mailto (ISSUE-004)", () => {
  const data = {
    name: "Juan dela Cruz",
    email: "juan@example.ph",
    subject: "Can't log in",
    message: "My account is locked & I need help.",
  };

  it("addresses support with a [Support] subject prefix", () => {
    const url = buildSupportMailto(data);
    assert.ok(url.startsWith("mailto:support@taptrade.com?"));
    assert.ok(
      url.includes(`subject=${encodeURIComponent("[Support] Can't log in")}`),
    );
  });

  it("keeps the sender's reply-to context in the body", () => {
    const url = buildSupportMailto(data);
    const body = decodeURIComponent(url.split("&body=")[1]);
    assert.ok(body.includes("My account is locked & I need help."));
    assert.ok(body.includes("Juan dela Cruz"));
    assert.ok(body.includes("juan@example.ph"));
  });

  it("URI-encodes reserved characters so the mailto survives", () => {
    const url = buildSupportMailto({
      ...data,
      subject: "50% off? = & #fragment",
    });
    // Raw &, =, # in the subject would break querystring parsing.
    const query = url.slice(url.indexOf("?") + 1);
    const subjectParam = query
      .split("&")
      .find((p) => p.startsWith("subject="));
    assert.ok(subjectParam);
    assert.equal(
      decodeURIComponent(subjectParam.split("=").slice(1).join("=")),
      "[Support] 50% off? = & #fragment",
    );
  });
});

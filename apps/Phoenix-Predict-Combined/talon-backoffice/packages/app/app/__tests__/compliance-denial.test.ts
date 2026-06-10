import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { complianceDenialKind } from "../lib/compliance-denial";

// The matched strings are the gateway's user-facing 403 reasons — see
// internal/compliance/geo_gate.go, internal/http/pretrade_gate.go, and
// internal/payments/handlers.go.
describe("compliance denial classification", () => {
  it("classifies jurisdiction denials", () => {
    assert.equal(
      complianceDenialKind("service not available in your jurisdiction"),
      "jurisdiction",
    );
    assert.equal(
      complianceDenialKind(
        "service not available: jurisdiction could not be verified",
      ),
      "jurisdiction",
    );
  });

  it("classifies KYC denials", () => {
    assert.equal(
      complianceDenialKind(
        "identity verification required to trade — complete verification under Profile → Verification",
      ),
      "kyc",
    );
    assert.equal(
      complianceDenialKind(
        "identity verification required to withdraw above this amount — complete verification under Profile → Verification",
      ),
      "kyc",
    );
    assert.equal(
      complianceDenialKind(
        "identity verification unavailable; trading blocked",
      ),
      "kyc",
    );
  });

  it("leaves ordinary errors unclassified", () => {
    assert.equal(complianceDenialKind("insufficient wallet balance"), null);
    assert.equal(complianceDenialKind("API error: 500"), null);
    assert.equal(complianceDenialKind(""), null);
  });
});

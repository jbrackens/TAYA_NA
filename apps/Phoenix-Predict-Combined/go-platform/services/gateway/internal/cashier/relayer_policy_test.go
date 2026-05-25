package cashier

import (
	"testing"
	"time"
)

func TestEvaluateRelayerPolicyAllowsConstrainedSubmission(t *testing.T) {
	now := time.Date(2026, 5, 25, 0, 20, 0, 0, time.UTC)
	submission := testRelayerSubmission(now.Add(10 * time.Minute))

	result := EvaluateRelayerPolicy(RelayerPolicyInput{
		Submission:                 submission,
		ComplianceDecision:         ComplianceAllow,
		AllowedTargets:             []string{submission.TargetContract},
		AllowedSelectors:           []string{"0xa9059cbb"},
		CalldataSelector:           "0xa9059cbb",
		AmountUnits:                "10000000",
		MaxAmountUnits:             "10000000",
		PaymasterRunwaySeconds:     3600,
		MinPaymasterRunwaySeconds:  600,
		AlreadySubmittedOrIncluded: false,
		Now:                        now,
	})

	if result.Decision != "allow" {
		t.Fatalf("decision = %q, reasons = %v", result.Decision, result.Reasons)
	}
	if len(result.Reasons) != 0 {
		t.Fatalf("reasons = %v, want none", result.Reasons)
	}
}

func TestEvaluateRelayerPolicyDeniesUnsafeSubmission(t *testing.T) {
	now := time.Date(2026, 5, 25, 0, 31, 0, 0, time.UTC)
	submission := testRelayerSubmission(now.Add(-time.Minute))

	result := EvaluateRelayerPolicy(RelayerPolicyInput{
		Submission:                 submission,
		ComplianceDecision:         ComplianceManualReview,
		AllowedTargets:             []string{"0x9999999999999999999999999999999999999999"},
		AllowedSelectors:           []string{"0xdeadbeef"},
		CalldataSelector:           "0xa9059cbb",
		AmountUnits:                "10000001",
		MaxAmountUnits:             "10000000",
		PaymasterRunwaySeconds:     10,
		MinPaymasterRunwaySeconds:  600,
		AlreadySubmittedOrIncluded: true,
		Now:                        now,
		Paused:                     true,
	})

	if result.Decision != "deny" {
		t.Fatalf("decision = %q, want deny", result.Decision)
	}
	for _, reason := range []string{
		"relayer_paused",
		"compliance_manual_review",
		"target_not_allowlisted",
		"selector_not_allowlisted",
		"amount_above_cap",
		"paymaster_runway_too_low",
		"idempotency_key_already_submitted",
		"authorization_expired",
	} {
		assertContainsReason(t, result.Reasons, reason)
	}
}

func testRelayerSubmission(expiresAt time.Time) RelayerSubmission {
	return RelayerSubmission{
		ID:                         "relayer_test_001",
		Status:                     RelayerQueued,
		SettlementChain:            "polygon",
		UserID:                     "user_maria_001",
		SmartWalletAddress:         "0x1111111111111111111111111111111111111111",
		TargetContract:             "0x3333333333333333333333333333333333333333",
		CalldataSHA256:             "b3f3d61c7f8e093f2f1d72fe2f05a97998b8d7f220000000000000000000001",
		UserAuthorizationHash:      "0x4444444444444444444444444444444444444444444444444444444444444444",
		UserAuthorizationNonce:     "trade:user_maria_001:000001",
		UserAuthorizationExpiresAt: expiresAt,
	}
}

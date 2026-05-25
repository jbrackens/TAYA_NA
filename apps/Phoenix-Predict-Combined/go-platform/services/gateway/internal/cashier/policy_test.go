package cashier

import "testing"

func TestEvaluateCompliancePolicyAllowsClearDeposit(t *testing.T) {
	result, err := EvaluateCompliancePolicy(CompliancePolicyInput{
		SubjectType:            "deposit",
		AmountUnits:            "25000000",
		PerTransactionCapUnits: "100000000",
		DailyAggregateUnits:    "100000000",
		DailyCapUnits:          "500000000",
		GeoAllowed:             true,
		AddressScreening:       AddressScreeningClear,
	})
	if err != nil {
		t.Fatalf("EvaluateCompliancePolicy returned error: %v", err)
	}
	if result.Decision != ComplianceAllow {
		t.Fatalf("decision = %q, want %q", result.Decision, ComplianceAllow)
	}
	if len(result.Reasons) != 0 {
		t.Fatalf("reasons = %v, want none", result.Reasons)
	}
}

func TestEvaluateCompliancePolicyManualReviewReasons(t *testing.T) {
	result, err := EvaluateCompliancePolicy(CompliancePolicyInput{
		SubjectType:            "deposit",
		AmountUnits:            "125000000",
		PerTransactionCapUnits: "100000000",
		DailyAggregateUnits:    "490000000",
		DailyCapUnits:          "500000000",
		GeoAllowed:             true,
		AddressScreening:       AddressScreeningUnavailable,
		Paused:                 true,
	})
	if err != nil {
		t.Fatalf("EvaluateCompliancePolicy returned error: %v", err)
	}
	if result.Decision != ComplianceManualReview {
		t.Fatalf("decision = %q, want %q", result.Decision, ComplianceManualReview)
	}
	assertContainsReason(t, result.Reasons, "cashier_paused")
	assertContainsReason(t, result.Reasons, "address_screening_unavailable")
	assertContainsReason(t, result.Reasons, "per_transaction_cap_exceeded")
	assertContainsReason(t, result.Reasons, "daily_cap_exceeded")
}

func TestEvaluateCompliancePolicySeverityOrder(t *testing.T) {
	quarantine, err := EvaluateCompliancePolicy(CompliancePolicyInput{
		SubjectType:      "withdrawal",
		GeoAllowed:       true,
		AddressScreening: AddressScreeningSanctionsHit,
	})
	if err != nil {
		t.Fatalf("EvaluateCompliancePolicy returned error: %v", err)
	}
	if quarantine.Decision != ComplianceQuarantine {
		t.Fatalf("decision = %q, want %q", quarantine.Decision, ComplianceQuarantine)
	}

	deny, err := EvaluateCompliancePolicy(CompliancePolicyInput{
		SubjectType:      "withdrawal",
		GeoAllowed:       false,
		AddressScreening: AddressScreeningSanctionsHit,
	})
	if err != nil {
		t.Fatalf("EvaluateCompliancePolicy returned error: %v", err)
	}
	if deny.Decision != ComplianceDeny {
		t.Fatalf("decision = %q, want %q", deny.Decision, ComplianceDeny)
	}
	assertContainsReason(t, deny.Reasons, "geo_blocked")
	assertContainsReason(t, deny.Reasons, "address_screening_sanctions_hit")
}

func TestEvaluateCompliancePolicyRejectsAmbiguousUnits(t *testing.T) {
	_, err := EvaluateCompliancePolicy(CompliancePolicyInput{
		SubjectType:      "deposit",
		AmountUnits:      "25.0",
		GeoAllowed:       true,
		AddressScreening: AddressScreeningClear,
	})
	if err == nil {
		t.Fatalf("expected base-unit validation error")
	}
}

func assertContainsReason(t *testing.T, reasons []string, want string) {
	t.Helper()
	for _, reason := range reasons {
		if reason == want {
			return
		}
	}
	t.Fatalf("reasons = %v, missing %q", reasons, want)
}

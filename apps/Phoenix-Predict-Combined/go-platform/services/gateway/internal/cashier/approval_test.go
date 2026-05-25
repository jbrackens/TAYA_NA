package cashier

import "testing"

func TestHasTwoPersonApprovalRequiresDistinctApprovingOperators(t *testing.T) {
	approval := RecoveryApproval{
		ID:             "approval_test_001",
		RecoveryCaseID: "rec_test_001",
		OperatorID:     "ops_ana",
		ApprovalType:   "release_above_beta_cap",
		Decision:       "approve",
		EvidenceSHA256: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
	}

	if HasTwoPersonApproval([]RecoveryApproval{approval, {ID: "approval_test_002", OperatorID: "ops_ana", ApprovalType: approval.ApprovalType, Decision: "approve"}}, approval.ApprovalType) {
		t.Fatalf("same operator must not count twice")
	}

	if !HasTwoPersonApproval([]RecoveryApproval{approval, {ID: "approval_test_002", OperatorID: "ops_bea", ApprovalType: approval.ApprovalType, Decision: "approve"}}, approval.ApprovalType) {
		t.Fatalf("two distinct approving operators should satisfy two-person approval")
	}

	if HasTwoPersonApproval([]RecoveryApproval{approval, {ID: "approval_test_003", OperatorID: "ops_bea", ApprovalType: approval.ApprovalType, Decision: "deny"}}, approval.ApprovalType) {
		t.Fatalf("denial must not satisfy two-person approval")
	}
}

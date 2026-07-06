package cashier

import "testing"

func TestDepositTransitionsAreFailClosed(t *testing.T) {
	if !CanTransitionDeposit(DepositCreated, DepositAddressIssued) {
		t.Fatalf("created should transition to address_issued")
	}
	if !CanTransitionDeposit(DepositBridging, DepositSettled) {
		t.Fatalf("bridging should transition to settled")
	}
	if CanTransitionDeposit(DepositSettled, DepositBridging) {
		t.Fatalf("settled deposits must be terminal")
	}
	if !IsTerminalDeposit(DepositRecoveryRequired) {
		t.Fatalf("recovery_required should be terminal")
	}
	if err := ValidateDepositTransition(DepositCreated, DepositSettled); err == nil {
		t.Fatalf("created must not jump directly to settled")
	}
}

func TestWithdrawalTransitionsRequireAuthorization(t *testing.T) {
	if CanTransitionWithdrawal(WithdrawalCreated, WithdrawalSubmitted) {
		t.Fatalf("withdrawal must not submit before user authorization and policy approval")
	}
	if !CanTransitionWithdrawal(WithdrawalUserAuthorized, WithdrawalPolicyApproved) {
		t.Fatalf("user_authorized should transition to policy_approved")
	}
	if !IsTerminalWithdrawal(WithdrawalConfirmed) {
		t.Fatalf("confirmed withdrawals should be terminal")
	}
}

func TestRelayerTransitionsAllowReplacementButNotIncludedMutation(t *testing.T) {
	if !CanTransitionRelayer(RelayerSubmitted, RelayerReplaced) {
		t.Fatalf("submitted relayer tx should allow replacement")
	}
	if !CanTransitionRelayer(RelayerReplaced, RelayerSubmitted) {
		t.Fatalf("replacement should allow resubmission")
	}
	if CanTransitionRelayer(RelayerIncluded, RelayerSubmitted) {
		t.Fatalf("included relayer submissions must be terminal")
	}
}

func TestRecoveryTransitionsCloseTerminally(t *testing.T) {
	if !CanTransitionRecovery(RecoveryTriage, RecoveryWaitingOnProvider) {
		t.Fatalf("triage should transition to waiting_on_provider")
	}
	if !CanTransitionRecovery(RecoveryComplianceHold, RecoveryReadyForRelease) {
		t.Fatalf("compliance_hold should transition to ready_for_release")
	}
	if !CanTransitionRecovery(RecoveryReadyForRelease, RecoveryClosed) {
		t.Fatalf("ready_for_release should transition to closed")
	}
	if CanTransitionRecovery(RecoveryClosed, RecoveryTriage) {
		t.Fatalf("closed recovery cases must not reopen")
	}
}

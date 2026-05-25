package cashier

import "fmt"

type DepositStatus string
type WithdrawalStatus string
type RelayerStatus string
type RecoveryCaseStatus string

const (
	DepositCreated          DepositStatus = "created"
	DepositAddressIssued    DepositStatus = "address_issued"
	DepositSourceDetected   DepositStatus = "source_detected"
	DepositBridging         DepositStatus = "bridging"
	DepositSettled          DepositStatus = "settled"
	DepositRecoveryRequired DepositStatus = "recovery_required"
	DepositFailed           DepositStatus = "failed"

	WithdrawalCreated          WithdrawalStatus = "created"
	WithdrawalUserAuthorized   WithdrawalStatus = "user_authorized"
	WithdrawalPolicyApproved   WithdrawalStatus = "policy_approved"
	WithdrawalSubmitted        WithdrawalStatus = "submitted"
	WithdrawalConfirmed        WithdrawalStatus = "confirmed"
	WithdrawalRecoveryRequired WithdrawalStatus = "recovery_required"
	WithdrawalFailed           WithdrawalStatus = "failed"

	RelayerQueued    RelayerStatus = "queued"
	RelayerSubmitted RelayerStatus = "submitted"
	RelayerIncluded  RelayerStatus = "included"
	RelayerReplaced  RelayerStatus = "replaced"
	RelayerDropped   RelayerStatus = "dropped"
	RelayerFailed    RelayerStatus = "failed"

	RecoveryTriage            RecoveryCaseStatus = "triage"
	RecoveryWaitingOnProvider RecoveryCaseStatus = "waiting_on_provider"
	RecoveryWaitingOnUser     RecoveryCaseStatus = "waiting_on_user"
	RecoveryComplianceHold    RecoveryCaseStatus = "compliance_hold"
	RecoveryReadyForRelease   RecoveryCaseStatus = "ready_for_release"
	RecoveryClosed            RecoveryCaseStatus = "closed"
)

var depositTransitions = map[DepositStatus]map[DepositStatus]bool{
	DepositCreated:          {DepositAddressIssued: true, DepositRecoveryRequired: true, DepositFailed: true},
	DepositAddressIssued:    {DepositSourceDetected: true, DepositRecoveryRequired: true, DepositFailed: true},
	DepositSourceDetected:   {DepositBridging: true, DepositRecoveryRequired: true, DepositFailed: true},
	DepositBridging:         {DepositSettled: true, DepositRecoveryRequired: true, DepositFailed: true},
	DepositSettled:          {},
	DepositRecoveryRequired: {},
	DepositFailed:           {},
}

var withdrawalTransitions = map[WithdrawalStatus]map[WithdrawalStatus]bool{
	WithdrawalCreated:          {WithdrawalUserAuthorized: true, WithdrawalRecoveryRequired: true, WithdrawalFailed: true},
	WithdrawalUserAuthorized:   {WithdrawalPolicyApproved: true, WithdrawalRecoveryRequired: true, WithdrawalFailed: true},
	WithdrawalPolicyApproved:   {WithdrawalSubmitted: true, WithdrawalRecoveryRequired: true, WithdrawalFailed: true},
	WithdrawalSubmitted:        {WithdrawalConfirmed: true, WithdrawalRecoveryRequired: true, WithdrawalFailed: true},
	WithdrawalConfirmed:        {},
	WithdrawalRecoveryRequired: {},
	WithdrawalFailed:           {},
}

var relayerTransitions = map[RelayerStatus]map[RelayerStatus]bool{
	RelayerQueued:    {RelayerSubmitted: true, RelayerFailed: true},
	RelayerSubmitted: {RelayerIncluded: true, RelayerReplaced: true, RelayerDropped: true, RelayerFailed: true},
	RelayerIncluded:  {},
	RelayerReplaced:  {RelayerSubmitted: true, RelayerIncluded: true, RelayerDropped: true, RelayerFailed: true},
	RelayerDropped:   {RelayerSubmitted: true, RelayerFailed: true},
	RelayerFailed:    {},
}

var recoveryTransitions = map[RecoveryCaseStatus]map[RecoveryCaseStatus]bool{
	RecoveryTriage: {
		RecoveryWaitingOnProvider: true,
		RecoveryWaitingOnUser:     true,
		RecoveryComplianceHold:    true,
		RecoveryReadyForRelease:   true,
		RecoveryClosed:            true,
	},
	RecoveryWaitingOnProvider: {
		RecoveryTriage:          true,
		RecoveryWaitingOnUser:   true,
		RecoveryComplianceHold:  true,
		RecoveryReadyForRelease: true,
		RecoveryClosed:          true,
	},
	RecoveryWaitingOnUser: {
		RecoveryTriage:            true,
		RecoveryWaitingOnProvider: true,
		RecoveryComplianceHold:    true,
		RecoveryReadyForRelease:   true,
		RecoveryClosed:            true,
	},
	RecoveryComplianceHold:  {RecoveryTriage: true, RecoveryReadyForRelease: true, RecoveryClosed: true},
	RecoveryReadyForRelease: {RecoveryClosed: true},
	RecoveryClosed:          {},
}

func CanTransitionDeposit(from, to DepositStatus) bool {
	return canTransition(depositTransitions, from, to)
}

func CanTransitionWithdrawal(from, to WithdrawalStatus) bool {
	return canTransition(withdrawalTransitions, from, to)
}

func CanTransitionRelayer(from, to RelayerStatus) bool {
	return canTransition(relayerTransitions, from, to)
}

func CanTransitionRecovery(from, to RecoveryCaseStatus) bool {
	return canTransition(recoveryTransitions, from, to)
}

func IsTerminalDeposit(status DepositStatus) bool {
	return status == DepositSettled || status == DepositRecoveryRequired || status == DepositFailed
}

func IsTerminalWithdrawal(status WithdrawalStatus) bool {
	return status == WithdrawalConfirmed || status == WithdrawalRecoveryRequired || status == WithdrawalFailed
}

func IsTerminalRelayer(status RelayerStatus) bool {
	return status == RelayerIncluded || status == RelayerFailed
}

func IsTerminalRecovery(status RecoveryCaseStatus) bool {
	return status == RecoveryClosed
}

func ValidateDepositTransition(from, to DepositStatus) error {
	if CanTransitionDeposit(from, to) {
		return nil
	}
	return fmt.Errorf("invalid deposit transition from %q to %q", from, to)
}

func canTransition[T comparable](transitions map[T]map[T]bool, from, to T) bool {
	allowed, ok := transitions[from]
	if !ok {
		return false
	}
	return allowed[to]
}

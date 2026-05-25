package cashier

import (
	"strings"
	"time"
)

type RelayerSubmission struct {
	ID                         string
	Status                     RelayerStatus
	SettlementChain            string
	UserID                     string
	SmartWalletAddress         string
	TargetContract             string
	CalldataSHA256             string
	UserAuthorizationHash      string
	UserAuthorizationNonce     string
	UserAuthorizationExpiresAt time.Time
}

type RelayerPolicyInput struct {
	Submission                 RelayerSubmission
	ComplianceDecision         ComplianceDecision
	AllowedTargets             []string
	AllowedSelectors           []string
	CalldataSelector           string
	AmountUnits                string
	MaxAmountUnits             string
	PaymasterRunwaySeconds     int64
	MinPaymasterRunwaySeconds  int64
	AlreadySubmittedOrIncluded bool
	Now                        time.Time
	Paused                     bool
}

type RelayerPolicyResult struct {
	Decision string
	Reasons  []string
}

func EvaluateRelayerPolicy(input RelayerPolicyInput) RelayerPolicyResult {
	result := RelayerPolicyResult{Decision: "allow"}

	if input.Paused {
		result.deny("relayer_paused")
	}
	if input.ComplianceDecision != ComplianceAllow {
		result.deny("compliance_" + string(input.ComplianceDecision))
	}
	if !containsFold(input.AllowedTargets, input.Submission.TargetContract) {
		result.deny("target_not_allowlisted")
	}
	if !containsFold(input.AllowedSelectors, input.CalldataSelector) {
		result.deny("selector_not_allowlisted")
	}
	if input.AmountUnits != "" && input.MaxAmountUnits != "" {
		amount, amountErr := parseBaseUnits(input.AmountUnits, "amount_units")
		maxAmount, maxErr := parseBaseUnits(input.MaxAmountUnits, "max_amount_units")
		if amountErr != nil {
			result.deny(amountErr.Error())
		}
		if maxErr != nil {
			result.deny(maxErr.Error())
		}
		if amountErr == nil && maxErr == nil && amount.Cmp(maxAmount) > 0 {
			result.deny("amount_above_cap")
		}
	}
	if input.PaymasterRunwaySeconds < input.MinPaymasterRunwaySeconds {
		result.deny("paymaster_runway_too_low")
	}
	if input.AlreadySubmittedOrIncluded {
		result.deny("idempotency_key_already_submitted")
	}
	if input.Submission.UserAuthorizationExpiresAt.IsZero() || !input.Submission.UserAuthorizationExpiresAt.After(input.Now) {
		result.deny("authorization_expired")
	}

	return result
}

func (result *RelayerPolicyResult) deny(reason string) {
	result.Decision = "deny"
	result.Reasons = append(result.Reasons, reason)
}

func containsFold(values []string, value string) bool {
	for _, candidate := range values {
		if strings.EqualFold(candidate, value) {
			return true
		}
	}
	return false
}

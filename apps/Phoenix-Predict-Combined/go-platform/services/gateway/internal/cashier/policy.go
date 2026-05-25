package cashier

import (
	"fmt"
	"math/big"
	"regexp"
)

type ComplianceDecision string
type AddressScreeningStatus string

const (
	ComplianceAllow        ComplianceDecision = "allow"
	ComplianceManualReview ComplianceDecision = "manual_review"
	ComplianceQuarantine   ComplianceDecision = "quarantine"
	ComplianceDeny         ComplianceDecision = "deny"

	AddressScreeningClear        AddressScreeningStatus = "clear"
	AddressScreeningManualReview AddressScreeningStatus = "manual_review"
	AddressScreeningSanctionsHit AddressScreeningStatus = "sanctions_hit"
	AddressScreeningUnavailable  AddressScreeningStatus = "unavailable"
)

type CompliancePolicyInput struct {
	SubjectType            string
	AmountUnits            string
	PerTransactionCapUnits string
	DailyAggregateUnits    string
	DailyCapUnits          string
	GeoAllowed             bool
	AddressScreening       AddressScreeningStatus
	Paused                 bool
}

type CompliancePolicyResult struct {
	Decision ComplianceDecision
	Reasons  []string
}

var baseUnitPattern = regexp.MustCompile(`^(0|[1-9][0-9]*)$`)

func EvaluateCompliancePolicy(input CompliancePolicyInput) (CompliancePolicyResult, error) {
	if input.SubjectType == "" {
		return CompliancePolicyResult{}, fmt.Errorf("subject type must be non-empty")
	}
	if !isKnownAddressScreeningStatus(input.AddressScreening) {
		return CompliancePolicyResult{}, fmt.Errorf("unsupported address screening status %q", input.AddressScreening)
	}

	result := CompliancePolicyResult{Decision: ComplianceAllow}

	if input.Paused {
		result.add(ComplianceManualReview, "cashier_paused")
	}
	if !input.GeoAllowed {
		result.add(ComplianceDeny, "geo_blocked")
	}

	switch input.AddressScreening {
	case AddressScreeningSanctionsHit:
		result.add(ComplianceQuarantine, "address_screening_sanctions_hit")
	case AddressScreeningManualReview:
		result.add(ComplianceManualReview, "address_screening_manual_review")
	case AddressScreeningUnavailable:
		result.add(ComplianceManualReview, "address_screening_unavailable")
	}

	if input.AmountUnits == "" {
		return result, nil
	}
	amount, err := parseBaseUnits(input.AmountUnits, "amount_units")
	if err != nil {
		return CompliancePolicyResult{}, err
	}
	if input.PerTransactionCapUnits != "" {
		cap, err := parseBaseUnits(input.PerTransactionCapUnits, "per_transaction_cap_units")
		if err != nil {
			return CompliancePolicyResult{}, err
		}
		if amount.Cmp(cap) > 0 {
			result.add(ComplianceManualReview, "per_transaction_cap_exceeded")
		}
	}
	if input.DailyAggregateUnits != "" && input.DailyCapUnits != "" {
		aggregate, err := parseBaseUnits(input.DailyAggregateUnits, "daily_aggregate_units")
		if err != nil {
			return CompliancePolicyResult{}, err
		}
		dailyCap, err := parseBaseUnits(input.DailyCapUnits, "daily_cap_units")
		if err != nil {
			return CompliancePolicyResult{}, err
		}
		if new(big.Int).Add(aggregate, amount).Cmp(dailyCap) > 0 {
			result.add(ComplianceManualReview, "daily_cap_exceeded")
		}
	}

	return result, nil
}

func (result *CompliancePolicyResult) add(decision ComplianceDecision, reason string) {
	result.Reasons = append(result.Reasons, reason)
	if complianceDecisionRank(decision) > complianceDecisionRank(result.Decision) {
		result.Decision = decision
	}
}

func complianceDecisionRank(decision ComplianceDecision) int {
	switch decision {
	case ComplianceAllow:
		return 0
	case ComplianceManualReview:
		return 1
	case ComplianceQuarantine:
		return 2
	case ComplianceDeny:
		return 3
	default:
		return -1
	}
}

func isKnownAddressScreeningStatus(status AddressScreeningStatus) bool {
	switch status {
	case AddressScreeningClear, AddressScreeningManualReview, AddressScreeningSanctionsHit, AddressScreeningUnavailable:
		return true
	default:
		return false
	}
}

func parseBaseUnits(value string, field string) (*big.Int, error) {
	if !baseUnitPattern.MatchString(value) {
		return nil, fmt.Errorf("%s must be a non-negative base-unit integer string", field)
	}
	parsed, ok := new(big.Int).SetString(value, 10)
	if !ok {
		return nil, fmt.Errorf("%s must be a base-unit integer string", field)
	}
	return parsed, nil
}

package prediction

import (
	"encoding/json"
	"errors"
	"strings"
)

// ErrJurisdictionUnsupported is returned when a per-market jurisdiction write is
// attempted against a repository that has no overlay storage (e.g. an in-memory
// fake). The global geo gate still applies in that case.
var ErrJurisdictionUnsupported = errors.New("per-market jurisdiction policy not supported by this repository")

// JurisdictionMode is the overlay mode for a per-market jurisdiction policy.
type JurisdictionMode string

const (
	// JurisdictionAllow restricts trading to the listed countries (a subset of
	// whatever the global gate already permits).
	JurisdictionAllow JurisdictionMode = "allow"
	// JurisdictionDeny blocks the listed countries (on top of the global gate).
	JurisdictionDeny JurisdictionMode = "deny"
)

// MarketJurisdictionPolicy is an optional per-market country overlay (P3-07).
// It is evaluated AFTER the global geo gate (P1-07) and can only further
// restrict access — the global allowlist is the floor, so this overlay adds
// denials and never widens. Stored as the prediction_markets.jurisdiction_policy
// JSONB column (migration 035).
type MarketJurisdictionPolicy struct {
	Mode      JurisdictionMode `json:"mode"`
	Countries []string         `json:"countries"`
}

// ParseMarketJurisdictionPolicy decodes the JSONB column. Returns (nil, nil)
// for NULL / empty / "{}" (no overlay). An unrecognized mode or empty country
// list is treated as no overlay (nil) rather than an error, so a malformed row
// can never silently block all trading: it fails OPEN to the global gate, which
// remains the enforced floor. Operators set policy through a validated path.
func ParseMarketJurisdictionPolicy(raw json.RawMessage) (*MarketJurisdictionPolicy, error) {
	s := strings.TrimSpace(string(raw))
	if s == "" || s == "null" || s == "{}" {
		return nil, nil
	}
	var p MarketJurisdictionPolicy
	if err := json.Unmarshal(raw, &p); err != nil {
		return nil, err
	}
	p.Mode = JurisdictionMode(strings.ToLower(strings.TrimSpace(string(p.Mode))))
	if p.Mode != JurisdictionAllow && p.Mode != JurisdictionDeny {
		return nil, nil
	}
	if len(p.Countries) == 0 {
		return nil, nil
	}
	return &p, nil
}

// EvaluateMarketJurisdiction reports whether a user in `country` may trade a
// market carrying `policy`. Pure.
//
//   - nil policy → always allowed (the global gate is the only control).
//   - empty country → allowed here: there is no signal to evaluate, and the
//     global gate owns missing-signal handling (fail-closed under a trusted
//     proxy), so the overlay neither double-penalizes nor becomes a bypass
//     beyond the floor the global gate already enforced.
//
// Country codes are ISO-3166 alpha-2, matched case-insensitively.
func EvaluateMarketJurisdiction(policy *MarketJurisdictionPolicy, country string) (allowed bool, reason string) {
	if policy == nil {
		return true, ""
	}
	country = strings.ToUpper(strings.TrimSpace(country))
	if country == "" {
		return true, ""
	}
	listed := false
	for _, c := range policy.Countries {
		if strings.EqualFold(strings.TrimSpace(c), country) {
			listed = true
			break
		}
	}
	const denyMsg = "this market is not available in your region"
	switch policy.Mode {
	case JurisdictionAllow:
		if !listed {
			return false, denyMsg
		}
	case JurisdictionDeny:
		if listed {
			return false, denyMsg
		}
	}
	return true, ""
}

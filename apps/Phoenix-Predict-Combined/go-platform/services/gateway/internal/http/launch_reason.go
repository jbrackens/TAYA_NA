package http

import (
	"regexp"
	"strings"

	"phoenix-revival/platform/transport/httpx"
)

var (
	launchReasonCopyProhibited       = regexp.MustCompile(`(?i)(\$|\b(cash|cashout|deposit|withdraw|withdrawal|crypto|fiat|freebets?|bets?|prizes?|payout|sportsbook|stakes?|wagers?|wagering|usdc|usd|dollars?|money|redeem)\b)`)
	launchReasonRedeemableProhibited = regexp.MustCompile(`(?i)\bredeemable\b`)
	launchReasonNonRedeemableAllowed = regexp.MustCompile(`(?i)\bnon-redeemable\b`)
)

const launchRedactedUserText = "Removed by points-only safety boundary."

func launchReasonHasProhibitedCopy(reason string) bool {
	if reason == "" {
		return false
	}
	if launchReasonCopyProhibited.MatchString(reason) {
		return true
	}
	redeemableCandidate := launchReasonNonRedeemableAllowed.ReplaceAllString(reason, "")
	return launchReasonRedeemableProhibited.MatchString(redeemableCandidate)
}

func validateLaunchFacingReason(field string, reason string) error {
	if launchReasonHasProhibitedCopy(reason) {
		return httpx.BadRequest(field+" must use point-native wording", map[string]any{"field": field})
	}
	return nil
}

func redactLaunchProhibitedUserText(value string) string {
	if launchReasonHasProhibitedCopy(value) {
		return launchRedactedUserText
	}
	return value
}

func trimStringPointer(value *string) *string {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

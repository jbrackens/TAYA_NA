package compliance

import "regexp"

// LaunchRedactedText is the sentinel that replaces user-visible copy caught by
// the points-only launch-safety scrub. Mirrored by LAUNCH_REDACTED_TITLE in
// packages/api-client/src/prediction-client.ts — change both together.
const LaunchRedactedText = "Removed by points-only safety boundary."

// launchProhibitedTermsPattern is the single source of truth for the
// prohibited-copy word list. Both the Go regex below and the Postgres
// translation in LaunchProhibitedCopySQLCondition are built from it, so the
// serving-time scrub and the SQL list-exclusion filter cannot drift apart.
const launchProhibitedTermsPattern = `cash|cashout|deposit|withdraw|withdrawal|crypto|fiat|freebets?|bets?|prizes?|payout|sportsbook|stakes?|wagers?|wagering|usdc|usd|dollars?|money|redeem`

var (
	launchComplianceCopyProhibited       = regexp.MustCompile(`(?i)(\$|\b(` + launchProhibitedTermsPattern + `)\b)`)
	launchComplianceRedeemableProhibited = regexp.MustCompile(`(?i)\bredeemable\b`)
	launchComplianceNonRedeemableAllowed = regexp.MustCompile(`(?i)\bnon-redeemable\b`)
)

// HasLaunchProhibitedCopy reports whether the value would be replaced with
// LaunchRedactedText by the launch-safety scrub: it contains a dollar sign or
// a prohibited money/wagering term, or says "redeemable" outside the allowed
// "non-redeemable" phrasing.
func HasLaunchProhibitedCopy(value string) bool {
	if value == "" {
		return false
	}
	if launchComplianceCopyProhibited.MatchString(value) {
		return true
	}
	redeemableCandidate := launchComplianceNonRedeemableAllowed.ReplaceAllString(value, "")
	return launchComplianceRedeemableProhibited.MatchString(redeemableCandidate)
}

// LaunchProhibitedCopySQLCondition returns a Postgres boolean expression that
// mirrors HasLaunchProhibitedCopy for the given column expression. Postgres
// ARE `\y` is the word boundary (Go's `\b`); `~*` matches case-insensitively.
// The terms alternation is shared with the Go regex via
// launchProhibitedTermsPattern.
func LaunchProhibitedCopySQLCondition(column string) string {
	return `(` + column + ` ~* '(\$|\y(` + launchProhibitedTermsPattern + `)\y)'` +
		` OR regexp_replace(` + column + `, '\ynon-redeemable\y', '', 'gi') ~* '\yredeemable\y')`
}

func redactLaunchProhibitedComplianceText(value string) string {
	if HasLaunchProhibitedCopy(value) {
		return LaunchRedactedText
	}
	return value
}

func kycStatusPayload(status *KYCStatus) *KYCStatus {
	if status == nil {
		return nil
	}
	out := *status
	if len(status.RejectionReasons) > 0 {
		out.RejectionReasons = make([]string, len(status.RejectionReasons))
		for i, reason := range status.RejectionReasons {
			out.RejectionReasons[i] = redactLaunchProhibitedComplianceText(reason)
		}
	}
	if status.DocumentsSubmitted != nil {
		out.DocumentsSubmitted = append([]string(nil), status.DocumentsSubmitted...)
	}
	if status.Metadata != nil {
		out.Metadata = make(map[string]string, len(status.Metadata))
		for key, value := range status.Metadata {
			out.Metadata[key] = value
		}
	}
	return &out
}

func kycDocumentPayloads(documents []VerificationDocument) []VerificationDocument {
	out := make([]VerificationDocument, 0, len(documents))
	for _, doc := range documents {
		doc.RejectReason = redactLaunchProhibitedComplianceText(doc.RejectReason)
		out = append(out, doc)
	}
	return out
}

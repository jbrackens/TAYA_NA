package compliance

import "regexp"

const launchRedactedComplianceText = "Removed by points-only safety boundary."

var (
	launchComplianceCopyProhibited       = regexp.MustCompile(`(?i)(\$|\b(cash|cashout|deposit|withdraw|withdrawal|crypto|fiat|freebets?|bets?|prizes?|payout|sportsbook|stakes?|wagers?|wagering|usdc|usd|dollars?|money|redeem)\b)`)
	launchComplianceRedeemableProhibited = regexp.MustCompile(`(?i)\bredeemable\b`)
	launchComplianceNonRedeemableAllowed = regexp.MustCompile(`(?i)\bnon-redeemable\b`)
)

func redactLaunchProhibitedComplianceText(value string) string {
	if launchComplianceCopyProhibited.MatchString(value) {
		return launchRedactedComplianceText
	}
	redeemableCandidate := launchComplianceNonRedeemableAllowed.ReplaceAllString(value, "")
	if launchComplianceRedeemableProhibited.MatchString(redeemableCandidate) {
		return launchRedactedComplianceText
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

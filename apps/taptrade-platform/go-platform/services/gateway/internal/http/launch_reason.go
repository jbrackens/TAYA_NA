package http

import (
	"strings"

	"taptrade/gateway/internal/compliance"
	"taptrade/platform/transport/httpx"
)

// The scrub predicate and sentinel live in internal/compliance
// (launch_safety.go) so the HTTP payload scrub, the compliance payloads, and
// the SQL list-exclusion filter all share one definition.
const launchRedactedUserText = compliance.LaunchRedactedText

func launchReasonHasProhibitedCopy(reason string) bool {
	return compliance.HasLaunchProhibitedCopy(reason)
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

// launchListableStrings drops values that trip the launch-safety scrub
// instead of redacting them. Redaction is right for a field that must keep
// its slot (a reason, a description); for list content (tags, benefit lines)
// the sentinel itself becomes browsable data — an artifact, not a value — so
// prohibited entries are removed entirely.
func launchListableStrings(values []string) []string {
	if len(values) == 0 {
		return values
	}
	out := make([]string, 0, len(values))
	for _, value := range values {
		if launchReasonHasProhibitedCopy(value) {
			continue
		}
		out = append(out, value)
	}
	return out
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

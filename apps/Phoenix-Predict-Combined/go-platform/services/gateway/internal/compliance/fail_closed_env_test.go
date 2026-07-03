package compliance

import "testing"

// TestIsDeployedEnvironment (GAP-69): the shared dev-allowlist must treat ANY
// non-canonical deployed ENVIRONMENT value — "prod", "preprod", a typo, or one
// with stray case/whitespace — as deployed, so the money-path gates that now
// call IsDeployedEnvironment (deposit RG, withdrawal + trade KYC on a
// compliance-store error) fail CLOSED there instead of taking the dev
// fail-open branch. Only the explicit dev values are development.
func TestIsDeployedEnvironment(t *testing.T) {
	for env, wantDeployed := range map[string]bool{
		"":             false,
		"development":  false,
		"dev":          false,
		"test":         false,
		"testing":      false,
		"local":        false,
		"ci":           false,
		"production":   true,
		"staging":      true,
		"prod":         true, // non-canonical deployed — must NOT be treated as dev
		"preprod":      true,
		"produciton":   true, // typo
		" Production ": true, // stray whitespace + case
		"PROD":         true,
	} {
		if got := IsDeployedEnvironment(env); got != wantDeployed {
			t.Fatalf("IsDeployedEnvironment(%q) = %v, want %v", env, got, wantDeployed)
		}
	}
}

package main

import "testing"

// baseProdEnv returns a getenv that satisfies every prod boot requirement
// except the keys the caller overrides — so a single failing assertion is
// attributable to the override under test, not unrelated missing config.
func baseProdEnv(overrides map[string]string) func(string) string {
	base := map[string]string{
		"ENVIRONMENT":             "production",
		"PAYMENTS_WEBHOOK_SECRET": "whsec_present",
		"GEO_GATE_ENABLED":        "true",
		"GEO_ALLOWED_COUNTRIES":   "PH,TH,VN",
		"KYC_ENFORCEMENT":         "true",
		"KYC_REQUIRED_FOR_TRADING": "true",
	}
	for k, v := range overrides {
		base[k] = v
	}
	return func(key string) string { return base[key] }
}

// Audit SEC-03: require-mode without a shared secret is a boot error in prod.
func TestValidateRequiresEdgeSecretWhenTrustedProxyRequired(t *testing.T) {
	err := validateGatewayRuntimeConfig(baseProdEnv(map[string]string{
		"GEO_TRUSTED_PROXY_MODE": "require",
		"EDGE_SHARED_SECRET":     "",
	}))
	if err == nil {
		t.Fatal("expected boot error: GEO_TRUSTED_PROXY_MODE=require without EDGE_SHARED_SECRET")
	}
}

func TestValidateAllowsTrustedProxyWithEdgeSecret(t *testing.T) {
	err := validateGatewayRuntimeConfig(baseProdEnv(map[string]string{
		"GEO_TRUSTED_PROXY_MODE": "require",
		"EDGE_SHARED_SECRET":     "s3cret-edge-value",
	}))
	if err != nil {
		t.Fatalf("expected boot to pass with edge secret set, got %v", err)
	}
}

func TestValidateAllowsTrustedProxyOffWithoutSecret(t *testing.T) {
	// Not in require-mode: no edge secret needed (dev/demo, or edge that only
	// escalates missing-signal logging).
	err := validateGatewayRuntimeConfig(baseProdEnv(map[string]string{
		"GEO_TRUSTED_PROXY_MODE": "",
		"EDGE_SHARED_SECRET":     "",
	}))
	if err != nil {
		t.Fatalf("expected boot to pass when trusted-proxy mode is off, got %v", err)
	}
}

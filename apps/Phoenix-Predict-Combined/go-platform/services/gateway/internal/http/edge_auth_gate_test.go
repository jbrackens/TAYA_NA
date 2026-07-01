package http

import (
	"net/http/httptest"
	"testing"

	"phoenix-revival/gateway/internal/compliance"
)

// Audit SEC-03: with a trusted edge declared (GEO_TRUSTED_PROXY_MODE=require +
// EDGE_SHARED_SECRET), a guarded request that lacks the edge-auth header
// must be denied before its country header is even read — closing the
// direct-to-origin geo-spoof path.
func TestCheckComplianceGates_EdgeAuthAntiSpoof(t *testing.T) {
	t.Setenv("GEO_GATE_ENABLED", "true")
	t.Setenv("GEO_ALLOWED_COUNTRIES", "PH")
	t.Setenv("BETA_COMPLIANCE_MODE", "")
	t.Setenv("GEO_TRUSTED_PROXY_MODE", "require")
	t.Setenv("EDGE_SHARED_SECRET", "edge-secret-xyz")

	prev := tradeGeoGate
	tradeGeoGate = compliance.NewGeoGateFromEnv()
	t.Cleanup(func() { tradeGeoGate = prev })

	// Forged direct-origin request: claims an allowed country but carries no
	// edge-auth header → denied.
	forged := httptest.NewRequest("POST", "/api/v1/orders", nil)
	forged.Header.Set("CF-IPCountry", "PH")
	if err := checkComplianceGates(forged, "u-attacker", compliance.SurfaceTrade); err == nil {
		t.Fatal("origin-direct request without edge-auth must be denied even with an allowed country")
	}

	// Same request with the correct edge-auth secret and an allowed country →
	// passes (it really came through the edge).
	legit := httptest.NewRequest("POST", "/api/v1/orders", nil)
	legit.Header.Set("CF-IPCountry", "PH")
	legit.Header.Set("X-Edge-Auth", "edge-secret-xyz")
	if err := checkComplianceGates(legit, "u-legit", compliance.SurfaceTrade); err != nil {
		t.Fatalf("edge-authenticated request from an allowed country must pass, got %v", err)
	}

	// Wrong secret → denied.
	wrong := httptest.NewRequest("POST", "/api/v1/orders", nil)
	wrong.Header.Set("CF-IPCountry", "PH")
	wrong.Header.Set("X-Edge-Auth", "not-the-secret")
	if err := checkComplianceGates(wrong, "u-attacker2", compliance.SurfaceTrade); err == nil {
		t.Fatal("request with a wrong edge-auth secret must be denied")
	}
}

// Without require-mode (or without a configured secret), edge-auth is not
// enforced — dev/demo and edges that only escalate logging are unaffected.
func TestCheckComplianceGates_EdgeAuthOffByDefault(t *testing.T) {
	t.Setenv("GEO_GATE_ENABLED", "true")
	t.Setenv("GEO_ALLOWED_COUNTRIES", "PH")
	t.Setenv("BETA_COMPLIANCE_MODE", "")
	t.Setenv("GEO_TRUSTED_PROXY_MODE", "")
	t.Setenv("EDGE_SHARED_SECRET", "")

	prev := tradeGeoGate
	tradeGeoGate = compliance.NewGeoGateFromEnv()
	t.Cleanup(func() { tradeGeoGate = prev })

	r := httptest.NewRequest("POST", "/api/v1/orders", nil)
	r.Header.Set("CF-IPCountry", "PH")
	if err := checkComplianceGates(r, "u-dev", compliance.SurfaceTrade); err != nil {
		t.Fatalf("with edge-auth off, an allowed-country request must pass, got %v", err)
	}
}

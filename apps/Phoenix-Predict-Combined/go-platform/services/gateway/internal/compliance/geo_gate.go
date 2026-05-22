package compliance

import (
	"os"
	"strings"
)

// GeoGate is a feature-flagged jurisdiction gate for the prediction trading and
// deposit paths. The launch policy is "outside US only", but the exact
// allow/deny jurisdiction set and the depth of enforcement are LEGAL decisions
// (see docs/compliance/geofencing-kyc.md). So this gate ships DISABLED by
// default and never makes a policy call on its own:
//
//   - GEO_GATE_ENABLED unset/false -> Evaluate always allows (no-op).
//   - GEO_GATE_ENABLED=true        -> deny countries in GEO_BLOCKED_COUNTRIES
//     (default "US"). If GEO_ALLOWED_COUNTRIES is non-empty, switch to allowlist
//     mode instead: deny anything not on the list. A missing geo signal fails
//     closed (an enabled gate must not be silently bypassable).
//
// Country codes are ISO-3166 alpha-2 (case-insensitive), supplied by an upstream
// edge/CDN header (e.g. Cloudflare's CF-IPCountry); the HTTP layer extracts it.
type GeoGate struct {
	enabled bool
	blocked map[string]bool
	allowed map[string]bool
}

// NewGeoGateFromEnv builds the gate from environment configuration. Default off.
func NewGeoGateFromEnv() *GeoGate {
	return &GeoGate{
		enabled: parseBoolEnv(os.Getenv("GEO_GATE_ENABLED")),
		blocked: parseCountrySet(defaultStringEnv(os.Getenv("GEO_BLOCKED_COUNTRIES"), "US")),
		allowed: parseCountrySet(os.Getenv("GEO_ALLOWED_COUNTRIES")),
	}
}

// Enabled reports whether the gate is active. A nil gate is treated as disabled.
func (g *GeoGate) Enabled() bool { return g != nil && g.enabled }

// Evaluate reports whether a user in countryCode may trade/deposit, and a
// user-facing reason when denied. A disabled gate always allows.
func (g *GeoGate) Evaluate(countryCode string) (allowed bool, reason string) {
	if !g.Enabled() {
		return true, ""
	}
	c := strings.ToUpper(strings.TrimSpace(countryCode))
	if c == "" {
		return false, "service not available: jurisdiction could not be verified"
	}
	if len(g.allowed) > 0 {
		if !g.allowed[c] {
			return false, "service not available in your jurisdiction"
		}
		return true, ""
	}
	if g.blocked[c] {
		return false, "service not available in your jurisdiction"
	}
	return true, ""
}

// parseCountrySet parses a comma-separated ISO country list into an uppercased
// set. Unlike parseApprovedCountriesEnv it does NOT fall back to a default set
// when empty — an unset allowlist must stay empty so allowlist mode stays off.
func parseCountrySet(raw string) map[string]bool {
	set := map[string]bool{}
	for _, tok := range strings.Split(raw, ",") {
		c := strings.ToUpper(strings.TrimSpace(tok))
		if c != "" {
			set[c] = true
		}
	}
	return set
}

package http

import (
	"context"
	"crypto/subtle"
	"log/slog"
	stdhttp "net/http"
	"os"
	"strings"
	"sync/atomic"
	"time"

	"phoenix-revival/gateway/internal/compliance"
	"phoenix-revival/gateway/internal/prediction"
	"phoenix-revival/platform/transport/httpx"
)

// Pre-trade compliance gates.
//
// Both gates ship OFF: the precise jurisdiction list and the depth of KYC are
// LEGAL decisions (see docs/compliance/geofencing-kyc.md). With the flags unset
// these are no-ops, so wiring them now changes no behavior until policy lands —
// flipping an env var turns them on without a code change.
//
// Beta policy (2026-05-25): the closed beta is intentionally permissive for
// Asia, Africa, and LATAM. BETA_COMPLIANCE_MODE=permissive disables both
// trading gates while keeping the dormant enforcement code and tests in place.

// tradeGeoGate enforces jurisdiction on the trading path. nil/disabled = no-op.
// Set from env in RegisterRoutes.
var tradeGeoGate *compliance.GeoGate

// tradeKYCGate enforces identity verification on the trading path when
// KYC_REQUIRED_FOR_TRADING=true. nil = no-op. Set from env in RegisterRoutes.
var tradeKYCGate compliance.KYCService

// geoCountryHeader is the request header an upstream edge/CDN sets with the
// caller's ISO country (Cloudflare's CF-IPCountry by default). Configurable so
// a different proxy's header can be used without a code change.
func geoCountryHeader() string {
	if h := strings.TrimSpace(os.Getenv("GEO_COUNTRY_HEADER")); h != "" {
		return h
	}
	return "CF-IPCountry"
}

// geoMissingSignalDenials counts gate denials caused by an absent country
// header. With a healthy edge every request carries the header, so a rising
// count means the edge is misconfigured (or traffic is bypassing it) — the
// kind of break that should be visible within minutes, not after a regulator
// notices. Logged with each denial when GEO_TRUSTED_PROXY_MODE=require.
var geoMissingSignalDenials atomic.Int64

// geoEdgeAuthDenials counts guarded requests rejected because they did not
// carry the shared edge-auth secret while GEO_TRUSTED_PROXY_MODE=require. A
// nonzero value means something reached the gateway origin without transiting
// the trusted edge — i.e. an attempt to bypass geo-fencing by hitting the
// origin directly with a forged country header (audit SEC-03).
var geoEdgeAuthDenials atomic.Int64

// edgeAuthHeader carries a shared secret the trusted edge (Caddy/CDN) stamps
// on every proxied request. Configurable for parity with geoCountryHeader.
func edgeAuthHeader() string {
	if h := strings.TrimSpace(os.Getenv("EDGE_AUTH_HEADER")); h != "" {
		return h
	}
	return "X-Edge-Auth"
}

// edgeRequestVerified reports whether a request carries the configured
// edge-auth secret. Only meaningful when GEO_TRUSTED_PROXY_MODE=require AND
// EDGE_SHARED_SECRET is set; callers gate on requireEdgeAuth() first. The
// compare is constant-time. With no secret configured this returns true so
// dev/demo (no edge) is unaffected — boot validation forbids that combination
// in prod/staging (see validateGatewayRuntimeConfig).
func edgeRequestVerified(r *stdhttp.Request) bool {
	secret := strings.TrimSpace(os.Getenv("EDGE_SHARED_SECRET"))
	if secret == "" {
		return true
	}
	got := strings.TrimSpace(r.Header.Get(edgeAuthHeader()))
	return subtle.ConstantTimeCompare([]byte(got), []byte(secret)) == 1
}

// requireEdgeAuth reports whether guarded requests must prove they came
// through the trusted edge: trusted-proxy mode on AND a secret configured.
func requireEdgeAuth() bool {
	return trustedProxyModeRequired() && strings.TrimSpace(os.Getenv("EDGE_SHARED_SECRET")) != ""
}

// trustedProxyModeRequired reports whether the deploy declares a trusted
// edge that always sets the country header (GEO_TRUSTED_PROXY_MODE=require).
// The gate already fails closed on a missing signal either way; this flag
// only escalates missing-signal denials from routine geo denials to loud
// edge-misconfiguration errors with a running counter.
func trustedProxyModeRequired() bool {
	return strings.EqualFold(strings.TrimSpace(os.Getenv("GEO_TRUSTED_PROXY_MODE")), "require")
}

func tradingKYCRequired() bool {
	if permissiveBetaComplianceMode() {
		return false
	}
	return strings.EqualFold(strings.TrimSpace(os.Getenv("KYC_REQUIRED_FOR_TRADING")), "true")
}

func permissiveBetaComplianceMode() bool {
	mode := strings.ToLower(strings.TrimSpace(os.Getenv("BETA_COMPLIANCE_MODE")))
	if mode == "" {
		mode = strings.ToLower(strings.TrimSpace(os.Getenv("COMPLIANCE_MODE")))
	}
	switch mode {
	case "permissive", "permissive_beta", "beta_permissive":
		return true
	default:
		return false
	}
}

func logPreTradeComplianceMode(environment string, gate *compliance.GeoGate) {
	env := strings.ToLower(strings.TrimSpace(environment))
	if permissiveBetaComplianceMode() {
		slog.Warn(
			"pre-trade compliance running in permissive beta mode — KYC and geo trading gates are disabled",
			"environment", env,
			"beta_regions", "Asia,Africa,LATAM",
			"kyc_required_for_trading", false,
			"geo_gate_enabled", false,
		)
		return
	}
	slog.Info(
		"pre-trade compliance mode",
		"environment", env,
		"kyc_required_for_trading", tradingKYCRequired(),
		"geo_gate_enabled", gate.Enabled(),
	)
}

// checkComplianceGates blocks guarded surfaces when a configured jurisdiction
// or KYC gate denies the user. Default-off: returns nil when neither gate is
// enabled. The geo gate applies to every guarded surface; the trading-KYC gate
// applies to the trade surface only. The geo signal comes from an upstream edge
// header; an enabled geo gate with no signal fails closed. On a KYC-backend
// error it fails closed in production/staging and open in development.
func checkComplianceGates(r *stdhttp.Request, userID string, surface compliance.Surface) error {
	if permissiveBetaComplianceMode() {
		return nil
	}
	// Anti-spoof (audit SEC-03): when the deploy declares a trusted edge and a
	// shared secret, a guarded request that doesn't carry the secret never
	// transited the edge — so its CF-IPCountry is attacker-supplied. Reject it
	// before reading the country header at all. Fails closed.
	if requireEdgeAuth() && !edgeRequestVerified(r) {
		n := geoEdgeAuthDenials.Add(1)
		slog.Error("geo gate: request missing trusted-edge auth — possible origin-direct geo bypass",
			"surface", surface, "user_id", userID,
			"header", edgeAuthHeader(), "edge_auth_denials_total", n)
		return httpx.Forbidden("request did not transit the required edge")
	}
	if tradeGeoGate.Enabled() {
		country := strings.TrimSpace(r.Header.Get(geoCountryHeader()))
		if allowed, reason := tradeGeoGate.Evaluate(country); !allowed {
			if country == "" && trustedProxyModeRequired() {
				n := geoMissingSignalDenials.Add(1)
				slog.Error("geo gate: country header missing behind a trusted edge — edge misconfigured or bypassed",
					"surface", surface, "user_id", userID,
					"header", geoCountryHeader(), "missing_signal_denials_total", n)
			} else {
				logGeoDenial(userID, country, reason, surface)
			}
			return httpx.Forbidden(reason)
		}
	}

	if surface == compliance.SurfaceTrade && tradeKYCGate != nil && tradingKYCRequired() {
		gctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
		defer cancel()
		st, err := tradeKYCGate.GetVerificationStatus(gctx, userID)
		if err != nil {
			env := strings.ToLower(strings.TrimSpace(os.Getenv("ENVIRONMENT")))
			if compliance.IsDeployedEnvironment(env) { // GAP-69: fail closed for ANY deployed env
				slog.Error("trade KYC gate check failed", "user_id", userID, "env", env, "error", err)
				return httpx.Forbidden("identity verification unavailable; trading blocked")
			}
			slog.Warn("trade KYC gate check failed, allowing in dev mode", "user_id", userID, "error", err)
			return nil
		}
		if st == nil || !strings.EqualFold(strings.TrimSpace(st.Status), "approved") {
			slog.Info("trade blocked: KYC required", "user_id", userID)
			return httpx.Forbidden("identity verification required to trade — complete verification under Profile → Verification")
		}
	}
	return nil
}

func logGeoDenial(userID, country, reason string, surface compliance.Surface) {
	slog.Info(string(surface)+" blocked by geo gate",
		"surface", surface, "user_id", userID, "country", country, "reason", reason)
}

// checkMarketJurisdiction applies a market's optional per-market jurisdiction
// overlay (P3-07) AFTER the global geo gate has already passed for this request.
// It can only further restrict — the global allowlist is the floor — so a nil
// policy is a no-op. The country comes from the same trusted-edge header the
// global gate validated; missing-signal handling is owned by the global gate,
// so an empty country defers (EvaluateMarketJurisdiction allows it).
func checkMarketJurisdiction(r *stdhttp.Request, userID, marketID string, policy *prediction.MarketJurisdictionPolicy) error {
	if policy == nil {
		return nil
	}
	country := strings.TrimSpace(r.Header.Get(geoCountryHeader()))
	if allowed, reason := prediction.EvaluateMarketJurisdiction(policy, country); !allowed {
		slog.Info("trade blocked by per-market jurisdiction overlay",
			"user_id", userID, "market_id", marketID, "country", country)
		return httpx.Forbidden(reason)
	}
	return nil
}

package http

import (
	"context"
	"log/slog"
	stdhttp "net/http"
	"os"
	"strings"
	"time"

	"phoenix-revival/gateway/internal/compliance"
	"phoenix-revival/platform/transport/httpx"
)

// Pre-trade compliance gates (launch policy: crypto-native, OUTSIDE-US only).
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
// KYC_REQUIRED_FOR_TRADING=true. nil = no-op (mirrors payments.KYCGate, which
// gates withdrawals). Set from env in RegisterRoutes.
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

// checkPreTradeCompliance blocks order placement when a configured jurisdiction
// or KYC gate denies the user. Default-off: returns nil when neither gate is
// enabled. The geo signal comes from an upstream edge header; an enabled geo
// gate with no signal fails closed. On a KYC-backend error it fails closed in
// production/staging and open in development (same posture as the withdrawal
// KYC gate).
func checkPreTradeCompliance(r *stdhttp.Request, userID string) error {
	if permissiveBetaComplianceMode() {
		return nil
	}
	if tradeGeoGate.Enabled() {
		country := strings.TrimSpace(r.Header.Get(geoCountryHeader()))
		if allowed, reason := tradeGeoGate.Evaluate(country); !allowed {
			slog.Info("trade blocked by geo gate", "user_id", userID, "country", country, "reason", reason)
			return httpx.Forbidden(reason)
		}
	}

	if tradeKYCGate != nil && tradingKYCRequired() {
		gctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
		defer cancel()
		st, err := tradeKYCGate.GetVerificationStatus(gctx, userID)
		if err != nil {
			env := strings.ToLower(strings.TrimSpace(os.Getenv("ENVIRONMENT")))
			if env == "production" || env == "staging" {
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

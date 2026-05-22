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
	return strings.EqualFold(strings.TrimSpace(os.Getenv("KYC_REQUIRED_FOR_TRADING")), "true")
}

// checkPreTradeCompliance blocks order placement when a configured jurisdiction
// or KYC gate denies the user. Default-off: returns nil when neither gate is
// enabled. The geo signal comes from an upstream edge header; an enabled geo
// gate with no signal fails closed. On a KYC-backend error it fails closed in
// production/staging and open in development (same posture as the withdrawal
// KYC gate).
func checkPreTradeCompliance(r *stdhttp.Request, userID string) error {
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

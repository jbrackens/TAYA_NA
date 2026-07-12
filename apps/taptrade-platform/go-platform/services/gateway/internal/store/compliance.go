package store

// Responsible-play + jurisdiction integration for point-pack purchases.
//
// Owner decision (2026-07-12): point-pack purchases COUNT toward the user's
// responsible-play deposit limits, and checkout is guarded by the same
// jurisdiction gate as other value-in surfaces (compliance.SurfaceDeposit).
//
// Wiring mirrors internal/payments: package-level seams injected by
// internal/http/handlers.go at route registration. Nil seams are no-ops, so
// the package stays independently testable and a bare dev boot works without
// the compliance stack.
//
// Amount semantics: the limit is checked and recorded against the pack's
// real-money price in integer cents (PriceUsdCents) — the measure of value
// entering the platform. Under the 1 Point = 1¢ model this is numerically
// equal to the pack's base points; promotional bonus points are free credits
// and deliberately do not consume limit headroom.
//
// Enforcement points:
//   - CreateCheckout: limit check BEFORE a purchase row exists. In Stripe
//     mode this is the last stop before real money moves — a captured
//     payment must never be refused fulfillment for limit reasons, so the
//     gate sits at checkout creation, not fulfillment.
//   - Fulfillment (first completion only): best-effort RecordDeposit so the
//     spend consumes limit headroom. Replays and failed/canceled outcomes
//     record nothing.
//
// Known, accepted gap (documented in STORE_AND_PAYMENTS.md): several
// concurrently-open pending checkouts each pass the limit check before any
// of them records; the window is small and demo-mode-only today.

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"taptrade/gateway/internal/compliance"
)

// RGLimits is the responsible-play limit checker seam. When nil, purchases
// bypass limit accounting (dev/harness mode).
var RGLimits compliance.ResponsibleGamblingService

// ComplianceGate guards checkout creation on the jurisdiction/KYC gates
// owned by the HTTP layer. When nil, no gate applies (dev/harness mode).
var ComplianceGate compliance.GateFunc

// ErrPurchaseLimit is returned when a checkout would exceed the user's
// responsible-play limits (or the account is blocked/excluded). The raw
// checker reason is deliberately NOT propagated: it may contain legacy
// deposit/money wording that launch-facing surfaces must not render.
var ErrPurchaseLimit = errors.New("purchase limit reached")

const (
	rgCheckTimeout  = 3 * time.Second
	rgRecordTimeout = 2 * time.Second
)

// checkPurchaseAllowed validates the purchase amount against the user's
// responsible-play limits. Fails closed in deployed environments when the
// checker itself errors; fails open (warn) in dev.
func (s *Service) checkPurchaseAllowed(ctx context.Context, userID string, priceUsdCents int64) error {
	if RGLimits == nil {
		return nil
	}
	cctx, cancel := context.WithTimeout(ctx, rgCheckTimeout)
	defer cancel()
	allowed, _, err := RGLimits.CheckDepositAllowed(cctx, userID, priceUsdCents)
	if err != nil {
		if errors.Is(err, compliance.ErrDepositLimitExceeded) ||
			errors.Is(err, compliance.ErrUserExcluded) ||
			errors.Is(err, compliance.ErrUserBlocked) {
			return ErrPurchaseLimit
		}
		if s.cfg.DeployedEnv {
			slog.Error("store: responsible-play check unavailable; refusing checkout", "user_id", userID, "error", err)
			return ErrPurchaseLimit
		}
		slog.Warn("store: responsible-play check failed; allowing checkout in dev mode", "user_id", userID, "error", err)
		return nil
	}
	if !allowed {
		return ErrPurchaseLimit
	}
	return nil
}

// recordPurchaseSpend consumes limit headroom after the FIRST successful
// fulfillment of a purchase. Best-effort: a tracking failure never unwinds
// a credited purchase (mirrors the legacy payments posture).
func recordPurchaseSpend(ctx context.Context, userID string, priceUsdCents int64) {
	if RGLimits == nil {
		return
	}
	rctx, cancel := context.WithTimeout(ctx, rgRecordTimeout)
	defer cancel()
	if err := RGLimits.RecordDeposit(rctx, userID, priceUsdCents); err != nil {
		slog.Warn("store: failed to record purchase for responsible-play tracking", "user_id", userID, "error", err)
	}
}

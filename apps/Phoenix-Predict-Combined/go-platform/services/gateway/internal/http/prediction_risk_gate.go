package http

import (
	"context"
	"errors"
	"time"

	"phoenix-revival/gateway/internal/prediction"
	"phoenix-revival/gateway/internal/risk"
)

// GAP-12 (PAM spec §12 KYC, AML, Risk, and Compliance): a customer whose
// EFFECTIVE risk tier is prohibited — a confirmed sanctions/PEP hit, or an
// audited officer override — must not place new orders. The check decorates the
// compliance checker on the SetComplianceChecker seam, layered over the GAP-9
// status gate — the single chokepoint every PlaceOrder caller already flows
// through — so the protected prediction core is not touched.
//
// Denial semantics mirror the seam's contract (identical to the GAP-9 gate):
//   - prohibited tier → (false, reason, nil): authoritative, blocks in EVERY
//     environment. The reason is deliberately NON-disclosing ("under review") —
//     a sanctions hit must never be tipped off to the subject.
//   - rating read error → (true, "", err): infra ambiguity — the protected
//     gate's env policy applies unchanged (fail-closed prod/staging).
//   - no rating (or any non-prohibited tier) → delegate: an unrated customer is
//     not prohibited, and low/medium/high do not block trading here (they drive
//     review workflows, not a hard order block).

// riskTierReader reports a customer's effective risk tier.
type riskTierReader interface {
	EffectiveTier(ctx context.Context, userID string) (risk.Tier, error)
}

// storeRiskTierReader reads the rating from the risk store. A missing rating is
// not an error condition: it returns ("", nil) so an unrated customer trades.
type storeRiskTierReader struct{ store *risk.Store }

func (r storeRiskTierReader) EffectiveTier(ctx context.Context, userID string) (risk.Tier, error) {
	rating, err := r.store.Get(ctx, userID)
	if errors.Is(err, risk.ErrNotFound) {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	return rating.EffectiveTier(), nil
}

// riskProhibitedReason is the user-facing denial. It never discloses WHY the
// account is prohibited (tipping-off guard) — "under review" is sufficient.
const riskProhibitedReason = "account is under review — new orders are not permitted"

// riskTierOrderGate is the non-atomic decorator. RecordBet/ReleaseBet are pure
// delegations — the gate only guards NEW commitments; releasing already-
// committed stake for a now-prohibited customer must keep working.
type riskTierOrderGate struct {
	inner prediction.ComplianceChecker
	risk  riskTierReader
}

func (g riskTierOrderGate) blockedByRisk(ctx context.Context, userID string) (string, error) {
	tier, err := g.risk.EffectiveTier(ctx, userID)
	if err != nil {
		return "", err
	}
	if tier == risk.TierProhibited {
		return riskProhibitedReason, nil
	}
	return "", nil
}

func (g riskTierOrderGate) CheckBetAllowed(ctx context.Context, userID string, stakeCents int64) (bool, string, error) {
	reason, err := g.blockedByRisk(ctx, userID)
	if err != nil {
		// Infra ambiguity: report allowed with the error so the protected gate
		// applies its environment policy (fail-closed prod/staging).
		return true, "", err
	}
	if reason != "" {
		return false, reason, nil
	}
	return g.inner.CheckBetAllowed(ctx, userID, stakeCents)
}

func (g riskTierOrderGate) RecordBet(ctx context.Context, userID string, stakeCents int64) error {
	return g.inner.RecordBet(ctx, userID, stakeCents)
}

func (g riskTierOrderGate) ReleaseBet(ctx context.Context, userID string, amountCents int64, committedAt time.Time) error {
	return g.inner.ReleaseBet(ctx, userID, amountCents, committedAt)
}

// riskTierOrderGateAtomic preserves the inner checker's AtomicBetGate capability
// (the same reason as the GAP-9 gate: never downgrade an atomic inner to the
// racy check-then-record path).
type riskTierOrderGateAtomic struct {
	riskTierOrderGate
	atomicInner prediction.AtomicBetGate
}

func (g riskTierOrderGateAtomic) CheckAndRecordBet(ctx context.Context, userID string, stakeCents int64) (bool, string, error) {
	reason, err := g.blockedByRisk(ctx, userID)
	if err != nil {
		return true, "", err
	}
	if reason != "" {
		return false, reason, nil
	}
	return g.atomicInner.CheckAndRecordBet(ctx, userID, stakeCents)
}

// wrapOrderGateWithRiskTier decorates the order-placement compliance checker
// with the prohibited-tier gate. A nil inner or nil store leaves the checker
// untouched (so a deploy without the risk subsystem is unchanged, rather than
// failing every order against a missing table).
func wrapOrderGateWithRiskTier(inner prediction.ComplianceChecker, store *risk.Store) prediction.ComplianceChecker {
	if inner == nil || store == nil {
		return inner
	}
	return wrapOrderGateWithRiskReader(inner, storeRiskTierReader{store: store})
}

// wrapOrderGateWithRiskReader is the reader-injectable core, split out for tests.
func wrapOrderGateWithRiskReader(inner prediction.ComplianceChecker, reader riskTierReader) prediction.ComplianceChecker {
	base := riskTierOrderGate{inner: inner, risk: reader}
	if ag, ok := inner.(prediction.AtomicBetGate); ok {
		return riskTierOrderGateAtomic{riskTierOrderGate: base, atomicInner: ag}
	}
	return base
}

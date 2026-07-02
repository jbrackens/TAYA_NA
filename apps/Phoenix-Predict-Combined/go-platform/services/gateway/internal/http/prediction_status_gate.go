package http

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"

	"phoenix-revival/gateway/internal/prediction"
)

// GAP-9 (PAM spec §11 Identity, Account Lifecycle, and Authentication +
// §32 Scenario 3): an admin-set punter status of suspended / self_excluded /
// deactivated must block NEW order placement. The check decorates the
// compliance checker on the SetComplianceChecker seam — the single chokepoint
// every PlaceOrder caller (player HTTP, bot API, SMM, seeds) already flows
// through via service.checkComplianceForOrder — so the protected prediction
// core is not touched.
//
// Denial semantics mirror the seam's existing contract:
//   - non-active status → (false, reason, nil): an authoritative decision that
//     blocks in EVERY environment, exactly like a deliberate RG denial.
//   - status read error → (true, "", err): genuine infra ambiguity — the
//     protected gate's env policy applies unchanged (fail-closed in
//     production/staging, fail-open in development).
//   - no punter row → delegate: punter rows are created lazily, and an absent
//     row cannot be a suspended one; blocking here would lock out every
//     first-time trader.

// punterStatusReader reports the admin-set account status for a punter.
// Backed by the punters table in db mode; a fake in tests.
type punterStatusReader interface {
	PunterStatus(ctx context.Context, userID string) (string, error)
}

// sqlPunterStatusReader reads punters.status. ErrNoRows is not an error
// condition (see package comment above): it returns ("", nil).
type sqlPunterStatusReader struct{ db *sql.DB }

func (r sqlPunterStatusReader) PunterStatus(ctx context.Context, userID string) (string, error) {
	var status string
	err := r.db.QueryRowContext(ctx, `SELECT status FROM punters WHERE id = $1`, userID).Scan(&status)
	if errors.Is(err, sql.ErrNoRows) {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	return status, nil
}

// punterStatusOrderGate is the non-atomic decorator. RecordBet/ReleaseBet are
// pure delegations — the status gate only guards NEW commitments; releasing
// already-committed stake for a now-suspended punter must keep working
// (cancels/expiries still reconcile their RG usage).
type punterStatusOrderGate struct {
	inner  prediction.ComplianceChecker
	status punterStatusReader
}

// blockedByStatus returns a non-empty denial reason when the punter's
// admin-set status forbids new orders. Anything other than active (or an
// absent row) denies — a future status value fails closed rather than
// silently trading.
func (g punterStatusOrderGate) blockedByStatus(ctx context.Context, userID string) (string, error) {
	status, err := g.status.PunterStatus(ctx, userID)
	if err != nil {
		return "", err
	}
	switch status {
	case "", "active":
		return "", nil
	default:
		return "account is " + strings.ReplaceAll(status, "_", "-") + " — new orders are not permitted", nil
	}
}

func (g punterStatusOrderGate) CheckBetAllowed(ctx context.Context, userID string, stakeCents int64) (bool, string, error) {
	reason, err := g.blockedByStatus(ctx, userID)
	if err != nil {
		// Infra ambiguity: report allowed with the error so the protected
		// gate applies its environment policy (fail-closed prod/staging).
		return true, "", err
	}
	if reason != "" {
		return false, reason, nil
	}
	return g.inner.CheckBetAllowed(ctx, userID, stakeCents)
}

func (g punterStatusOrderGate) RecordBet(ctx context.Context, userID string, stakeCents int64) error {
	return g.inner.RecordBet(ctx, userID, stakeCents)
}

func (g punterStatusOrderGate) ReleaseBet(ctx context.Context, userID string, amountCents int64, committedAt time.Time) error {
	return g.inner.ReleaseBet(ctx, userID, amountCents, committedAt)
}

// punterStatusOrderGateAtomic additionally exposes the inner checker's
// AtomicBetGate capability. Kept as a distinct type so wrapping a NON-atomic
// checker does not falsely advertise atomicity, and wrapping an atomic one
// does not downgrade it to the legacy racy path (which would re-open the
// check-then-record TOCTOU the atomic gate exists to close).
type punterStatusOrderGateAtomic struct {
	punterStatusOrderGate
	atomicInner prediction.AtomicBetGate
}

func (g punterStatusOrderGateAtomic) CheckAndRecordBet(ctx context.Context, userID string, stakeCents int64) (bool, string, error) {
	reason, err := g.blockedByStatus(ctx, userID)
	if err != nil {
		return true, "", err
	}
	if reason != "" {
		// Authoritative denial: nothing is recorded, matching the inner
		// gate's records-only-on-clean-allow contract.
		return false, reason, nil
	}
	return g.atomicInner.CheckAndRecordBet(ctx, userID, stakeCents)
}

// wrapOrderGateWithPunterStatus decorates the order-placement compliance
// checker with the admin-status gate. A nil inner or nil db (memory wallet
// mode — no punters table, and no admin status persistence either) leaves the
// checker untouched.
func wrapOrderGateWithPunterStatus(inner prediction.ComplianceChecker, db *sql.DB) prediction.ComplianceChecker {
	if inner == nil || db == nil {
		return inner
	}
	return wrapOrderGateWithStatusReader(inner, sqlPunterStatusReader{db: db})
}

// wrapOrderGateWithStatusReader is the reader-injectable core, split out for
// tests.
func wrapOrderGateWithStatusReader(inner prediction.ComplianceChecker, reader punterStatusReader) prediction.ComplianceChecker {
	base := punterStatusOrderGate{inner: inner, status: reader}
	if ag, ok := inner.(prediction.AtomicBetGate); ok {
		return punterStatusOrderGateAtomic{punterStatusOrderGate: base, atomicInner: ag}
	}
	return base
}

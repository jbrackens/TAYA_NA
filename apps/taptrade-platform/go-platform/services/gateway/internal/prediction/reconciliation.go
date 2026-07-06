package prediction

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
)

// CollateralDriftReport summarises a single market's reconciliation pass.
// drift_cents = ledger_sum - market.collateral_pool_cents.
// Negative drift means the pool is over-funded relative to the ledger
// (the column got incremented without a corresponding ledger row, which
// is bad); positive means the column missed an increment a ledger row
// implied was applied (also bad, equally rare).
//
// ExpectedYesPool / ExpectedNoPool are position-derived integrity checks
// kept alongside the ledger-derived expected pool for forensic value:
// when ledger and positions disagree, both numbers help bisect which
// table was last touched.
type CollateralDriftReport struct {
	MarketID          string
	ExpectedYesPool   int64 // sum of YES position qty × 100 (forensic only)
	ExpectedNoPool    int64 // sum of NO position qty × 100 (forensic only)
	LedgerSumCents    int64 // sum of non-adjustment ledger rows; the truth
	ActualPoolCents   int64 // market.collateral_pool_cents
	DriftCents        int64 // 0 if invariants hold
	HasBookTrades     bool  // market has at least one non-AMM trade
	YesNoMismatch     bool  // YES sum != NO sum on a market with book trades
	AdjustmentWritten bool  // true if Phase 2 wrote a ledger row
}

// computeYesNoMismatch reports whether a position-pool asymmetry is a real
// bug. AMM-era markets have one-sided positions by design — the LMSR cost
// function holds collateral, not paired YES/NO position rows. Markets
// migrated from amm to order_book retain those positions but should not
// fire the invariant. Order-book issuance fills always create equal
// YES + NO positions, so asymmetry on a market with at least one
// non-AMM trade is a real bug worth surfacing.
func computeYesNoMismatch(hasBookTrades bool, yesPool, noPool int64) bool {
	if !hasBookTrades {
		return false
	}
	return yesPool != noPool
}

// ReconcileMarket runs the two-phase collateral check for one market.
//
// Phase 1: REPEATABLE READ snapshot, no lock. Computes expected pool from
// position sums and compares to collateral_pool_cents. If invariants hold,
// returns a clean report and no lock is taken.
//
// Phase 2: only on suspected drift. Takes pg_advisory_xact_lock per market,
// re-runs the same checks under the lock to filter out races against
// in-flight matches, and (if drift confirmed) writes a
// prediction_collateral_ledger row with entry_type='adjustment' and reason
// describing the drift. Does NOT auto-correct user balances — ops investigates.
//
// The two-phase design lets healthy markets skip the lock entirely so
// reconciliation doesn't stall matching on hot books.
func (r *SQLRepository) ReconcileMarket(ctx context.Context, marketID string) (*CollateralDriftReport, error) {
	// Phase 1: snapshot read without lock.
	report, err := r.readDriftSnapshot(ctx, r.db, marketID)
	if err != nil {
		return nil, fmt.Errorf("phase 1 snapshot: %w", err)
	}
	if report.DriftCents == 0 && !report.YesNoMismatch {
		return report, nil
	}

	// Phase 2: drift suspected. Take advisory lock and re-check under it.
	tx, err := r.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return report, fmt.Errorf("phase 2 begin: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	if _, err := tx.ExecContext(ctx,
		"SELECT pg_advisory_xact_lock(hashtext($1))", marketID,
	); err != nil {
		return report, fmt.Errorf("phase 2 lock: %w", err)
	}

	// Re-check under the lock. If it now reads clean, the phase 1 read
	// raced with a concurrent match and there's no real drift.
	confirmed, err := r.readDriftSnapshot(ctx, tx, marketID)
	if err != nil {
		return report, fmt.Errorf("phase 2 re-check: %w", err)
	}
	if confirmed.DriftCents == 0 && !confirmed.YesNoMismatch {
		_ = tx.Commit()
		return confirmed, nil
	}

	// Confirmed drift. Write an adjustment ledger row for forensics. Do NOT
	// move funds or change user-visible state — ops investigates separately.
	// Drift is ledger_sum - actual_pool; the position columns are forensic.
	reason := fmt.Sprintf(
		"reconciliation drift: drift=%d cents, ledger_sum=%d, actual_pool=%d, position_yes=%d, position_no=%d",
		confirmed.DriftCents, confirmed.LedgerSumCents, confirmed.ActualPoolCents,
		confirmed.ExpectedYesPool, confirmed.ExpectedNoPool,
	)
	if _, err := tx.ExecContext(ctx,
		`INSERT INTO prediction_collateral_ledger
		 (market_id, entry_type, amount_cents, balance_after_cents, reason)
		 VALUES ($1, 'adjustment', $2, $3, $4)`,
		marketID, confirmed.DriftCents, confirmed.ActualPoolCents, reason,
	); err != nil {
		return confirmed, fmt.Errorf("write adjustment ledger: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return confirmed, fmt.Errorf("commit phase 2: %w", err)
	}
	confirmed.AdjustmentWritten = true
	return confirmed, nil
}

// readDriftSnapshot computes the expected vs actual collateral pool for a
// market. Reusable across phase 1 (db handle) and phase 2 (tx).
//
// The expected pool is derived from prediction_collateral_ledger — the
// immutable record of every cent that entered or left the pool. We
// deliberately EXCLUDE entry_type='adjustment' so the reconciler's own
// output doesn't poison the next pass. Everything else (issue_collateral,
// settlement_payout, fee, refund, rebate) is a real movement that
// collateral_pool_cents must reflect.
//
// Position quantities are tracked alongside as forensic data only — they
// don't drive the drift calculation. A market with AMM-era positions and
// no order-book ledger entries (the common state for markets that were
// migrated from amm to order_book mode after launch) was previously
// flagged as drifted because the old logic multiplied position qty × 100¢
// and demanded that as the pool. AMM positions never wrote to the
// collateral ledger, so they have no claim on the pool; the ledger-based
// check correctly ignores them.
//
// YesNoMismatch is retained as a separate signal because for a pure
// order-book market issuance fills always create equal YES+NO, so an
// imbalance there is its own bug worth surfacing — independent of pool
// drift. It is gated by HasBookTrades so AMM-only markets (and markets
// migrated from amm to order_book with no subsequent book activity) do
// not trip the signal on their legacy one-sided positions.
func (r *SQLRepository) readDriftSnapshot(ctx context.Context, q sqlReader, marketID string) (*CollateralDriftReport, error) {
	var report CollateralDriftReport
	report.MarketID = marketID

	if err := q.QueryRowContext(ctx,
		"SELECT collateral_pool_cents FROM prediction_markets WHERE id = $1",
		marketID,
	).Scan(&report.ActualPoolCents); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("market not found: %s", marketID)
		}
		return nil, err
	}

	// Authoritative expected pool: the immutable ledger. Drift = sum of
	// real movements minus what the column currently shows. Excludes
	// adjustment rows so prior reconciliation passes don't contaminate
	// the answer.
	if err := q.QueryRowContext(ctx,
		`SELECT COALESCE(SUM(amount_cents), 0)
		 FROM prediction_collateral_ledger
		 WHERE market_id = $1 AND entry_type != 'adjustment'`,
		marketID,
	).Scan(&report.LedgerSumCents); err != nil {
		return nil, err
	}

	// Position aggregates: forensic only. Useful when ledger disagrees
	// with positions (means an upstream write got skipped) but not the
	// driver of the drift number.
	if err := q.QueryRowContext(ctx,
		`SELECT COALESCE(SUM(quantity), 0) * 100
		 FROM prediction_positions
		 WHERE market_id = $1 AND side = 'yes' AND quantity > 0`,
		marketID,
	).Scan(&report.ExpectedYesPool); err != nil {
		return nil, err
	}
	if err := q.QueryRowContext(ctx,
		`SELECT COALESCE(SUM(quantity), 0) * 100
		 FROM prediction_positions
		 WHERE market_id = $1 AND side = 'no' AND quantity > 0`,
		marketID,
	).Scan(&report.ExpectedNoPool); err != nil {
		return nil, err
	}

	// HasBookTrades gates the YesNoMismatch signal. Markets whose only
	// trades came through the AMM (is_amm_trade=true) have one-sided
	// positions by design — the LMSR collateral lives in the market's
	// reserve, not in paired position rows. Once a market gets any
	// order-book issuance, the YES+NO parity invariant applies and an
	// asymmetry is a real bug.
	if err := q.QueryRowContext(ctx,
		`SELECT EXISTS (
		   SELECT 1 FROM prediction_trades
		   WHERE market_id = $1 AND is_amm_trade = false
		 )`,
		marketID,
	).Scan(&report.HasBookTrades); err != nil {
		return nil, err
	}

	report.YesNoMismatch = computeYesNoMismatch(report.HasBookTrades, report.ExpectedYesPool, report.ExpectedNoPool)
	report.DriftCents = report.LedgerSumCents - report.ActualPoolCents
	return &report, nil
}

// sqlReader is the read surface common to *sql.DB and *sql.Tx.
type sqlReader interface {
	QueryRowContext(ctx context.Context, query string, args ...interface{}) *sql.Row
}

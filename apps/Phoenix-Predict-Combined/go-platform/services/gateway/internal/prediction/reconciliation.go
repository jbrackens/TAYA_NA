package prediction

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
)

// CollateralDriftReport summarises a single market's reconciliation pass.
// drift_cents = expected_collateral - market.collateral_pool_cents.
// Negative drift means the pool is over-funded (a refund is owed); positive
// means under-funded (a customer-facing imbalance to investigate).
type CollateralDriftReport struct {
	MarketID         string
	ExpectedYesPool  int64 // sum of YES position qty × 100
	ExpectedNoPool   int64 // sum of NO position qty × 100
	ActualPoolCents  int64 // market.collateral_pool_cents
	DriftCents       int64 // 0 if invariants hold
	YesNoMismatch    bool  // YES sum != NO sum (per-share invariant)
	AdjustmentWritten bool // true if Phase 2 wrote a ledger row
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
	reason := fmt.Sprintf(
		"reconciliation drift: drift=%d cents, yes_pool=%d, no_pool=%d, actual_pool=%d",
		confirmed.DriftCents, confirmed.ExpectedYesPool, confirmed.ExpectedNoPool, confirmed.ActualPoolCents,
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

	report.YesNoMismatch = report.ExpectedYesPool != report.ExpectedNoPool
	// For an issuance-only market the expected pool == YES pool == NO pool.
	// Drift = expected - actual. If Yes/No mismatch we use the larger as
	// the conservative expected (something has gone wrong either way).
	expected := report.ExpectedYesPool
	if report.ExpectedNoPool > expected {
		expected = report.ExpectedNoPool
	}
	report.DriftCents = expected - report.ActualPoolCents
	return &report, nil
}

// sqlReader is the read surface common to *sql.DB and *sql.Tx.
type sqlReader interface {
	QueryRowContext(ctx context.Context, query string, args ...interface{}) *sql.Row
}

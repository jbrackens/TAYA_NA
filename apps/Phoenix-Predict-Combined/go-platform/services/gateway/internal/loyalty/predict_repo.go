package loyalty

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"
)

// Predict-native loyalty persistence layer. See PLAN-loyalty-leaderboards.md §8.
// Parallel to the in-memory sportsbook service (service.go) — the two coexist
// during the un-orphaning transition; the sportsbook path will be removed once
// the Predict pages and settlement dispatch are fully wired.

// ErrPredictAccountNotFound signals "no loyalty_accounts row yet" — the caller
// should treat this as tier 0 / zero points, not as a failure.
var ErrPredictAccountNotFound = errors.New("loyalty: predict account not found")

// PredictAccount mirrors one row of loyalty_accounts.
type PredictAccount struct {
	UserID        string
	PointsBalance int64
	Tier          PredictTier
	LastActivity  time.Time
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

// PredictLedgerEntry mirrors one row of loyalty_ledger.
type PredictLedgerEntry struct {
	ID             int64
	UserID         string
	EventType      string // 'accrual' | 'promotion' | 'adjustment' | 'migration'
	DeltaPoints    int64
	BalanceAfter   int64
	Reason         string
	MarketID       *string
	TradeID        *string
	IdempotencyKey string
	CreatedAt      time.Time
}

// PredictAccrualInput is the low-level input the repo accepts. Service-level
// callers (settlement dispatch, admin adjustments) build this via the service.
type PredictAccrualInput struct {
	UserID         string
	DeltaPoints    int64  // positive to earn, negative to claw back
	EventType      string // one of 'accrual' | 'adjustment' | 'migration'
	Reason         string
	MarketID       *string
	TradeID        *string
	IdempotencyKey string
}

// PredictAccrualResult is what the caller gets back. Promotion info lets the
// caller fire TierPromoted WS events after the transaction commits.
type PredictAccrualResult struct {
	Entry      PredictLedgerEntry
	Account    PredictAccount
	Promoted   bool
	FromTier   PredictTier
	ToTier     PredictTier
	Idempotent bool // true iff idempotency_key collided and we returned the prior row
}

// PredictRepo is the Predict-native loyalty persistence interface.
//
// Accrue owns its own transaction (single-service writes — admin tools, the
// legacy-state migration command). AccrueWithTx participates in an externally
// owned transaction — this is what the settlement engine uses to land wallet
// credit + loyalty accrual atomically per the plan §8.
type PredictRepo interface {
	GetAccount(ctx context.Context, userID string) (*PredictAccount, error)
	ListLedger(ctx context.Context, userID string, limit int) ([]PredictLedgerEntry, error)
	Accrue(ctx context.Context, in PredictAccrualInput) (*PredictAccrualResult, error)
	AccrueWithTx(ctx context.Context, tx *sql.Tx, in PredictAccrualInput) (*PredictAccrualResult, error)
}

// PredictSQLRepo is the Postgres implementation of PredictRepo.
type PredictSQLRepo struct {
	db *sql.DB
}

// NewPredictSQLRepo returns a repo backed by the given *sql.DB. The caller
// retains ownership of the connection pool.
func NewPredictSQLRepo(db *sql.DB) *PredictSQLRepo {
	return &PredictSQLRepo{db: db}
}

// DB exposes the underlying connection for callers that need to begin their
// own transaction (e.g. the legacy-state migration command).
func (r *PredictSQLRepo) DB() *sql.DB { return r.db }

// GetAccount returns the current account row. If the user has never accrued,
// returns (nil, ErrPredictAccountNotFound) so the caller can synthesize a
// zero-state standing response.
func (r *PredictSQLRepo) GetAccount(ctx context.Context, userID string) (*PredictAccount, error) {
	if userID == "" {
		return nil, ErrPredictAccountNotFound
	}
	var acct PredictAccount
	var tier int16
	err := r.db.QueryRowContext(ctx, `
		SELECT user_id, points_balance, tier, last_activity, created_at, updated_at
		FROM loyalty_accounts
		WHERE user_id = $1`, userID).
		Scan(&acct.UserID, &acct.PointsBalance, &tier, &acct.LastActivity, &acct.CreatedAt, &acct.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrPredictAccountNotFound
	}
	if err != nil {
		return nil, err
	}
	acct.Tier = PredictTier(tier)
	return &acct, nil
}

// ListLedger returns the user's most-recent ledger entries, newest first.
// A non-positive limit means "no cap" (caller is responsible for pagination).
func (r *PredictSQLRepo) ListLedger(ctx context.Context, userID string, limit int) ([]PredictLedgerEntry, error) {
	if userID == "" {
		return nil, nil
	}
	query := `
		SELECT id, user_id, event_type, delta_points, balance_after, reason,
		       market_id::text, trade_id::text, idempotency_key, created_at
		FROM loyalty_ledger
		WHERE user_id = $1
		ORDER BY created_at DESC, id DESC`
	args := []interface{}{userID}
	if limit > 0 {
		query += ` LIMIT $2`
		args = append(args, limit)
	}
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []PredictLedgerEntry
	for rows.Next() {
		var e PredictLedgerEntry
		var marketID, tradeID sql.NullString
		if err := rows.Scan(&e.ID, &e.UserID, &e.EventType, &e.DeltaPoints, &e.BalanceAfter,
			&e.Reason, &marketID, &tradeID, &e.IdempotencyKey, &e.CreatedAt); err != nil {
			return nil, err
		}
		if marketID.Valid {
			v := marketID.String
			e.MarketID = &v
		}
		if tradeID.Valid {
			v := tradeID.String
			e.TradeID = &v
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

// Accrue opens a transaction and delegates to AccrueWithTx. Used by admin
// tools and the legacy-state migration command — anything that doesn't need
// to atomic-commit with a wallet operation.
func (r *PredictSQLRepo) Accrue(ctx context.Context, in PredictAccrualInput) (*PredictAccrualResult, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()

	res, err := r.AccrueWithTx(ctx, tx, in)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return res, nil
}

// AccrueWithTx applies an accrual inside the caller-owned transaction.
//
// Concurrency: the account row is locked via SELECT ... FOR UPDATE; concurrent
// accruals for the same user serialize at the account-row level. Concurrent
// accruals for *different* users run in parallel.
//
// Idempotency: the ledger's UNIQUE(idempotency_key) constraint means retrying
// the same input is safe. On collision, the repo returns the pre-existing
// entry + current account and sets Idempotent=true — the delta is NOT applied
// a second time.
func (r *PredictSQLRepo) AccrueWithTx(ctx context.Context, tx *sql.Tx, in PredictAccrualInput) (*PredictAccrualResult, error) {
	if err := validateAccrualInput(in); err != nil {
		return nil, err
	}

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO loyalty_accounts (user_id, points_balance, tier, last_activity, created_at, updated_at)
		VALUES ($1, 0, 0, now(), now(), now())
		ON CONFLICT (user_id) DO NOTHING`, in.UserID); err != nil {
		return nil, fmt.Errorf("loyalty: ensure account: %w", err)
	}

	var (
		currentBalance int64
		currentTier    int16
		createdAt      time.Time
		updatedAt      time.Time
	)
	err := tx.QueryRowContext(ctx, `
		SELECT points_balance, tier, created_at, updated_at
		FROM loyalty_accounts
		WHERE user_id = $1
		FOR UPDATE`, in.UserID).
		Scan(&currentBalance, &currentTier, &createdAt, &updatedAt)
	if err != nil {
		return nil, fmt.Errorf("loyalty: lock account: %w", err)
	}

	existing, err := fetchLedgerByKey(ctx, tx, in.IdempotencyKey)
	if err != nil {
		return nil, fmt.Errorf("loyalty: lookup idempotency: %w", err)
	}
	if existing != nil {
		acct := PredictAccount{
			UserID:        in.UserID,
			PointsBalance: currentBalance,
			Tier:          PredictTier(currentTier),
			CreatedAt:     createdAt,
			UpdatedAt:     updatedAt,
			LastActivity:  updatedAt,
		}
		return &PredictAccrualResult{
			Entry:      *existing,
			Account:    acct,
			Idempotent: true,
			FromTier:   PredictTier(currentTier),
			ToTier:     PredictTier(currentTier),
		}, nil
	}

	newBalance := currentBalance + in.DeltaPoints
	if newBalance < 0 {
		newBalance = 0 // clamp — an adjustment may not drop the user below zero
	}
	newTier := PredictTierForPoints(newBalance)

	entry := PredictLedgerEntry{
		UserID:         in.UserID,
		EventType:      in.EventType,
		DeltaPoints:    in.DeltaPoints,
		BalanceAfter:   newBalance,
		Reason:         in.Reason,
		MarketID:       in.MarketID,
		TradeID:        in.TradeID,
		IdempotencyKey: in.IdempotencyKey,
	}

	if err := tx.QueryRowContext(ctx, `
		INSERT INTO loyalty_ledger
		  (user_id, event_type, delta_points, balance_after, reason, market_id, trade_id, idempotency_key)
		VALUES ($1, $2, $3, $4, $5, $6::uuid, $7::uuid, $8)
		RETURNING id, created_at`,
		in.UserID, in.EventType, in.DeltaPoints, newBalance, in.Reason,
		nullableUUID(in.MarketID), nullableUUID(in.TradeID), in.IdempotencyKey,
	).Scan(&entry.ID, &entry.CreatedAt); err != nil {
		return nil, fmt.Errorf("loyalty: insert ledger: %w", err)
	}

	var newUpdatedAt time.Time
	if err := tx.QueryRowContext(ctx, `
		UPDATE loyalty_accounts
		SET points_balance = $1,
		    tier           = $2,
		    last_activity  = now(),
		    updated_at     = now()
		WHERE user_id = $3
		RETURNING updated_at`,
		newBalance, int16(newTier), in.UserID,
	).Scan(&newUpdatedAt); err != nil {
		return nil, fmt.Errorf("loyalty: update account: %w", err)
	}

	acct := PredictAccount{
		UserID:        in.UserID,
		PointsBalance: newBalance,
		Tier:          newTier,
		LastActivity:  newUpdatedAt,
		CreatedAt:     createdAt,
		UpdatedAt:     newUpdatedAt,
	}

	return &PredictAccrualResult{
		Entry:    entry,
		Account:  acct,
		Promoted: newTier > PredictTier(currentTier),
		FromTier: PredictTier(currentTier),
		ToTier:   newTier,
	}, nil
}

func fetchLedgerByKey(ctx context.Context, tx *sql.Tx, key string) (*PredictLedgerEntry, error) {
	var e PredictLedgerEntry
	var marketID, tradeID sql.NullString
	err := tx.QueryRowContext(ctx, `
		SELECT id, user_id, event_type, delta_points, balance_after, reason,
		       market_id::text, trade_id::text, idempotency_key, created_at
		FROM loyalty_ledger
		WHERE idempotency_key = $1`, key).
		Scan(&e.ID, &e.UserID, &e.EventType, &e.DeltaPoints, &e.BalanceAfter, &e.Reason,
			&marketID, &tradeID, &e.IdempotencyKey, &e.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if marketID.Valid {
		v := marketID.String
		e.MarketID = &v
	}
	if tradeID.Valid {
		v := tradeID.String
		e.TradeID = &v
	}
	return &e, nil
}

func validateAccrualInput(in PredictAccrualInput) error {
	if in.UserID == "" {
		return fmt.Errorf("loyalty: user_id required")
	}
	if in.IdempotencyKey == "" {
		return fmt.Errorf("loyalty: idempotency_key required")
	}
	if in.Reason == "" {
		return fmt.Errorf("loyalty: reason required")
	}
	switch in.EventType {
	case "accrual", "promotion", "adjustment", "migration":
	default:
		return fmt.Errorf("loyalty: invalid event_type %q", in.EventType)
	}
	if in.DeltaPoints == 0 {
		return fmt.Errorf("loyalty: delta_points must be non-zero")
	}
	return nil
}

// nullableUUID converts an optional UUID string into a driver-ready value.
// Empty-string pointer and nil pointer both serialize as NULL.
func nullableUUID(id *string) interface{} {
	if id == nil || *id == "" {
		return nil
	}
	return *id
}

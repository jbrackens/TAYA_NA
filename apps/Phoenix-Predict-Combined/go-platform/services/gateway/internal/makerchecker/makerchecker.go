// Package makerchecker implements four-eyes dual approval for high-value manual
// wallet adjustments (PAM spec §7 Permission Model + §25 Admin Operations and
// Configuration; decision 2026-07-02: adjustments at or above a threshold
// require a second approver, maker != checker). It owns the
// pending_admin_actions table and never touches the wallet money-path: the
// http layer executes the approved adjustment through the existing audited
// wallet routes, keyed by the pending action's idempotency key so an approval
// executes at most once.
package makerchecker

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"
)

const dbTimeout = 10 * time.Second

var (
	ErrNotFound    = errors.New("pending action not found")
	ErrNotPending  = errors.New("action is no longer pending")
	ErrSameActor   = errors.New("the maker cannot approve their own action (four-eyes)")
	ErrInvalid     = errors.New("invalid pending action")
	ErrReasonEmpty = errors.New("a reason is required")
)

// Action is one pending high-value adjustment awaiting a second approver.
type Action struct {
	ID             int64  `json:"id"`
	ActionType     string `json:"actionType"` // wallet_adjustment
	SubjectID      string `json:"subjectId"`  // the punter whose balance changes
	Direction      string `json:"direction"`  // credit | debit
	AmountCents    int64  `json:"amountCents"`
	Reason         string `json:"reason"`
	IdempotencyKey string `json:"idempotencyKey"`
	MakerID        string `json:"makerId"`
	Status         string `json:"status"` // pending | approved | rejected
	CheckerID      string `json:"checkerId,omitempty"`
	CheckerReason  string `json:"checkerReason,omitempty"`
	CreatedAt      string `json:"createdAt"`
	DecidedAt      string `json:"decidedAt,omitempty"`
	// GAP-61: set when the approved adjustment's wallet move actually executed.
	// An approved action with an empty ExecutedAt is approved-but-unexecuted
	// (its execution failed) and is eligible for re-execution via /execute.
	ExecutedAt string `json:"executedAt,omitempty"`
}

// Store persists pending actions.
type Store struct {
	db *sql.DB
}

// NewStore creates the store and ensures its schema.
func NewStore(db *sql.DB) (*Store, error) {
	s := &Store{db: db}
	if err := s.ensureSchema(); err != nil {
		return nil, fmt.Errorf("makerchecker schema init: %w", err)
	}
	return s, nil
}

func (s *Store) ensureSchema() error {
	ctx, cancel := context.WithTimeout(context.Background(), dbTimeout)
	defer cancel()
	_, err := s.db.ExecContext(ctx, `
CREATE TABLE IF NOT EXISTS pending_admin_actions (
  id BIGSERIAL PRIMARY KEY,
  action_type TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('credit','debit')),
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  reason TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  maker_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  checker_id TEXT,
  checker_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_at TIMESTAMPTZ
)`)
	if err != nil {
		return err
	}
	if _, err = s.db.ExecContext(ctx,
		`CREATE INDEX IF NOT EXISTS idx_pending_admin_actions_status ON pending_admin_actions (status, created_at DESC)`); err != nil {
		return err
	}
	// GAP-61 (PAM §25 Admin Operations): track whether an approved adjustment's
	// wallet move actually executed. Idempotent ALTER on the store-owned table.
	_, err = s.db.ExecContext(ctx,
		`ALTER TABLE pending_admin_actions ADD COLUMN IF NOT EXISTS executed_at TIMESTAMPTZ`)
	return err
}

// CreatePending records a maker's proposed adjustment. The idempotency key is
// UNIQUE, so re-submitting the same proposal is rejected by the DB rather than
// duplicated.
func (s *Store) CreatePending(ctx context.Context, a Action) (*Action, error) {
	if a.SubjectID == "" || a.MakerID == "" || a.IdempotencyKey == "" {
		return nil, ErrInvalid
	}
	if a.Direction != "credit" && a.Direction != "debit" {
		return nil, ErrInvalid
	}
	if a.AmountCents <= 0 {
		return nil, ErrInvalid
	}
	if a.Reason == "" {
		return nil, ErrReasonEmpty
	}
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	var id int64
	var createdAt string
	err := s.db.QueryRowContext(ctx, `
INSERT INTO pending_admin_actions
  (action_type, subject_id, direction, amount_cents, reason, idempotency_key, maker_id)
VALUES ('wallet_adjustment', $1, $2, $3, $4, $5, $6)
RETURNING id, CAST(created_at AS TEXT)`,
		a.SubjectID, a.Direction, a.AmountCents, a.Reason, a.IdempotencyKey, a.MakerID).Scan(&id, &createdAt)
	if err != nil {
		return nil, err
	}
	a.ID = id
	a.ActionType = "wallet_adjustment"
	a.Status = "pending"
	a.CreatedAt = createdAt
	return &a, nil
}

// Approve transitions a pending action to approved, enforcing four-eyes
// (checker != maker) atomically. It returns the action to execute; the caller
// then performs the wallet mutation keyed by IdempotencyKey. A concurrent
// double-approve: only one wins the pending->approved transition (FOR UPDATE),
// the other gets ErrNotPending.
func (s *Store) Approve(ctx context.Context, id int64, checkerID string) (*Action, error) {
	if checkerID == "" {
		return nil, ErrInvalid
	}
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()

	a, err := scanActionForUpdate(ctx, tx, id)
	if err != nil {
		return nil, err
	}
	if a.Status != "pending" {
		return nil, ErrNotPending
	}
	if a.MakerID == checkerID {
		return nil, ErrSameActor
	}
	if _, err := tx.ExecContext(ctx, `
UPDATE pending_admin_actions SET status='approved', checker_id=$2, decided_at=NOW() WHERE id=$1`,
		id, checkerID); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	a.Status = "approved"
	a.CheckerID = checkerID
	return a, nil
}

// Reject transitions a pending action to rejected with a reason. Four-eyes
// applies to rejection too — a maker cannot reject their own action, so the
// decision is always a second person's.
func (s *Store) Reject(ctx context.Context, id int64, checkerID, reason string) (*Action, error) {
	if checkerID == "" {
		return nil, ErrInvalid
	}
	if reason == "" {
		return nil, ErrReasonEmpty
	}
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()

	a, err := scanActionForUpdate(ctx, tx, id)
	if err != nil {
		return nil, err
	}
	if a.Status != "pending" {
		return nil, ErrNotPending
	}
	if a.MakerID == checkerID {
		return nil, ErrSameActor
	}
	if _, err := tx.ExecContext(ctx, `
UPDATE pending_admin_actions SET status='rejected', checker_id=$2, checker_reason=$3, decided_at=NOW() WHERE id=$1`,
		id, checkerID, reason); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	a.Status = "rejected"
	a.CheckerID = checkerID
	a.CheckerReason = reason
	return a, nil
}

// GetAction returns one action.
func (s *Store) GetAction(ctx context.Context, id int64) (*Action, error) {
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	return scanAction(s.db.QueryRowContext(ctx, selectAction+` WHERE id=$1`, id))
}

// MarkExecuted records that an approved action's wallet move has executed. It
// flips executed_at only for an approved, not-yet-executed action, so it is
// idempotent: a second call — or a call on a pending/rejected action — returns
// false without error. Returns true only when THIS call performed the
// transition. (GAP-61: lets the /execute retry path settle a stuck approval.)
func (s *Store) MarkExecuted(ctx context.Context, id int64) (bool, error) {
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	res, err := s.db.ExecContext(ctx,
		`UPDATE pending_admin_actions SET executed_at=NOW() WHERE id=$1 AND status='approved' AND executed_at IS NULL`, id)
	if err != nil {
		return false, err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return false, err
	}
	return n > 0, nil
}

// ListByStatus returns actions with the given status (empty = all), newest first.
func (s *Store) ListByStatus(ctx context.Context, status string, limit, offset int) ([]Action, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	q := selectAction
	args := []any{}
	if status != "" {
		q += ` WHERE status=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`
		args = append(args, status, limit, offset)
	} else {
		q += ` ORDER BY created_at DESC LIMIT $1 OFFSET $2`
		args = append(args, limit, offset)
	}
	rows, err := s.db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Action{}
	for rows.Next() {
		a, err := scanAction(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *a)
	}
	return out, rows.Err()
}

const selectAction = `
SELECT id, action_type, subject_id, direction, amount_cents, reason, idempotency_key,
       maker_id, status, COALESCE(checker_id,''), COALESCE(checker_reason,''),
       CAST(created_at AS TEXT), COALESCE(CAST(decided_at AS TEXT),''),
       COALESCE(CAST(executed_at AS TEXT),'')
FROM pending_admin_actions`

type rowScanner interface{ Scan(dest ...any) error }

func scanAction(row rowScanner) (*Action, error) {
	var a Action
	err := row.Scan(&a.ID, &a.ActionType, &a.SubjectID, &a.Direction, &a.AmountCents, &a.Reason,
		&a.IdempotencyKey, &a.MakerID, &a.Status, &a.CheckerID, &a.CheckerReason, &a.CreatedAt, &a.DecidedAt,
		&a.ExecutedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func scanActionForUpdate(ctx context.Context, tx *sql.Tx, id int64) (*Action, error) {
	return scanAction(tx.QueryRowContext(ctx, selectAction+` WHERE id=$1 FOR UPDATE`, id))
}

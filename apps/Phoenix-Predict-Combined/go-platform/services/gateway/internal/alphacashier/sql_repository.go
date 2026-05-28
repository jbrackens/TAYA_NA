package alphacashier

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
)

const dbTimeout = 5 * time.Second

type SQLRepository struct {
	db *sql.DB
}

func NewSQLRepository(db *sql.DB) *SQLRepository {
	return &SQLRepository{db: db}
}

func (r *SQLRepository) SaveWalletChallenge(ctx context.Context, challenge WalletChallenge) error {
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	_, err := r.db.ExecContext(ctx, `
INSERT INTO alpha_wallet_challenges (nonce, user_id, chain_id, wallet_address, message, expires_at, created_at)
VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		challenge.Nonce, challenge.UserID, challenge.ChainID, challenge.WalletAddress, challenge.Message, challenge.ExpiresAt, challenge.CreatedAt)
	return err
}

func (r *SQLRepository) GetWalletChallenge(ctx context.Context, nonce string) (*WalletChallenge, error) {
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	row := r.db.QueryRowContext(ctx, `
SELECT nonce, user_id, chain_id, wallet_address, message, expires_at, consumed_at, created_at
FROM alpha_wallet_challenges
WHERE nonce = $1`, nonce)
	return scanWalletChallenge(row)
}

func (r *SQLRepository) ConsumeWalletChallenge(ctx context.Context, nonce string, consumedAt time.Time) error {
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	res, err := r.db.ExecContext(ctx, `
UPDATE alpha_wallet_challenges
SET consumed_at = $2
WHERE nonce = $1 AND consumed_at IS NULL`, nonce, consumedAt)
	if err != nil {
		return err
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return ErrChallengeConsumed
	}
	return nil
}

func (r *SQLRepository) UpsertWalletConnection(ctx context.Context, connection WalletConnection) (*WalletConnection, error) {
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	row := r.db.QueryRowContext(ctx, `
INSERT INTO alpha_wallet_connections (
    user_id, chain_type, chain_id, wallet_address, normalized_address,
    signature, message, nonce, verified_at, last_seen_at, created_at
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9, $9)
ON CONFLICT (user_id, chain_id, normalized_address) DO UPDATE
SET wallet_address = EXCLUDED.wallet_address,
    signature = EXCLUDED.signature,
    message = EXCLUDED.message,
    nonce = EXCLUDED.nonce,
    verified_at = EXCLUDED.verified_at,
    last_seen_at = EXCLUDED.last_seen_at
RETURNING id::text, user_id, chain_type, chain_id, wallet_address, normalized_address,
          signature, message, nonce, verified_at, last_seen_at, created_at`,
		connection.UserID, connection.ChainType, connection.ChainID, connection.WalletAddress, connection.NormalizedAddress,
		connection.Signature, connection.Message, connection.Nonce, connection.VerifiedAt)
	return scanWalletConnection(row)
}

func (r *SQLRepository) FindWalletConnection(ctx context.Context, userID string, chainID int64, normalizedAddress string) (*WalletConnection, error) {
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	row := r.db.QueryRowContext(ctx, `
SELECT id::text, user_id, chain_type, chain_id, wallet_address, normalized_address,
       signature, message, nonce, verified_at, last_seen_at, created_at
FROM alpha_wallet_connections
WHERE user_id = $1 AND chain_id = $2 AND normalized_address = $3`, userID, chainID, normalizedAddress)
	conn, err := scanWalletConnection(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrWalletNotConnected
	}
	return conn, err
}

func (r *SQLRepository) ListWalletConnections(ctx context.Context, userID string) ([]WalletConnection, error) {
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	rows, err := r.db.QueryContext(ctx, `
SELECT id::text, user_id, chain_type, chain_id, wallet_address, normalized_address,
       signature, message, nonce, verified_at, last_seen_at, created_at
FROM alpha_wallet_connections
WHERE user_id = $1
ORDER BY last_seen_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []WalletConnection
	for rows.Next() {
		conn, err := scanWalletConnection(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *conn)
	}
	return out, rows.Err()
}

func (r *SQLRepository) FindDepositIntentByIdempotencyKey(ctx context.Context, userID string, idempotencyKey string) (*DepositIntent, error) {
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	row := r.db.QueryRowContext(ctx, depositIntentSelect()+`
WHERE user_id = $1 AND idempotency_key = $2`, userID, idempotencyKey)
	intent, err := scanDepositIntent(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return intent, err
}

func (r *SQLRepository) SaveDepositIntent(ctx context.Context, intent DepositIntent) (*DepositIntent, error) {
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	row := r.db.QueryRowContext(ctx, `
INSERT INTO alpha_deposit_intents (
    user_id, wallet_connection_id, chain_id, chain_name, token_symbol,
    token_address, token_decimals, treasury_address, from_address,
    amount_cents, amount_units, status, idempotency_key, expires_at,
    created_at, updated_at
)
VALUES ($1, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10, $11::numeric, $12, $13, $14, $15, $15)
RETURNING id::text, user_id, wallet_connection_id::text, chain_id, chain_name, token_symbol,
          token_address, token_decimals, treasury_address, from_address, amount_cents,
          amount_units::text, status, COALESCE(tx_hash, ''), COALESCE(credited_wallet_entry_id, ''),
          COALESCE(failure_reason, ''), idempotency_key, expires_at, submitted_at,
          confirmed_at, credited_at, created_at, updated_at`,
		intent.UserID, intent.WalletConnectionID, intent.ChainID, intent.ChainName, intent.TokenSymbol,
		intent.TokenAddress, intent.TokenDecimals, intent.TreasuryAddress, intent.FromAddress,
		intent.AmountCents, intent.AmountUnits, intent.Status, intent.IdempotencyKey, intent.ExpiresAt,
		intent.CreatedAt)
	return scanDepositIntent(row)
}

func (r *SQLRepository) MarkDepositSubmitted(ctx context.Context, id string, txHash string, submittedAt time.Time) (*DepositIntent, error) {
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	row := r.db.QueryRowContext(ctx, `
UPDATE alpha_deposit_intents
SET status = CASE WHEN status = 'created' THEN 'submitted' ELSE status END,
    tx_hash = COALESCE(NULLIF(tx_hash, ''), $2),
    submitted_at = COALESCE(submitted_at, $3),
    updated_at = $3
WHERE id = $1::uuid
RETURNING id::text, user_id, wallet_connection_id::text, chain_id, chain_name, token_symbol,
          token_address, token_decimals, treasury_address, from_address, amount_cents,
          amount_units::text, status, COALESCE(tx_hash, ''), COALESCE(credited_wallet_entry_id, ''),
          COALESCE(failure_reason, ''), idempotency_key, expires_at, submitted_at,
          confirmed_at, credited_at, created_at, updated_at`, id, txHash, submittedAt)
	intent, err := scanDepositIntent(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return intent, err
}

func (r *SQLRepository) MarkDepositCredited(ctx context.Context, id string, walletEntryID string, confirmedAt time.Time, creditedAt time.Time) (*DepositIntent, error) {
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	row := r.db.QueryRowContext(ctx, `
UPDATE alpha_deposit_intents
SET status = 'credited',
    credited_wallet_entry_id = $2,
    confirmed_at = COALESCE(confirmed_at, $3),
    credited_at = COALESCE(credited_at, $4),
    updated_at = $4
WHERE id = $1::uuid
RETURNING id::text, user_id, wallet_connection_id::text, chain_id, chain_name, token_symbol,
          token_address, token_decimals, treasury_address, from_address, amount_cents,
          amount_units::text, status, COALESCE(tx_hash, ''), COALESCE(credited_wallet_entry_id, ''),
          COALESCE(failure_reason, ''), idempotency_key, expires_at, submitted_at,
          confirmed_at, credited_at, created_at, updated_at`, id, walletEntryID, confirmedAt, creditedAt)
	intent, err := scanDepositIntent(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return intent, err
}

func (r *SQLRepository) RecordChainTransaction(ctx context.Context, tx ChainTransaction) error {
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	_, err := r.db.ExecContext(ctx, `
INSERT INTO alpha_chain_transactions (
    deposit_intent_id, chain_id, tx_hash, log_index, block_number, block_hash,
    token_address, from_address, to_address, amount_units, confirmations,
    receipt_status, raw_log, created_at
)
VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10::numeric, $11, $12, $13::jsonb, $14)
ON CONFLICT (chain_id, tx_hash, log_index) DO NOTHING`,
		tx.DepositIntentID, tx.ChainID, tx.TxHash, tx.LogIndex, tx.BlockNumber, tx.BlockHash,
		tx.TokenAddress, tx.FromAddress, tx.ToAddress, tx.AmountUnits, tx.Confirmations,
		tx.ReceiptStatus, tx.RawLog, tx.CreatedAt)
	return err
}

func (r *SQLRepository) GetDepositIntent(ctx context.Context, id string) (*DepositIntent, error) {
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	row := r.db.QueryRowContext(ctx, depositIntentSelect()+`WHERE id = $1::uuid`, id)
	intent, err := scanDepositIntent(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return intent, err
}

func (r *SQLRepository) ListDepositIntents(ctx context.Context, userID string) ([]DepositIntent, error) {
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	rows, err := r.db.QueryContext(ctx, depositIntentSelect()+`
WHERE user_id = $1
ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []DepositIntent
	for rows.Next() {
		intent, err := scanDepositIntent(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *intent)
	}
	return out, rows.Err()
}

func (r *SQLRepository) ListAdminDepositIntents(ctx context.Context, filter DepositIntentFilter) ([]DepositIntent, error) {
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	query := depositIntentSelect()
	where := []string{}
	args := []any{}
	if filter.Status != "" {
		args = append(args, filter.Status)
		where = append(where, fmt.Sprintf("status = $%d", len(args)))
	}
	if filter.UserID != "" {
		args = append(args, filter.UserID)
		where = append(where, fmt.Sprintf("user_id = $%d", len(args)))
	}
	if filter.TxHash != "" {
		args = append(args, filter.TxHash)
		where = append(where, fmt.Sprintf("LOWER(tx_hash) = LOWER($%d)", len(args)))
	}
	if len(where) > 0 {
		query += "WHERE " + strings.Join(where, " AND ") + "\n"
	}
	args = append(args, filter.Limit)
	query += fmt.Sprintf("ORDER BY created_at DESC LIMIT $%d", len(args))
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []DepositIntent
	for rows.Next() {
		intent, err := scanDepositIntent(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *intent)
	}
	return out, rows.Err()
}

func (r *SQLRepository) SumUserDepositIntentCentsSince(ctx context.Context, userID string, since time.Time) (int64, error) {
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	var total int64
	err := r.db.QueryRowContext(ctx, `
SELECT COALESCE(SUM(amount_cents), 0)
FROM alpha_deposit_intents
WHERE user_id = $1
  AND created_at >= $2
  AND status NOT IN ('failed','expired','quarantined')`, userID, since).Scan(&total)
	return total, err
}

func (r *SQLRepository) FindWithdrawalRequestByIdempotencyKey(ctx context.Context, userID string, idempotencyKey string) (*WithdrawalRequest, error) {
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	row := r.db.QueryRowContext(ctx, withdrawalRequestSelect()+`
WHERE user_id = $1 AND idempotency_key = $2`, userID, idempotencyKey)
	req, err := scanWithdrawalRequest(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return req, err
}

func (r *SQLRepository) SaveWithdrawalRequest(ctx context.Context, request WithdrawalRequest) (*WithdrawalRequest, error) {
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	row := r.db.QueryRowContext(ctx, `
INSERT INTO alpha_withdrawal_requests (
    id, user_id, chain_id, token_symbol, token_address, destination_address,
    amount_cents, amount_units, status, wallet_reservation_id, requested_at,
    idempotency_key, created_at, updated_at
)
VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8::numeric, $9, $10, $11, $12, $13, $13)
RETURNING id::text, user_id, chain_id, token_symbol, token_address, destination_address,
          amount_cents, amount_units::text, status, COALESCE(wallet_reservation_id, ''),
          requested_at, reviewed_at, COALESCE(reviewed_by, ''), COALESCE(review_note, ''),
          COALESCE(broadcast_tx_hash, ''), completed_at, COALESCE(failure_reason, ''),
          idempotency_key, created_at, updated_at`,
		request.ID, request.UserID, request.ChainID, request.TokenSymbol, request.TokenAddress, request.DestinationAddress,
		request.AmountCents, request.AmountUnits, request.Status, request.WalletReservationID, request.RequestedAt,
		request.IdempotencyKey, request.CreatedAt)
	return scanWithdrawalRequest(row)
}

func (r *SQLRepository) GetWithdrawalRequest(ctx context.Context, id string) (*WithdrawalRequest, error) {
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	row := r.db.QueryRowContext(ctx, withdrawalRequestSelect()+`WHERE id = $1::uuid`, id)
	req, err := scanWithdrawalRequest(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrWithdrawalNotFound
	}
	return req, err
}

func (r *SQLRepository) ListWithdrawalRequests(ctx context.Context, userID string) ([]WithdrawalRequest, error) {
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	rows, err := r.db.QueryContext(ctx, withdrawalRequestSelect()+`
WHERE user_id = $1
ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []WithdrawalRequest
	for rows.Next() {
		req, err := scanWithdrawalRequest(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *req)
	}
	return out, rows.Err()
}

func (r *SQLRepository) ListAdminWithdrawalRequests(ctx context.Context, status string) ([]WithdrawalRequest, error) {
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	query := withdrawalRequestSelect()
	args := []any{}
	if status != "" {
		query += `WHERE status = $1
`
		args = append(args, status)
	}
	query += `ORDER BY created_at DESC`
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []WithdrawalRequest
	for rows.Next() {
		req, err := scanWithdrawalRequest(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *req)
	}
	return out, rows.Err()
}

func (r *SQLRepository) MarkWithdrawalReviewed(ctx context.Context, id string, status string, reviewedBy string, reviewNote string, reviewedAt time.Time) (*WithdrawalRequest, error) {
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	row := r.db.QueryRowContext(ctx, `
UPDATE alpha_withdrawal_requests
SET status = $2,
    reviewed_at = $3,
    reviewed_by = $4,
    review_note = $5,
    updated_at = $3
WHERE id = $1::uuid
RETURNING id::text, user_id, chain_id, token_symbol, token_address, destination_address,
          amount_cents, amount_units::text, status, COALESCE(wallet_reservation_id, ''),
          requested_at, reviewed_at, COALESCE(reviewed_by, ''), COALESCE(review_note, ''),
          COALESCE(broadcast_tx_hash, ''), completed_at, COALESCE(failure_reason, ''),
          idempotency_key, created_at, updated_at`, id, status, reviewedAt, reviewedBy, reviewNote)
	req, err := scanWithdrawalRequest(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrWithdrawalNotFound
	}
	return req, err
}

func (r *SQLRepository) MarkWithdrawalBroadcasted(ctx context.Context, id string, txHash string, updatedAt time.Time) (*WithdrawalRequest, error) {
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	row := r.db.QueryRowContext(ctx, `
UPDATE alpha_withdrawal_requests
SET status = 'broadcasted',
    broadcast_tx_hash = $2,
    updated_at = $3
WHERE id = $1::uuid
RETURNING id::text, user_id, chain_id, token_symbol, token_address, destination_address,
          amount_cents, amount_units::text, status, COALESCE(wallet_reservation_id, ''),
          requested_at, reviewed_at, COALESCE(reviewed_by, ''), COALESCE(review_note, ''),
          COALESCE(broadcast_tx_hash, ''), completed_at, COALESCE(failure_reason, ''),
          idempotency_key, created_at, updated_at`, id, txHash, updatedAt)
	req, err := scanWithdrawalRequest(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrWithdrawalNotFound
	}
	return req, err
}

func (r *SQLRepository) MarkWithdrawalCompleted(ctx context.Context, id string, completedAt time.Time) (*WithdrawalRequest, error) {
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	row := r.db.QueryRowContext(ctx, `
UPDATE alpha_withdrawal_requests
SET status = 'completed',
    completed_at = $2,
    updated_at = $2
WHERE id = $1::uuid
RETURNING id::text, user_id, chain_id, token_symbol, token_address, destination_address,
          amount_cents, amount_units::text, status, COALESCE(wallet_reservation_id, ''),
          requested_at, reviewed_at, COALESCE(reviewed_by, ''), COALESCE(review_note, ''),
          COALESCE(broadcast_tx_hash, ''), completed_at, COALESCE(failure_reason, ''),
          idempotency_key, created_at, updated_at`, id, completedAt)
	req, err := scanWithdrawalRequest(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrWithdrawalNotFound
	}
	return req, err
}

func (r *SQLRepository) ReconciliationSnapshot(ctx context.Context) (ReconciliationLedgerSnapshot, error) {
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	var snap ReconciliationLedgerSnapshot
	err := r.db.QueryRowContext(ctx, `
SELECT
  COALESCE((SELECT SUM(amount_cents) FROM alpha_deposit_intents WHERE status = 'credited'), 0),
  COALESCE((SELECT SUM(amount_cents) FROM alpha_withdrawal_requests WHERE status = 'completed'), 0),
  COALESCE((SELECT SUM(amount_cents) FROM alpha_withdrawal_requests WHERE status IN ('requested','under_review','approved','broadcasted')), 0),
  COALESCE((SELECT SUM(balance_cents) FROM wallet_balances), 0),
  COALESCE((SELECT SUM(amount_cents - captured_amount_cents) FROM wallet_reservations WHERE status = 'held' AND expires_at > NOW()), 0)
`).Scan(&snap.CreditedDepositCents, &snap.CompletedWithdrawalCents, &snap.PendingWithdrawalCents, &snap.WalletBalanceCents, &snap.ActiveReservationCents)
	return snap, err
}

func (r *SQLRepository) RecordAudit(ctx context.Context, event AuditEvent) error {
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	payload := event.EventPayload
	if payload == "" {
		payload = "{}"
	}
	if !json.Valid([]byte(payload)) {
		return fmt.Errorf("invalid audit payload json")
	}
	_, err := r.db.ExecContext(ctx, `
INSERT INTO alpha_cashier_audit_events (subject_type, subject_id, event_type, actor_type, actor_id, event_payload, created_at)
VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)`,
		event.SubjectType, event.SubjectID, event.EventType, event.ActorType, event.ActorID, payload, event.CreatedAt)
	return err
}

func (r *SQLRepository) ListAuditEvents(ctx context.Context, filter AuditEventFilter) ([]AuditEvent, error) {
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	query := `
SELECT id::text, subject_type, subject_id, event_type, actor_type,
       COALESCE(actor_id, ''), event_payload::text, created_at
FROM alpha_cashier_audit_events
`
	where := []string{}
	args := []any{}
	if filter.SubjectType != "" {
		args = append(args, filter.SubjectType)
		where = append(where, fmt.Sprintf("subject_type = $%d", len(args)))
	}
	if filter.SubjectID != "" {
		args = append(args, filter.SubjectID)
		where = append(where, fmt.Sprintf("subject_id = $%d", len(args)))
	}
	if filter.EventType != "" {
		args = append(args, filter.EventType)
		where = append(where, fmt.Sprintf("event_type = $%d", len(args)))
	}
	if filter.ActorType != "" {
		args = append(args, filter.ActorType)
		where = append(where, fmt.Sprintf("actor_type = $%d", len(args)))
	}
	if filter.ActorID != "" {
		args = append(args, filter.ActorID)
		where = append(where, fmt.Sprintf("actor_id = $%d", len(args)))
	}
	if len(where) > 0 {
		query += "WHERE " + strings.Join(where, " AND ") + "\n"
	}
	args = append(args, filter.Limit)
	query += fmt.Sprintf("ORDER BY created_at DESC LIMIT $%d", len(args))
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []AuditEvent
	for rows.Next() {
		var event AuditEvent
		if err := rows.Scan(&event.ID, &event.SubjectType, &event.SubjectID, &event.EventType, &event.ActorType, &event.ActorID, &event.EventPayload, &event.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, event)
	}
	return out, rows.Err()
}

type scanner interface {
	Scan(dest ...any) error
}

func scanWalletChallenge(row scanner) (*WalletChallenge, error) {
	var ch WalletChallenge
	var consumed sql.NullTime
	err := row.Scan(&ch.Nonce, &ch.UserID, &ch.ChainID, &ch.WalletAddress, &ch.Message, &ch.ExpiresAt, &consumed, &ch.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrChallengeNotFound
	}
	if err != nil {
		return nil, err
	}
	if consumed.Valid {
		ch.ConsumedAt = &consumed.Time
	}
	return &ch, nil
}

func scanWalletConnection(row scanner) (*WalletConnection, error) {
	var conn WalletConnection
	err := row.Scan(
		&conn.ID, &conn.UserID, &conn.ChainType, &conn.ChainID, &conn.WalletAddress, &conn.NormalizedAddress,
		&conn.Signature, &conn.Message, &conn.Nonce, &conn.VerifiedAt, &conn.LastSeenAt, &conn.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &conn, nil
}

func depositIntentSelect() string {
	return `
SELECT id::text, user_id, wallet_connection_id::text, chain_id, chain_name, token_symbol,
       token_address, token_decimals, treasury_address, from_address, amount_cents,
       amount_units::text, status, COALESCE(tx_hash, ''), COALESCE(credited_wallet_entry_id, ''),
       COALESCE(failure_reason, ''), idempotency_key, expires_at, submitted_at,
       confirmed_at, credited_at, created_at, updated_at
FROM alpha_deposit_intents
`
}

func scanDepositIntent(row scanner) (*DepositIntent, error) {
	var intent DepositIntent
	var submitted, confirmed, credited sql.NullTime
	err := row.Scan(
		&intent.ID, &intent.UserID, &intent.WalletConnectionID, &intent.ChainID, &intent.ChainName,
		&intent.TokenSymbol, &intent.TokenAddress, &intent.TokenDecimals, &intent.TreasuryAddress,
		&intent.FromAddress, &intent.AmountCents, &intent.AmountUnits, &intent.Status, &intent.TxHash,
		&intent.CreditedWalletEntryID, &intent.FailureReason, &intent.IdempotencyKey, &intent.ExpiresAt,
		&submitted, &confirmed, &credited, &intent.CreatedAt, &intent.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	if submitted.Valid {
		intent.SubmittedAt = &submitted.Time
	}
	if confirmed.Valid {
		intent.ConfirmedAt = &confirmed.Time
	}
	if credited.Valid {
		intent.CreditedAt = &credited.Time
	}
	return &intent, nil
}

func withdrawalRequestSelect() string {
	return `
SELECT id::text, user_id, chain_id, token_symbol, token_address, destination_address,
       amount_cents, amount_units::text, status, COALESCE(wallet_reservation_id, ''),
       requested_at, reviewed_at, COALESCE(reviewed_by, ''), COALESCE(review_note, ''),
       COALESCE(broadcast_tx_hash, ''), completed_at, COALESCE(failure_reason, ''),
       idempotency_key, created_at, updated_at
FROM alpha_withdrawal_requests
`
}

func scanWithdrawalRequest(row scanner) (*WithdrawalRequest, error) {
	var req WithdrawalRequest
	var reviewed, completed sql.NullTime
	err := row.Scan(
		&req.ID, &req.UserID, &req.ChainID, &req.TokenSymbol, &req.TokenAddress,
		&req.DestinationAddress, &req.AmountCents, &req.AmountUnits, &req.Status,
		&req.WalletReservationID, &req.RequestedAt, &reviewed, &req.ReviewedBy,
		&req.ReviewNote, &req.BroadcastTxHash, &completed, &req.FailureReason,
		&req.IdempotencyKey, &req.CreatedAt, &req.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	if reviewed.Valid {
		req.ReviewedAt = &reviewed.Time
	}
	if completed.Valid {
		req.CompletedAt = &completed.Time
	}
	return &req, nil
}

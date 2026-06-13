package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shopspring/decimal"

	"github.com/phoenixbot/phoenix-settlement/internal/models"
)

var ErrNotFound = errors.New("not found")

type Repository interface {
	CreateSettlementBatch(ctx context.Context, actorID string, req models.CreateSettlementBatchRequest) (*models.SettlementBatchResponse, error)
	GetSettlementBatch(ctx context.Context, batchID string) (*models.SettlementBatchResponse, error)
	ListSettlementBatches(ctx context.Context, status string, startDate, endDate *time.Time, page, limit int) (*models.ListSettlementBatchesResponse, error)
	CreateManualPayout(ctx context.Context, actorID string, req models.ManualPayoutRequest) (*models.ManualPayoutResponse, error)
	CreateReconciliation(ctx context.Context, actorID string, req models.CreateReconciliationRequest) (*models.ReconciliationResponse, error)
	GetReconciliation(ctx context.Context, reconciliationID string) (*models.ReconciliationResponse, error)
}

type PostgresRepository struct{ pool *pgxpool.Pool }

func NewRepository(pool *pgxpool.Pool) Repository { return &PostgresRepository{pool: pool} }

type batchBet struct {
	BetID           string
	UserID          string
	MarketID        string
	OutcomeID       string
	Stake           decimal.Decimal
	PotentialPayout decimal.Decimal
	Status          string
	ReservationID   string
}

type walletRecord struct {
	ID       string
	UserID   string
	Balance  decimal.Decimal
	Currency string
	Status   string
}

func (r *PostgresRepository) CreateSettlementBatch(ctx context.Context, actorID string, req models.CreateSettlementBatchRequest) (*models.SettlementBatchResponse, error) {
	now := time.Now().UTC()
	batchID := uuid.NewString()
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	bets, err := r.loadPendingBetsForMarkets(ctx, tx, req.MarketIDs)
	if err != nil {
		return nil, err
	}
	if len(bets) == 0 {
		return nil, ErrNotFound
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO settlement_batches (id, settlement_type, status, market_count, bet_count, winning_outcomes, payout_state, created_by, created_at, started_at)
		VALUES ($1, $2, 'processing', $3, $4, $5, $6, NULLIF($7, '')::uuid, $8, $8)
	`, batchID, req.SettlementType, countUniqueMarkets(bets), len(bets), toJSONB(req.WinningOutcomes), toJSONB(map[string]int{"processing": len(bets), "completed": 0, "failed": 0}), actorID, now); err != nil {
		return nil, err
	}
	totalPayout := decimal.Zero
	settledCount := 0
	for _, bet := range bets {
		winningOutcome := strings.TrimSpace(req.WinningOutcomes[bet.MarketID])
		result := "lost"
		expected := decimal.Zero
		actual := decimal.Zero
		if winningOutcome == "" {
			result = "voided"
		} else if winningOutcome == bet.OutcomeID {
			result = "won"
			expected = bet.PotentialPayout.Sub(bet.Stake)
			actual = expected
			totalPayout = totalPayout.Add(expected)
		}
		if err := r.releaseReservationTx(ctx, tx, bet.UserID, bet.ReservationID, bet.Stake, result, bet.BetID); err != nil {
			return nil, err
		}
		if result == "won" {
			if err := r.applyWalletTransactionTx(ctx, tx, bet.UserID, "bet_win", expected, bet.BetID, map[string]any{"batch_id": batchID, "market_id": bet.MarketID, "outcome_id": bet.OutcomeID, "result": result}); err != nil {
				return nil, err
			}
		} else if result == "lost" {
			if err := r.applyWalletTransactionTx(ctx, tx, bet.UserID, "bet_place", bet.Stake.Neg(), bet.BetID, map[string]any{"batch_id": batchID, "market_id": bet.MarketID, "outcome_id": bet.OutcomeID, "result": result}); err != nil {
				return nil, err
			}
			actual = decimal.Zero
		} else {
			if err := r.applyWalletTransactionTx(ctx, tx, bet.UserID, "bet_refund", decimal.Zero, bet.BetID, map[string]any{"batch_id": batchID, "market_id": bet.MarketID, "outcome_id": bet.OutcomeID, "result": result}); err != nil {
				return nil, err
			}
		}
		if _, err := tx.Exec(ctx, `UPDATE bets SET status = $2, settled_at = $3, updated_at = $3 WHERE id = $1`, bet.BetID, result, now); err != nil {
			return nil, err
		}
		if _, err := tx.Exec(ctx, `
			INSERT INTO settlement_batch_items (id, batch_id, bet_id, user_id, market_id, outcome_id, result, reservation_id, stake, expected_payout, actual_payout, processed_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, NULLIF($8, '')::uuid, $9, $10, $11, $12)
		`, uuid.NewString(), batchID, bet.BetID, bet.UserID, nullableUUID(bet.MarketID), nullableUUID(bet.OutcomeID), result, bet.ReservationID, bet.Stake, expected, actual, now); err != nil {
			return nil, err
		}
		if err := r.appendEventTx(ctx, tx, "bet", bet.BetID, "BetSettled", map[string]any{"bet_id": bet.BetID, "batch_id": batchID, "result": result, "expected_payout": expected.String(), "actual_payout": actual.String(), "settled_at": now.Format(time.RFC3339)}); err != nil {
			return nil, err
		}
		if err := r.appendOutboxTx(ctx, tx, "bet", bet.BetID, "BetSettled", map[string]any{"bet_id": bet.BetID, "user_id": bet.UserID, "batch_id": batchID, "result": result, "expected_payout": expected.String(), "actual_payout": actual.String(), "settled_at": now.Format(time.RFC3339)}, "phoenix.bet.settled"); err != nil {
			return nil, err
		}
		settledCount++
	}
	payoutState := map[string]int{"processing": 0, "completed": settledCount, "failed": 0}
	if _, err := tx.Exec(ctx, `
		UPDATE settlement_batches SET status = 'completed', settled_count = $2, pending_count = 0, total_payout = $3, payout_state = $4, completed_at = $5
		WHERE id = $1
	`, batchID, settledCount, totalPayout, toJSONB(payoutState), now); err != nil {
		return nil, err
	}
	if err := r.appendEventTx(ctx, tx, "settlement-batch", batchID, "SettlementBatchCompleted", map[string]any{"batch_id": batchID, "market_count": countUniqueMarkets(bets), "bet_count": len(bets), "settled_count": settledCount, "total_payout": totalPayout.String(), "completed_at": now.Format(time.RFC3339)}); err != nil {
		return nil, err
	}
	if err := r.appendOutboxTx(ctx, tx, "settlement-batch", batchID, "SettlementBatchCompleted", map[string]any{"batch_id": batchID, "status": "completed", "settled_count": settledCount, "total_payout": totalPayout.String()}, "phoenix.settlement.batch-started"); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	startedAt := now
	completedAt := now
	return &models.SettlementBatchResponse{BatchID: batchID, Status: "processing", MarketCount: countUniqueMarkets(bets), BetCount: len(bets), TotalPayout: totalPayout, CreatedAt: now, StartedAt: &startedAt, CompletedAt: &completedAt}, nil
}

func (r *PostgresRepository) GetSettlementBatch(ctx context.Context, batchID string) (*models.SettlementBatchResponse, error) {
	resp := &models.SettlementBatchResponse{}
	var payoutStateBytes []byte
	if err := r.pool.QueryRow(ctx, `
		SELECT id, status, market_count, bet_count, settled_count, pending_count, total_payout, payout_state, created_at, started_at, completed_at
		FROM settlement_batches WHERE id = $1
	`, batchID).Scan(&resp.BatchID, &resp.Status, &resp.MarketCount, &resp.BetCount, &resp.SettledCount, &resp.PendingCount, &resp.TotalPayout, &payoutStateBytes, &resp.CreatedAt, &resp.StartedAt, &resp.CompletedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	var ps models.PayoutState
	_ = json.Unmarshal(payoutStateBytes, &ps)
	resp.PayoutState = &ps
	return resp, nil
}

func (r *PostgresRepository) ListSettlementBatches(ctx context.Context, status string, startDate, endDate *time.Time, page, limit int) (*models.ListSettlementBatchesResponse, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit
	conditions := []string{"1=1"}
	args := []any{}
	argPos := 1
	if status = strings.TrimSpace(status); status != "" {
		conditions = append(conditions, fmt.Sprintf("status = $%d", argPos))
		args = append(args, status)
		argPos++
	}
	if startDate != nil {
		conditions = append(conditions, fmt.Sprintf("created_at >= $%d", argPos))
		args = append(args, *startDate)
		argPos++
	}
	if endDate != nil {
		conditions = append(conditions, fmt.Sprintf("created_at <= $%d", argPos))
		args = append(args, *endDate)
		argPos++
	}
	where := strings.Join(conditions, " AND ")
	var total int
	if err := r.pool.QueryRow(ctx, "SELECT COUNT(*) FROM settlement_batches WHERE "+where, args...).Scan(&total); err != nil {
		return nil, err
	}
	args = append(args, limit, offset)
	rows, err := r.pool.Query(ctx, fmt.Sprintf(`SELECT id, status, market_count, bet_count, settled_count, pending_count, total_payout, created_at, started_at, completed_at FROM settlement_batches WHERE %s ORDER BY created_at DESC LIMIT $%d OFFSET $%d`, where, argPos, argPos+1), args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	resp := &models.ListSettlementBatchesResponse{Data: []models.SettlementBatchResponse{}, Pagination: models.Pagination{Page: page, Limit: limit, Total: total}}
	for rows.Next() {
		var item models.SettlementBatchResponse
		if err := rows.Scan(&item.BatchID, &item.Status, &item.MarketCount, &item.BetCount, &item.SettledCount, &item.PendingCount, &item.TotalPayout, &item.CreatedAt, &item.StartedAt, &item.CompletedAt); err != nil {
			return nil, err
		}
		resp.Data = append(resp.Data, item)
	}
	return resp, rows.Err()
}

func (r *PostgresRepository) CreateManualPayout(ctx context.Context, actorID string, req models.ManualPayoutRequest) (*models.ManualPayoutResponse, error) {
	now := time.Now().UTC()
	payoutID := uuid.NewString()
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	if err := ensureUserExists(ctx, tx, req.UserID); err != nil {
		return nil, err
	}
	if err := r.applyWalletTransactionTx(ctx, tx, req.UserID, "bet_refund", req.Amount, req.ReferenceID, map[string]any{"reason": req.Reason, "manual": true}); err != nil {
		return nil, err
	}
	if _, err := tx.Exec(ctx, `INSERT INTO manual_payouts (id, user_id, amount, reason, reference_id, status, created_by, created_at) VALUES ($1,$2,$3,$4,$5,'processed',NULLIF($6,'')::uuid,$7)`, payoutID, req.UserID, req.Amount, req.Reason, nullableString(req.ReferenceID), actorID, now); err != nil {
		return nil, err
	}
	if err := r.appendEventTx(ctx, tx, "manual-payout", payoutID, "ManualPayoutProcessed", map[string]any{"payout_id": payoutID, "user_id": req.UserID, "amount": req.Amount.String(), "reason": req.Reason, "reference_id": req.ReferenceID, "created_at": now.Format(time.RFC3339)}); err != nil {
		return nil, err
	}
	if err := r.appendOutboxTx(ctx, tx, "manual-payout", payoutID, "ManualPayoutProcessed", map[string]any{"payout_id": payoutID, "user_id": req.UserID, "amount": req.Amount.String(), "status": "processed"}, "phoenix.settlement.payout-processed"); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return &models.ManualPayoutResponse{PayoutID: payoutID, UserID: req.UserID, Amount: req.Amount, Status: "processed", CreatedAt: now}, nil
}

func (r *PostgresRepository) CreateReconciliation(ctx context.Context, actorID string, req models.CreateReconciliationRequest) (*models.ReconciliationResponse, error) {
	now := time.Now().UTC()
	reconID := uuid.NewString()
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	if err := ensureBatchExists(ctx, tx, req.BatchID); err != nil {
		return nil, err
	}
	details, err := r.computeReconciliationDetails(ctx, tx, req.BatchID)
	if err != nil {
		return nil, err
	}
	completedAt := now
	if _, err := tx.Exec(ctx, `INSERT INTO reconciliations (id, batch_id, reconciliation_type, status, discrepancies_found, reconciliation_details, started_at, completed_at, created_by) VALUES ($1,$2,$3,'completed',$4,$5,$6,$6,NULLIF($7,'')::uuid)`, reconID, req.BatchID, req.ReconciliationType, len(details), toJSONB(details), now, actorID); err != nil {
		return nil, err
	}
	if err := r.appendEventTx(ctx, tx, "reconciliation", reconID, "SettlementReconciled", map[string]any{"reconciliation_id": reconID, "batch_id": req.BatchID, "discrepancies_found": len(details), "completed_at": now.Format(time.RFC3339)}); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return &models.ReconciliationResponse{ReconciliationID: reconID, BatchID: req.BatchID, Status: "completed", StartedAt: now, CompletedAt: &completedAt, DiscrepanciesFound: len(details), ReconciliationDetails: details}, nil
}

func (r *PostgresRepository) GetReconciliation(ctx context.Context, reconciliationID string) (*models.ReconciliationResponse, error) {
	resp := &models.ReconciliationResponse{}
	var detailsBytes []byte
	if err := r.pool.QueryRow(ctx, `SELECT id, batch_id, status, discrepancies_found, reconciliation_details, started_at, completed_at FROM reconciliations WHERE id = $1`, reconciliationID).Scan(&resp.ReconciliationID, &resp.BatchID, &resp.Status, &resp.DiscrepanciesFound, &detailsBytes, &resp.StartedAt, &resp.CompletedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	_ = json.Unmarshal(detailsBytes, &resp.ReconciliationDetails)
	return resp, nil
}

func (r *PostgresRepository) loadPendingBetsForMarkets(ctx context.Context, tx pgx.Tx, marketIDs []string) ([]batchBet, error) {
	rows, err := tx.Query(ctx, `
		SELECT b.id, b.user_id, COALESCE(b.market_id::text,''), COALESCE(b.outcome_id::text,''), b.stake, b.potential_payout, b.status,
		COALESCE((SELECT payload->>'reservation_id' FROM event_store es WHERE es.aggregate_type = 'bet' AND es.aggregate_id = b.id AND es.event_type = 'BetPlaced' ORDER BY version DESC LIMIT 1), '')
		FROM bets b
		WHERE b.status = 'pending' AND b.market_id = ANY($1::uuid[])
		ORDER BY b.created_at ASC
	`, marketIDs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []batchBet
	for rows.Next() {
		var item batchBet
		if err := rows.Scan(&item.BetID, &item.UserID, &item.MarketID, &item.OutcomeID, &item.Stake, &item.PotentialPayout, &item.Status, &item.ReservationID); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (r *PostgresRepository) releaseReservationTx(ctx context.Context, tx pgx.Tx, userID, reservationID string, amount decimal.Decimal, result, referenceID string) error {
	if strings.TrimSpace(reservationID) == "" {
		return nil
	}
	wallet, err := r.getWalletForUpdate(ctx, tx, userID)
	if err != nil {
		return err
	}
	reservationAmounts, err := r.getReservationLedgerTx(ctx, tx, wallet.ID)
	if err != nil {
		return err
	}
	reservedAmount, ok := reservationAmounts[reservationID]
	if !ok || reservedAmount.LessThan(amount) {
		return fmt.Errorf("reservation not found or insufficient reserved amount")
	}
	payload := map[string]any{"reservation_id": reservationID, "amount": amount.String(), "reference_id": referenceID, "reference_type": "bet", "action": "release", "result": result}
	return r.appendEventTx(ctx, tx, "wallet", wallet.ID, "WalletFundsReleased", payload)
}

func (r *PostgresRepository) applyWalletTransactionTx(ctx context.Context, tx pgx.Tx, userID, txType string, amount decimal.Decimal, reference string, metadata map[string]any) error {
	wallet, err := r.getWalletForUpdate(ctx, tx, userID)
	if err != nil {
		return err
	}
	before := wallet.Balance
	after := before.Add(amount)
	if after.LessThan(decimal.Zero) {
		return fmt.Errorf("wallet balance cannot go negative")
	}
	meta, err := json.Marshal(metadata)
	if err != nil {
		return err
	}
	now := time.Now().UTC()
	transactionID := uuid.NewString()
	if _, err := tx.Exec(ctx, `UPDATE wallets SET balance = $2, updated_at = $3 WHERE id = $1`, wallet.ID, after, now); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `INSERT INTO wallet_transactions (id, wallet_id, type, amount, balance_before, balance_after, reference, metadata, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, transactionID, wallet.ID, txType, amount, before, after, nullableString(reference), meta, now); err != nil {
		return err
	}
	if err := r.appendEventTx(ctx, tx, "wallet", wallet.ID, "WalletTransactionApplied", map[string]any{"transaction_id": transactionID, "type": txType, "amount": amount.String(), "balance_before": before.String(), "balance_after": after.String(), "reference": reference}); err != nil {
		return err
	}
	return r.appendOutboxTx(ctx, tx, "wallet", wallet.ID, "WalletTransactionApplied", map[string]any{"transaction_id": transactionID, "type": txType, "amount": amount.String(), "reference": reference}, "phoenix.wallet.transactions")
}

func (r *PostgresRepository) getWalletForUpdate(ctx context.Context, tx pgx.Tx, userID string) (*walletRecord, error) {
	wallet := &walletRecord{}
	if err := tx.QueryRow(ctx, `SELECT id, user_id, balance, currency, status FROM wallets WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1 FOR UPDATE`, userID).Scan(&wallet.ID, &wallet.UserID, &wallet.Balance, &wallet.Currency, &wallet.Status); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return wallet, nil
}

func (r *PostgresRepository) getReservationLedgerTx(ctx context.Context, tx pgx.Tx, walletID string) (map[string]decimal.Decimal, error) {
	rows, err := tx.Query(ctx, `
		SELECT event_type, payload
		FROM event_store
		WHERE aggregate_type = 'wallet' AND aggregate_id = $1 AND event_type IN ('WalletFundsReserved', 'WalletFundsReleased')
		ORDER BY version ASC
	`, walletID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	ledger := map[string]decimal.Decimal{}
	for rows.Next() {
		var eventType string
		var payloadBytes []byte
		if err := rows.Scan(&eventType, &payloadBytes); err != nil {
			return nil, err
		}
		var payload map[string]any
		if err := json.Unmarshal(payloadBytes, &payload); err != nil {
			return nil, err
		}
		reservationID, _ := payload["reservation_id"].(string)
		amountStr, _ := payload["amount"].(string)
		amount, err := decimal.NewFromString(amountStr)
		if err != nil {
			return nil, err
		}
		switch eventType {
		case "WalletFundsReserved":
			ledger[reservationID] = ledger[reservationID].Add(amount)
		case "WalletFundsReleased":
			ledger[reservationID] = ledger[reservationID].Sub(amount)
			if !ledger[reservationID].IsPositive() {
				delete(ledger, reservationID)
			}
		}
	}
	return ledger, rows.Err()
}

func (r *PostgresRepository) computeReconciliationDetails(ctx context.Context, tx pgx.Tx, batchID string) ([]models.ReconciliationDetail, error) {
	rows, err := tx.Query(ctx, `SELECT bet_id, expected_payout, actual_payout FROM settlement_batch_items WHERE batch_id = $1 ORDER BY processed_at ASC`, batchID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	details := make([]models.ReconciliationDetail, 0)
	for rows.Next() {
		var betID string
		var expected, actual decimal.Decimal
		if err := rows.Scan(&betID, &expected, &actual); err != nil {
			return nil, err
		}
		if !expected.Equal(actual) {
			details = append(details, models.ReconciliationDetail{BetID: betID, DiscrepancyType: "payout_mismatch", Expected: expected, Actual: actual, Variance: actual.Sub(expected)})
		}
	}
	return details, rows.Err()
}

func ensureUserExists(ctx context.Context, tx pgx.Tx, userID string) error {
	var id string
	if err := tx.QueryRow(ctx, `SELECT id FROM users WHERE id = $1`, userID).Scan(&id); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		return err
	}
	return nil
}

func ensureBatchExists(ctx context.Context, tx pgx.Tx, batchID string) error {
	var id string
	if err := tx.QueryRow(ctx, `SELECT id FROM settlement_batches WHERE id = $1`, batchID).Scan(&id); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		return err
	}
	return nil
}

func (r *PostgresRepository) appendEventTx(ctx context.Context, tx pgx.Tx, aggregateType, aggregateID, eventType string, payload map[string]any) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	var version int
	if err := tx.QueryRow(ctx, `SELECT COALESCE(MAX(version), 0) + 1 FROM event_store WHERE aggregate_type = $1 AND aggregate_id = $2`, aggregateType, aggregateID).Scan(&version); err != nil {
		return err
	}
	_, err = tx.Exec(ctx, `INSERT INTO event_store (aggregate_type, aggregate_id, event_type, version, payload, metadata) VALUES ($1,$2,$3,$4,$5,'{}'::jsonb)`, aggregateType, aggregateID, eventType, version, body)
	return err
}

func (r *PostgresRepository) appendOutboxTx(ctx context.Context, tx pgx.Tx, aggregateType, aggregateID, eventType string, payload map[string]any, topic string) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	_, err = tx.Exec(ctx, `INSERT INTO event_outbox (aggregate_type, aggregate_id, event_type, payload, kafka_topic, kafka_key) VALUES ($1,$2,$3,$4,$5,$6)`, aggregateType, aggregateID, eventType, body, topic, aggregateID)
	return err
}

func toJSONB(value any) []byte {
	body, _ := json.Marshal(value)
	return body
}

func countUniqueMarkets(bets []batchBet) int {
	set := map[string]struct{}{}
	for _, bet := range bets {
		if bet.MarketID != "" {
			set[bet.MarketID] = struct{}{}
		}
	}
	return len(set)
}

func nullableString(value string) any {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	return strings.TrimSpace(value)
}

func nullableUUID(value string) any {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	return value
}

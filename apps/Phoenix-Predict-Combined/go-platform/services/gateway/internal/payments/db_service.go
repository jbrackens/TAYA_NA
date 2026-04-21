package payments

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"strings"
	"time"

	"phoenix-revival/gateway/internal/wallet"
)

const paymentDBTimeout = 5 * time.Second

// depositAutoApprove controls whether deposits are auto-approved without an
// external payment gateway. In production/staging this MUST be false — deposits
// remain "pending" until a webhook confirms them. In development it defaults to
// true so the platform works out-of-the-box without Stripe/Adyen integration.
var depositAutoApprove bool

func init() {
	env := strings.ToLower(strings.TrimSpace(os.Getenv("ENVIRONMENT")))
	if env == "production" || env == "staging" {
		depositAutoApprove = false
	} else {
		depositAutoApprove = strings.ToLower(strings.TrimSpace(os.Getenv("DEPOSIT_AUTO_APPROVE"))) != "false"
	}
}

// DBPaymentService is a production-grade payment service backed by PostgreSQL.
// It implements a proper payment state machine:
//   - Deposits: pending → processing → approved | failed
//   - Withdrawals: pending → processing → processed | failed
//
// Wallet credits/debits happen only on terminal state transitions, not on initiation.
// This prevents money movement before payment confirmation.
type DBPaymentService struct {
	db            *sql.DB
	walletService *wallet.Service
}

// NewDBPaymentService creates a production payment service.
func NewDBPaymentService(db *sql.DB, walletService *wallet.Service) (*DBPaymentService, error) {
	svc := &DBPaymentService{db: db, walletService: walletService}
	if err := svc.ensureSchema(); err != nil {
		return nil, fmt.Errorf("payment schema init: %w", err)
	}
	return svc, nil
}

func (s *DBPaymentService) ensureSchema() error {
	ctx, cancel := context.WithTimeout(context.Background(), paymentDBTimeout)
	defer cancel()

	statements := []string{
		`CREATE TABLE IF NOT EXISTS payment_transactions (
  id BIGSERIAL PRIMARY KEY,
  txn_id TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  txn_type TEXT NOT NULL CHECK (txn_type IN ('deposit','withdrawal')),
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  payment_method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  confirmation_code TEXT,
  error_message TEXT,
  wallet_ledger_entry_id TEXT,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
)`,
		`CREATE INDEX IF NOT EXISTS idx_payment_txn_user ON payment_transactions (user_id, txn_type, created_at DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_payment_txn_status ON payment_transactions (status)`,
	}

	for _, stmt := range statements {
		if _, err := s.db.ExecContext(ctx, stmt); err != nil {
			return err
		}
	}
	return nil
}

func (s *DBPaymentService) InitiateDeposit(ctx context.Context, userID string, amountCents int64, paymentMethod string) (*DepositResult, error) {
	if userID == "" {
		return nil, ErrInvalidUserID
	}
	if amountCents <= 0 {
		return nil, ErrInvalidAmount
	}
	if paymentMethod == "" {
		return nil, ErrInvalidPaymentMethod
	}

	ctx, cancel := context.WithTimeout(ctx, paymentDBTimeout)
	defer cancel()

	now := time.Now().UTC()
	txnID := fmt.Sprintf("dep:db:%d", now.UnixNano())
	idempotencyKey := fmt.Sprintf("deposit:%s:%d:%d", userID, amountCents, now.UnixNano())

	// Create pending deposit transaction
	_, err := s.db.ExecContext(ctx, `
INSERT INTO payment_transactions (txn_id, user_id, txn_type, amount_cents, payment_method, status, idempotency_key)
VALUES ($1, $2, 'deposit', $3, $4, 'pending', $5)`,
		txnID, userID, amountCents, paymentMethod, idempotencyKey)
	if err != nil {
		return nil, fmt.Errorf("create deposit record: %w", err)
	}

	if !depositAutoApprove {
		// Production: deposit stays pending until external webhook confirms it.
		// The gateway integration calls HandleWebhook() when the provider confirms.
		slog.Info("deposit pending — awaiting external confirmation", "txn_id", txnID, "user_id", userID, "amount_cents", amountCents)
		return &DepositResult{
			TransactionID: txnID,
			Status:        "pending",
			Amount:        amountCents,
			PaymentMethod: paymentMethod,
		}, nil
	}

	// Development only: auto-approve for local testing without payment provider.
	slog.Warn("deposit auto-approved (dev mode)", "txn_id", txnID, "user_id", userID, "amount_cents", amountCents)
	result, err := s.processDepositApproval(ctx, txnID, userID, amountCents, paymentMethod)
	if err != nil {
		_, _ = s.db.ExecContext(ctx, `
UPDATE payment_transactions SET status = 'failed', error_message = $2, updated_at = NOW()
WHERE txn_id = $1`, txnID, err.Error())
		return nil, err
	}

	return result, nil
}

func (s *DBPaymentService) processDepositApproval(ctx context.Context, txnID, userID string, amountCents int64, paymentMethod string) (*DepositResult, error) {
	// Credit wallet with idempotency
	entry, err := s.walletService.Credit(wallet.MutationRequest{
		UserID:         userID,
		AmountCents:    amountCents,
		IdempotencyKey: "payment:" + txnID,
		Reason:         fmt.Sprintf("deposit via %s", paymentMethod),
	})
	if err != nil {
		return nil, fmt.Errorf("wallet credit failed: %w", err)
	}

	now := time.Now().UTC()
	confirmCode := fmt.Sprintf("CONF-%s", txnID[4:]) // strip "dep:" prefix

	// Update transaction to approved
	_, err = s.db.ExecContext(ctx, `
UPDATE payment_transactions
SET status = 'approved', confirmation_code = $2, wallet_ledger_entry_id = $3, processed_at = NOW(), updated_at = NOW()
WHERE txn_id = $1`, txnID, confirmCode, entry.EntryID)
	if err != nil {
		slog.Error("deposit approved but failed to update transaction record", "txn_id", txnID, "error", err)
	}

	return &DepositResult{
		TransactionID:    txnID,
		UserID:           userID,
		Amount:           amountCents,
		Status:           "approved",
		PaymentMethod:    paymentMethod,
		CreatedAt:        now.Format(time.RFC3339),
		ProcessedAt:      now.Format(time.RFC3339),
		ConfirmationCode: confirmCode,
	}, nil
}

func (s *DBPaymentService) InitiateWithdrawal(ctx context.Context, userID string, amountCents int64, paymentMethod string) (*WithdrawalResult, error) {
	if userID == "" {
		return nil, ErrInvalidUserID
	}
	if amountCents <= 0 {
		return nil, ErrInvalidAmount
	}
	if paymentMethod == "" {
		return nil, ErrInvalidPaymentMethod
	}

	ctx, cancel := context.WithTimeout(ctx, paymentDBTimeout)
	defer cancel()

	// Use wallet reservation to hold funds (instead of direct debit)
	reservation, err := s.walletService.Hold(wallet.HoldRequest{
		UserID:        userID,
		AmountCents:   amountCents,
		ReferenceType: "withdrawal",
		ReferenceID:   fmt.Sprintf("wdr:%s:%d", userID, time.Now().UTC().UnixNano()),
		ExpiresIn:     24 * time.Hour, // withdrawal holds last 24h
	})
	if err != nil {
		if errors.Is(err, wallet.ErrInsufficientFunds) {
			return nil, ErrInsufficientFunds
		}
		return nil, fmt.Errorf("failed to hold funds: %w", err)
	}

	now := time.Now().UTC()
	txnID := fmt.Sprintf("wdr:db:%d", now.UnixNano())

	_, err = s.db.ExecContext(ctx, `
INSERT INTO payment_transactions (txn_id, user_id, txn_type, amount_cents, payment_method, status, idempotency_key)
VALUES ($1, $2, 'withdrawal', $3, $4, 'pending', $5)`,
		txnID, userID, amountCents, paymentMethod, reservation.ID)
	if err != nil {
		// Release the hold if we can't record the transaction
		_ = s.walletService.Release(reservation.ReferenceType, reservation.ReferenceID)
		return nil, fmt.Errorf("create withdrawal record: %w", err)
	}

	slog.Info("withdrawal initiated", "txn_id", txnID, "user_id", userID, "amount_cents", amountCents, "reservation", reservation.ID)

	return &WithdrawalResult{
		TransactionID: txnID,
		UserID:        userID,
		Amount:        amountCents,
		Status:        "pending",
		PaymentMethod: paymentMethod,
		CreatedAt:     now.Format(time.RFC3339),
		EstimatedAt:   now.Add(2 * time.Hour).Format(time.RFC3339),
	}, nil
}

func (s *DBPaymentService) GetPaymentMethods(ctx context.Context, userID string) ([]PaymentMethod, error) {
	if userID == "" {
		return nil, ErrInvalidUserID
	}

	// Default payment methods (in production, these would come from a payment vault)
	return []PaymentMethod{
		{
			ID:        "cc:default",
			Type:      "credit_card",
			Label:     "Credit/Debit Card",
			IsActive:  true,
			IsDefault: true,
			CreatedAt: time.Now().UTC().Format(time.RFC3339),
		},
		{
			ID:        "bank:default",
			Type:      "bank_transfer",
			Label:     "Bank Transfer",
			IsActive:  true,
			CreatedAt: time.Now().UTC().Format(time.RFC3339),
		},
	}, nil
}

func (s *DBPaymentService) GetTransactionStatus(ctx context.Context, txnID string) (*TransactionStatus, error) {
	if txnID == "" {
		return nil, ErrTransactionNotFound
	}

	ctx, cancel := context.WithTimeout(ctx, paymentDBTimeout)
	defer cancel()

	var txn TransactionStatus
	var processedAt sql.NullString
	var confirmCode sql.NullString
	var errorMsg sql.NullString

	err := s.db.QueryRowContext(ctx, `
SELECT txn_id, user_id, txn_type, amount_cents, status, payment_method,
       CAST(created_at AS TEXT), CAST(updated_at AS TEXT),
       CAST(processed_at AS TEXT), confirmation_code, error_message
FROM payment_transactions
WHERE txn_id = $1`, txnID).Scan(
		&txn.TransactionID, &txn.UserID, &txn.Type, &txn.Amount,
		&txn.Status, &txn.PaymentMethod, &txn.CreatedAt, &txn.UpdatedAt,
		&processedAt, &confirmCode, &errorMsg)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrTransactionNotFound
		}
		return nil, err
	}
	if processedAt.Valid {
		txn.ProcessedAt = processedAt.String
	}
	if confirmCode.Valid {
		txn.ConfirmationCode = confirmCode.String
	}
	if errorMsg.Valid {
		txn.ErrorMessage = errorMsg.String
	}
	return &txn, nil
}

func (s *DBPaymentService) HandleWebhook(ctx context.Context, payload WebhookPayload) error {
	if payload.TransactionID == "" {
		return ErrTransactionNotFound
	}

	ctx, cancel := context.WithTimeout(ctx, paymentDBTimeout)
	defer cancel()

	// Look up transaction
	var txnType, currentStatus, userID string
	var amountCents int64
	var paymentMethod string
	err := s.db.QueryRowContext(ctx, `
SELECT txn_type, status, user_id, amount_cents, payment_method
FROM payment_transactions
WHERE txn_id = $1 FOR UPDATE`, payload.TransactionID).Scan(
		&txnType, &currentStatus, &userID, &amountCents, &paymentMethod)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrTransactionNotFound
		}
		return err
	}

	// Process based on event type
	switch strings.ToLower(payload.Status) {
	case "approved", "completed", "processed":
		if !canApplyWebhookTransition(currentStatus) {
			slog.Info("ignoring duplicate or stale successful webhook", "txn_id", payload.TransactionID, "current_status", currentStatus, "incoming_status", payload.Status)
			return nil
		}
		if txnType == "deposit" && currentStatus == "pending" {
			_, err := s.processDepositApproval(ctx, payload.TransactionID, userID, amountCents, paymentMethod)
			if err != nil {
				return err
			}
		}
		if txnType == "withdrawal" && currentStatus == "pending" {
			// Capture the held funds
			_, captureErr := s.walletService.Capture("withdrawal", payload.TransactionID)
			if captureErr != nil {
				slog.Error("withdrawal capture failed", "txn_id", payload.TransactionID, "error", captureErr)
			}
			_, _ = s.db.ExecContext(ctx, `
UPDATE payment_transactions SET status = 'processed', processed_at = NOW(), updated_at = NOW()
WHERE txn_id = $1`, payload.TransactionID)
		}

	case "failed", "declined":
		if !canApplyWebhookTransition(currentStatus) {
			slog.Info("ignoring duplicate or stale failed webhook", "txn_id", payload.TransactionID, "current_status", currentStatus, "incoming_status", payload.Status)
			return nil
		}
		if txnType == "withdrawal" && currentStatus == "pending" {
			// Release the hold
			_ = s.walletService.Release("withdrawal", payload.TransactionID)
		}
		_, _ = s.db.ExecContext(ctx, `
UPDATE payment_transactions SET status = $2, error_message = $3, updated_at = NOW()
WHERE txn_id = $1`, payload.TransactionID, payload.Status, payload.Data["error"])
	}

	slog.Info("webhook processed", "txn_id", payload.TransactionID, "event", payload.EventType, "status", payload.Status)
	return nil
}

func canApplyWebhookTransition(currentStatus string) bool {
	return strings.EqualFold(strings.TrimSpace(currentStatus), "pending")
}

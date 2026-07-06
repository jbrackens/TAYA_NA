package http

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"taptrade/gateway/internal/prediction"
	"taptrade/gateway/internal/wallet"
)

// PredictionWalletAdapter bridges the prediction platform's WalletAdapter
// interface to the concrete wallet.Service. This keeps prediction decoupled
// from the wallet package's internal types.
type PredictionWalletAdapter struct {
	svc *wallet.Service
}

// NewPredictionWalletAdapter returns a prediction.WalletAdapter backed by the
// gateway's wallet service.
func NewPredictionWalletAdapter(svc *wallet.Service) prediction.WalletAdapter {
	if svc == nil {
		return prediction.NoopWallet{}
	}
	return &PredictionWalletAdapter{svc: svc}
}

func (a *PredictionWalletAdapter) Debit(ctx context.Context, userID string, amountCents int64, idempotencyKey, reason string) error {
	_, err := a.svc.Debit(ctx, wallet.MutationRequest{
		UserID:         userID,
		AmountCents:    amountCents,
		IdempotencyKey: idempotencyKey,
		Reason:         reason,
	})
	return err
}

func (a *PredictionWalletAdapter) Credit(ctx context.Context, userID string, amountCents int64, idempotencyKey, reason string) error {
	_, err := a.svc.Credit(ctx, wallet.MutationRequest{
		UserID:         userID,
		AmountCents:    amountCents,
		IdempotencyKey: idempotencyKey,
		Reason:         reason,
	})
	return err
}

func (a *PredictionWalletAdapter) Balance(ctx context.Context, userID string) int64 {
	return a.svc.Balance(ctx, userID)
}

func (a *PredictionWalletAdapter) BeginTx(ctx context.Context) (*sql.Tx, error) {
	if a.svc == nil || a.svc.DB() == nil {
		return nil, fmt.Errorf("wallet database unavailable")
	}
	return a.svc.DB().BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
}

func (a *PredictionWalletAdapter) DebitWithTx(ctx context.Context, tx *sql.Tx, userID string, amountCents int64, idempotencyKey, reason string) error {
	_, err := a.svc.DebitWithTx(ctx, tx, wallet.MutationRequest{
		UserID:         userID,
		AmountCents:    amountCents,
		IdempotencyKey: idempotencyKey,
		Reason:         reason,
	})
	return err
}

func (a *PredictionWalletAdapter) CreditWithTx(ctx context.Context, tx *sql.Tx, userID string, amountCents int64, idempotencyKey, reason string) error {
	_, err := a.svc.CreditWithTx(ctx, tx, wallet.MutationRequest{
		UserID:         userID,
		AmountCents:    amountCents,
		IdempotencyKey: idempotencyKey,
		Reason:         reason,
	})
	return err
}

// --- ExchangeWalletAdapter implementation ---

// BeginExchangeTx opens a READ COMMITTED transaction for the exchange engine.
// Per-market serialization is provided by pg_advisory_xact_lock taken by the
// caller after BEGIN; SERIALIZABLE would only add retry overhead without
// correctness benefit when the lock already serializes contending writers.
func (a *PredictionWalletAdapter) BeginExchangeTx(ctx context.Context) (*sql.Tx, error) {
	if a.svc == nil || a.svc.DB() == nil {
		return nil, fmt.Errorf("wallet database unavailable")
	}
	return a.svc.DB().BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelReadCommitted})
}

func (a *PredictionWalletAdapter) HoldWithTx(ctx context.Context, tx *sql.Tx, userID string, amountCents int64, refType, refID string, expiresIn time.Duration) error {
	_, err := a.svc.HoldWithTx(ctx, tx, wallet.HoldRequest{
		UserID:        userID,
		AmountCents:   amountCents,
		ReferenceType: refType,
		ReferenceID:   refID,
		ExpiresIn:     expiresIn,
	})
	return err
}

func (a *PredictionWalletAdapter) CaptureReservationWithTx(ctx context.Context, tx *sql.Tx, refType, refID string, amountCents int64, captureKey string) error {
	_, err := a.svc.CaptureReservationWithTx(ctx, tx, refType, refID, amountCents, captureKey)
	return err
}

func (a *PredictionWalletAdapter) ReleaseReservationWithTx(ctx context.Context, tx *sql.Tx, refType, refID string) error {
	return a.svc.ReleaseReservationWithTx(ctx, tx, refType, refID)
}

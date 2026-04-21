package http

import (
	"context"
	"database/sql"
	"fmt"

	"phoenix-revival/gateway/internal/prediction"
	"phoenix-revival/gateway/internal/wallet"
)

// predictionWalletAdapter bridges the prediction platform's WalletAdapter
// interface to the concrete wallet.Service. This keeps prediction decoupled
// from the wallet package's internal types.
type predictionWalletAdapter struct {
	svc *wallet.Service
}

// newPredictionWalletAdapter returns a prediction.WalletAdapter backed by the
// gateway's wallet service.
func newPredictionWalletAdapter(svc *wallet.Service) prediction.WalletAdapter {
	if svc == nil {
		return prediction.NoopWallet{}
	}
	return &predictionWalletAdapter{svc: svc}
}

func (a *predictionWalletAdapter) Debit(userID string, amountCents int64, idempotencyKey, reason string) error {
	_, err := a.svc.Debit(wallet.MutationRequest{
		UserID:         userID,
		AmountCents:    amountCents,
		IdempotencyKey: idempotencyKey,
		Reason:         reason,
	})
	return err
}

func (a *predictionWalletAdapter) Credit(userID string, amountCents int64, idempotencyKey, reason string) error {
	_, err := a.svc.Credit(wallet.MutationRequest{
		UserID:         userID,
		AmountCents:    amountCents,
		IdempotencyKey: idempotencyKey,
		Reason:         reason,
	})
	return err
}

func (a *predictionWalletAdapter) Balance(userID string) int64 {
	return a.svc.Balance(userID)
}

func (a *predictionWalletAdapter) BeginTx(ctx context.Context) (*sql.Tx, error) {
	if a.svc == nil || a.svc.DB() == nil {
		return nil, fmt.Errorf("wallet database unavailable")
	}
	return a.svc.DB().BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
}

func (a *predictionWalletAdapter) DebitWithTx(ctx context.Context, tx *sql.Tx, userID string, amountCents int64, idempotencyKey, reason string) error {
	_, err := a.svc.DebitWithTx(ctx, tx, wallet.MutationRequest{
		UserID:         userID,
		AmountCents:    amountCents,
		IdempotencyKey: idempotencyKey,
		Reason:         reason,
	})
	return err
}

func (a *predictionWalletAdapter) CreditWithTx(ctx context.Context, tx *sql.Tx, userID string, amountCents int64, idempotencyKey, reason string) error {
	_, err := a.svc.CreditWithTx(ctx, tx, wallet.MutationRequest{
		UserID:         userID,
		AmountCents:    amountCents,
		IdempotencyKey: idempotencyKey,
		Reason:         reason,
	})
	return err
}

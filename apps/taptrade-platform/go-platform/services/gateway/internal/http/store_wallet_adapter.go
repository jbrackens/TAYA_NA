package http

import (
	"context"
	"database/sql"

	"taptrade/gateway/internal/store"
	"taptrade/gateway/internal/wallet"
)

// StoreWalletAdapter bridges the point store's WalletAdapter interface to
// the concrete wallet.Service, mirroring prediction_wallet_adapter.go so the
// store package stays decoupled from the wallet package's internal types.
type StoreWalletAdapter struct {
	svc *wallet.Service
}

// NewStoreWalletAdapter returns a store.WalletAdapter backed by the
// gateway's wallet service.
func NewStoreWalletAdapter(svc *wallet.Service) store.WalletAdapter {
	return &StoreWalletAdapter{svc: svc}
}

// CreditWithTx applies a purchase credit inside the store's fulfillment
// transaction. When the store runs on the in-memory repository (dev without
// a DB) there is no SQL transaction; fall back to the standalone credit,
// which is still idempotency-keyed.
func (a *StoreWalletAdapter) CreditWithTx(ctx context.Context, tx *sql.Tx, userID string, amountPoints int64, idempotencyKey, reason string) error {
	request := wallet.MutationRequest{
		UserID:         userID,
		AmountPoints:   amountPoints,
		IdempotencyKey: idempotencyKey,
		Reason:         reason,
	}
	if tx == nil {
		_, err := a.svc.Credit(ctx, request)
		return err
	}
	_, err := a.svc.CreditWithTx(ctx, tx, request)
	return err
}

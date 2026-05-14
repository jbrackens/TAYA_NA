package main

import (
	"fmt"

	"phoenix-revival/gateway/internal/prediction"
	"phoenix-revival/gateway/internal/wallet"
)

// Harness wires the in-process objects the demo phases need to drive trades
// through the same code paths a live HTTP request would hit. The seed
// command runs as a one-shot process — there is no HTTP server, no
// middleware, just the Service + Repository + WalletAdapter triad.
//
// We deliberately reuse prediction.NewService and wallet.NewServiceWithDB
// (the production constructors) so seed-time behavior matches runtime
// behavior. Anything that mutates ledger state goes through Service.PlaceOrder
// → predictionWalletShim → wallet.Service, keeping prediction_collateral_ledger
// and wallet_ledger consistent with what /qa would see on the running app.
type Harness struct {
	Service *prediction.Service
	Repo    *prediction.SQLRepository
	Wallet  *wallet.Service
}

// newHarness opens a wallet service against the same DB the seed already has
// a connection to, instantiates a SQLRepository on that DB, and wires a
// prediction.Service with the WalletAdapter shim. The seed's *sql.DB is
// passed in directly so wallet.Service shares the connection pool — both
// the prediction repo and the wallet share one process-wide pool, matching
// how the gateway runs in production.
func newHarness(driver, dsn string) (*Harness, error) {
	walletSvc, err := wallet.NewServiceWithDB(driver, dsn)
	if err != nil {
		return nil, fmt.Errorf("open wallet service: %w", err)
	}
	repo := prediction.NewSQLRepository(walletSvc.DB())
	svc := prediction.NewService(repo, &predictionWalletShim{w: walletSvc})
	return &Harness{Service: svc, Repo: repo, Wallet: walletSvc}, nil
}

// predictionWalletShim adapts wallet.Service to prediction.WalletAdapter.
// Same shape as internal/http/prediction_wallet_adapter.go but
// re-implemented here because that one is unexported. Five-line
// adapter, not worth refactoring the gateway HTTP package to export
// it just for the seed binary.
type predictionWalletShim struct {
	w *wallet.Service
}

func (s *predictionWalletShim) Debit(userID string, amountCents int64, idempotencyKey, reason string) error {
	_, err := s.w.Debit(wallet.MutationRequest{
		UserID:         userID,
		AmountCents:    amountCents,
		IdempotencyKey: idempotencyKey,
		Reason:         reason,
	})
	return err
}

func (s *predictionWalletShim) Credit(userID string, amountCents int64, idempotencyKey, reason string) error {
	_, err := s.w.Credit(wallet.MutationRequest{
		UserID:         userID,
		AmountCents:    amountCents,
		IdempotencyKey: idempotencyKey,
		Reason:         reason,
	})
	return err
}

func (s *predictionWalletShim) Balance(userID string) int64 {
	return s.w.Balance(userID)
}

package main

import (
	"fmt"

	gatewayhttp "phoenix-revival/gateway/internal/http"
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
// behavior. The wallet adapter is the same one internal/http wires up,
// so the seed exercises the full ExchangeWalletAdapter surface — Holds,
// Captures, Releases, the lot. Anything that goes wrong in the order
// path during a real HTTP request will surface here too.
type Harness struct {
	Service *prediction.Service
	Repo    *prediction.SQLRepository
	Wallet  *wallet.Service
}

// newHarness opens a wallet service against the same DB the seed already has
// a connection to, instantiates a SQLRepository on that DB, and wires a
// prediction.Service with the WalletAdapter from internal/http. The seed's
// *sql.DB is passed in directly so wallet.Service shares the connection pool
// — both the prediction repo and the wallet share one process-wide pool,
// matching how the gateway runs in production.
func newHarness(driver, dsn string) (*Harness, error) {
	walletSvc, err := wallet.NewServiceWithDB(driver, dsn)
	if err != nil {
		return nil, fmt.Errorf("open wallet service: %w", err)
	}
	repo := prediction.NewSQLRepository(walletSvc.DB())
	adapter := gatewayhttp.NewPredictionWalletAdapter(walletSvc)
	svc := prediction.NewService(repo, adapter)
	return &Harness{Service: svc, Repo: repo, Wallet: walletSvc}, nil
}

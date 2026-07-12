package http

import (
	"log/slog"
	stdhttp "net/http"
	"os"

	"taptrade/gateway/internal/store"
	"taptrade/gateway/internal/wallet"
)

// storeRoutesEnabled mirrors launch_boundary.go's flag-helper shape for the
// point store's own flag. The store tree is fully separate from the legacy
// money-route trees, which stay retired and boot-blocked exactly as before.
func storeRoutesEnabled() bool {
	return store.EnabledFromEnv(os.Getenv)
}

// registerPointStoreRoutes mounts /api/v1/store/* ONLY when STORE_ENABLED is
// true (STORE_AND_PAYMENTS.md §7). Config binds once here; nothing re-reads
// the environment per request.
func registerPointStoreRoutes(mux *stdhttp.ServeMux, walletService *wallet.Service) {
	cfg, err := store.LoadConfigFromEnv(os.Getenv)
	if err != nil {
		// validateGatewayRuntimeConfig refuses to boot the real binary on
		// this error; guard again here for test harnesses that register
		// routes directly.
		slog.Error("store: invalid configuration; point store routes not registered", "error", err)
		return
	}
	if !cfg.Enabled {
		slog.Info("point store disabled", "env", "STORE_ENABLED")
		return
	}

	var repo store.Repository
	if db := walletService.DB(); db != nil {
		repo = store.NewSQLRepository(db)
	} else {
		repo = store.NewMemoryRepository(store.DefaultCatalogue()...)
		slog.Warn("store: no DB wired; using in-memory purchase repository (dev only)")
	}

	provider := store.NewDemoProvider(store.DefaultDelayedCompletion, nil)
	svc := store.NewService(cfg, repo, NewStoreWalletAdapter(walletService), provider)
	store.RegisterRoutes(mux, svc)
	slog.Info("store: point store routes registered", "provider", cfg.Provider)
}

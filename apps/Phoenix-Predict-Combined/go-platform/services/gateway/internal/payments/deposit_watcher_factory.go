package payments

import (
	"context"
	"database/sql"
	"log/slog"
	"os"
	"strconv"
	"strings"
	"time"
)

// WatcherDeps are the runtime dependencies the deposit watcher needs that are
// not configuration: the DB (crypto_deposits + deposit addresses) and the ledger.
type WatcherDeps struct {
	DB     *sql.DB
	Ledger LedgerCrediter
}

// NewDepositWatcherFromEnv builds the deposit watcher from CRYPTO_* env. It
// returns enabled=false (nil watcher, nil error) when the rail is not configured
// — the watcher stays dark until ops supply RPC + asset contract + the
// deposit-address source, mirroring the rail's fail-closed posture
// (CryptoRail.Configured). Before running the returned watcher, callers MUST
// verify token decimals on-chain with VerifyTokenDecimals.
func NewDepositWatcherFromEnv(deps WatcherDeps) (*DepositWatcher, bool, error) {
	rpc := strings.TrimSpace(os.Getenv("CRYPTO_RPC_URL"))
	contract := strings.TrimSpace(os.Getenv("CRYPTO_ASSET_CONTRACT"))
	addrSource := strings.TrimSpace(os.Getenv("CRYPTO_DEPOSIT_ADDRESS_SOURCE"))
	if rpc == "" || contract == "" || addrSource == "" {
		return nil, false, nil // fail-closed: not configured
	}
	cfg := WatcherConfig{
		ChainID:       envInt64("CRYPTO_CHAIN_ID", 56),
		Network:       cryptoEnvOr("CRYPTO_NETWORK", "bsc"),
		Asset:         cryptoEnvOr("CRYPTO_ASSET", "USDT"),
		TokenContract: contract,
		TokenDecimals: int(envInt64("CRYPTO_ASSET_DECIMALS", 18)),
		Confirmations: int(envInt64("CRYPTO_CONFIRMATIONS", 12)),
		MaxBlockRange: envInt64("CRYPTO_MAX_BLOCK_RANGE", 0),
	}
	w := NewDepositWatcher(cfg, NewEVMClient(rpc), NewCryptoDepositStore(deps.DB), deps.Ledger)
	return w, true, nil
}

func envInt64(key string, def int64) int64 {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return def
	}
	n, err := strconv.ParseInt(v, 10, 64)
	if err != nil {
		return def
	}
	return n
}

// StartDepositWatcher builds the watcher from env and, ONLY if the rail is
// configured, verifies the token's on-chain decimals and starts a background
// loop driving RunCycle on a ticker. When unconfigured it logs and returns
// without starting a goroutine — fail-closed. Returns whether it started.
func StartDepositWatcher(ctx context.Context, deps WatcherDeps) bool {
	w, enabled, err := NewDepositWatcherFromEnv(deps)
	if err != nil {
		slog.Error("deposit watcher: config error", "err", err)
		return false
	}
	if !enabled {
		slog.Info("deposit watcher: disabled (rail not configured)")
		return false
	}
	// Verify on-chain decimals before crediting anything (fail-closed).
	client := NewEVMClient(strings.TrimSpace(os.Getenv("CRYPTO_RPC_URL")))
	vctx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()
	if err := VerifyTokenDecimals(vctx, client, w.cfg.TokenContract, w.cfg.TokenDecimals); err != nil {
		slog.Error("deposit watcher: on-chain decimals check failed, NOT starting", "err", err)
		return false
	}
	startBlock := envInt64("CRYPTO_START_BLOCK", 0)
	interval := time.Duration(envInt64("CRYPTO_POLL_INTERVAL_SECONDS", 15)) * time.Second
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		slog.Info("deposit watcher: started", "network", w.cfg.Network, "asset", w.cfg.Asset, "interval", interval.String())
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				if err := w.RunCycle(ctx, startBlock); err != nil {
					slog.Error("deposit watcher: cycle error", "err", err)
				}
			}
		}
	}()
	return true
}

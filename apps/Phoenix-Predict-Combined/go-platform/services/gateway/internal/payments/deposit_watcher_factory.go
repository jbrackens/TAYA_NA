package payments

import (
	"database/sql"
	"os"
	"strconv"
	"strings"
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

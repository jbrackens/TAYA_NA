package payments

import "testing"

func TestNewDepositWatcherFromEnv_FailClosedWhenUnconfigured(t *testing.T) {
	t.Setenv("CRYPTO_RPC_URL", "")
	t.Setenv("CRYPTO_ASSET_CONTRACT", "")
	t.Setenv("CRYPTO_DEPOSIT_ADDRESS_SOURCE", "")

	w, enabled, err := NewDepositWatcherFromEnv(WatcherDeps{})
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if enabled || w != nil {
		t.Fatalf("watcher must be disabled when unconfigured (enabled=%v, w=%v)", enabled, w)
	}
}

func TestNewDepositWatcherFromEnv_PartialConfigStaysClosed(t *testing.T) {
	// RPC + contract set but no deposit-address source: still fail closed.
	t.Setenv("CRYPTO_RPC_URL", "https://rpc.example")
	t.Setenv("CRYPTO_ASSET_CONTRACT", "0xUSDT")
	t.Setenv("CRYPTO_DEPOSIT_ADDRESS_SOURCE", "")

	_, enabled, err := NewDepositWatcherFromEnv(WatcherDeps{})
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if enabled {
		t.Fatal("watcher must stay disabled without a deposit-address source")
	}
}

func TestNewDepositWatcherFromEnv_ConfiguredReadsEnv(t *testing.T) {
	t.Setenv("CRYPTO_RPC_URL", "https://rpc.example")
	t.Setenv("CRYPTO_ASSET_CONTRACT", "0x55d398326f99059fF775485246999027B3197955")
	t.Setenv("CRYPTO_DEPOSIT_ADDRESS_SOURCE", "xpub-test")
	t.Setenv("CRYPTO_NETWORK", "bsc")
	t.Setenv("CRYPTO_ASSET", "USDT")
	t.Setenv("CRYPTO_CHAIN_ID", "56")
	t.Setenv("CRYPTO_CONFIRMATIONS", "9")
	t.Setenv("CRYPTO_ASSET_DECIMALS", "18")

	w, enabled, err := NewDepositWatcherFromEnv(WatcherDeps{Ledger: &fakeCrediter{}})
	if err != nil || !enabled || w == nil {
		t.Fatalf("want enabled watcher, got enabled=%v err=%v", enabled, err)
	}
	if w.cfg.ChainID != 56 || w.cfg.Network != "bsc" || w.cfg.Asset != "USDT" ||
		w.cfg.TokenContract != "0x55d398326f99059fF775485246999027B3197955" ||
		w.cfg.TokenDecimals != 18 || w.cfg.Confirmations != 9 {
		t.Fatalf("cfg wrong: %+v", w.cfg)
	}
}

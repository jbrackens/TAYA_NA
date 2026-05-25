package payments

import (
	"context"
	"fmt"
	"os"
	"testing"
	"time"

	"phoenix-revival/gateway/internal/wallet"
)

// End-to-end against the real wallet ledger (not a fake crediter): a finalized
// transfer must raise the user's actual cents balance by exactly the credited
// amount, and a re-run must not change it.
func TestDepositWatcher_CreditsRealWalletLedger(t *testing.T) {
	db := cryptoTestDB(t)
	defer db.Close()
	store := NewCryptoDepositStore(db)

	dsn := firstNonEmpty(
		os.Getenv("CASHIER_TEST_DB_DSN"),
		os.Getenv("WALLET_DB_DSN"),
		os.Getenv("GATEWAY_DB_DSN"),
	)
	walletSvc, err := wallet.NewServiceWithDB("postgres", dsn)
	if err != nil {
		t.Skipf("wallet db unavailable, skipping: %v", err)
	}
	ctx := context.Background()

	network := uniqueNetwork()
	user := fmt.Sprintf("u-e2e-%d", time.Now().UnixNano())
	addr := "0x000000000000000000000000000000000000abcd"
	tx := fmt.Sprintf("0x%064x", time.Now().UnixNano())
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM crypto_deposits WHERE network=$1`, network)
		_, _ = db.Exec(`DELETE FROM crypto_deposit_addresses WHERE network=$1`, network)
	})
	seedDepositAddress(t, store, network, user, addr)

	cfg := watcherCfg(network)
	// head already past finality (1011 - 1000 + 1 == 12).
	chain := &fakeChain{head: 1011, logs: []Log{transferLogTo(addr, tx, "0xblk1", 1000)}}
	w := NewDepositWatcher(cfg, chain, store, walletSvc)

	if start := walletSvc.Balance(user); start != 0 {
		t.Fatalf("fresh user balance=%d, want 0", start)
	}
	if _, err := w.Sync(ctx, 1); err != nil {
		t.Fatalf("Sync: %v", err)
	}
	if bal := walletSvc.Balance(user); bal != 100 {
		t.Fatalf("after credit balance=%d, want 100", bal)
	}

	// Re-run: the real ledger must not double-credit.
	chain.head = 1020
	if _, err := w.Sync(ctx, 1); err != nil {
		t.Fatalf("Sync (re-run): %v", err)
	}
	if bal := walletSvc.Balance(user); bal != 100 {
		t.Fatalf("double credit on real ledger: balance=%d, want 100", bal)
	}
}

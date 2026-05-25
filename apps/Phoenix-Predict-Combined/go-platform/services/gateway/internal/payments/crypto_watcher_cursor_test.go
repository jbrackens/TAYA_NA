package payments

import (
	"context"
	"testing"
)

func TestCryptoDepositStore_Cursor(t *testing.T) {
	db := cryptoTestDB(t)
	defer db.Close()
	store := NewCryptoDepositStore(db)
	ctx := context.Background()

	network := uniqueNetwork()
	t.Cleanup(func() { _, _ = db.Exec(`DELETE FROM crypto_watcher_cursor WHERE network=$1`, network) })

	if _, found, err := store.GetCursor(ctx, network, "USDT"); err != nil || found {
		t.Fatalf("fresh cursor: found=%v err=%v, want not found", found, err)
	}
	if err := store.SetCursor(ctx, network, "USDT", 1234); err != nil {
		t.Fatalf("SetCursor: %v", err)
	}
	b, found, err := store.GetCursor(ctx, network, "USDT")
	if err != nil || !found || b != 1234 {
		t.Fatalf("GetCursor = (%d, %v, %v), want (1234, true, nil)", b, found, err)
	}
	// upsert overwrites
	if err := store.SetCursor(ctx, network, "USDT", 5678); err != nil {
		t.Fatalf("SetCursor (upsert): %v", err)
	}
	if b, _, _ := store.GetCursor(ctx, network, "USDT"); b != 5678 {
		t.Fatalf("after upsert = %d, want 5678", b)
	}
}

func TestDepositWatcher_RunCycleResumesFromCursor(t *testing.T) {
	db := cryptoTestDB(t)
	defer db.Close()
	store := NewCryptoDepositStore(db)
	ctx := context.Background()

	network := uniqueNetwork()
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM crypto_watcher_cursor WHERE network=$1`, network)
		_, _ = db.Exec(`DELETE FROM crypto_deposits WHERE network=$1`, network)
	})

	cfg := watcherCfg(network)
	chain := &fakeChain{head: 500}
	w := NewDepositWatcher(cfg, chain, store, &fakeCrediter{})

	// No cursor yet: uses the default start (100), scans to head 500, persists 501.
	if err := w.RunCycle(ctx, 100); err != nil {
		t.Fatalf("RunCycle 1: %v", err)
	}
	cur, found, err := store.GetCursor(ctx, network, "USDT")
	if err != nil || !found || cur != 501 {
		t.Fatalf("cursor after cycle 1 = (%d, %v, %v), want (501, true, nil)", cur, found, err)
	}

	// Next cycle resumes from the persisted cursor and advances to the new head+1.
	chain.head = 600
	if err := w.RunCycle(ctx, 100); err != nil {
		t.Fatalf("RunCycle 2: %v", err)
	}
	if cur, _, _ := store.GetCursor(ctx, network, "USDT"); cur != 601 {
		t.Fatalf("cursor after cycle 2 = %d, want 601", cur)
	}
}

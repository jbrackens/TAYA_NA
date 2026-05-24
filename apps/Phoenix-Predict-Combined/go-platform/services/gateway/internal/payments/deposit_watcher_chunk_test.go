package payments

import (
	"context"
	"reflect"
	"testing"
)

func TestDepositWatcher_ChunksWideLogRange(t *testing.T) {
	db := cryptoTestDB(t)
	defer db.Close()
	store := NewCryptoDepositStore(db)
	ctx := context.Background()

	network := uniqueNetwork()
	user := "u-chunk-1"
	addr := "0x000000000000000000000000000000000000abcd"
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM crypto_deposit_addresses WHERE network=$1`, network)
		_, _ = db.Exec(`DELETE FROM crypto_deposits WHERE network=$1`, network)
	})
	seedDepositAddress(t, store, network, user, addr) // owners > 0 so GetLogs is called

	cfg := watcherCfg(network)
	cfg.MaxBlockRange = 2000
	chain := &fakeChain{head: 5000}
	w := NewDepositWatcher(cfg, chain, store, &fakeCrediter{})

	if _, err := w.Sync(ctx, 1); err != nil {
		t.Fatalf("Sync: %v", err)
	}
	want := [][2]int64{{1, 2000}, {2001, 4000}, {4001, 5000}}
	if !reflect.DeepEqual(chain.ranges, want) {
		t.Fatalf("getLogs windows = %v, want %v", chain.ranges, want)
	}
}

func TestDepositWatcher_SingleChunkForSmallRange(t *testing.T) {
	db := cryptoTestDB(t)
	defer db.Close()
	store := NewCryptoDepositStore(db)
	ctx := context.Background()

	network := uniqueNetwork()
	user := "u-chunk-2"
	addr := "0x000000000000000000000000000000000000ef01"
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM crypto_deposit_addresses WHERE network=$1`, network)
		_, _ = db.Exec(`DELETE FROM crypto_deposits WHERE network=$1`, network)
	})
	seedDepositAddress(t, store, network, user, addr)

	cfg := watcherCfg(network) // MaxBlockRange 0 -> default 2000
	chain := &fakeChain{head: 500}
	w := NewDepositWatcher(cfg, chain, store, &fakeCrediter{})
	if _, err := w.Sync(ctx, 1); err != nil {
		t.Fatalf("Sync: %v", err)
	}
	want := [][2]int64{{1, 500}}
	if !reflect.DeepEqual(chain.ranges, want) {
		t.Fatalf("getLogs windows = %v, want %v", chain.ranges, want)
	}
}

package payments

import (
	"context"
	"fmt"
	"testing"
	"time"

	"phoenix-revival/gateway/internal/wallet"
)

type fakeChain struct {
	head   int64
	logs   []Log
	ranges [][2]int64 // (from,to) of each GetLogs call, for chunk assertions
}

func (f *fakeChain) BlockNumber(context.Context) (int64, error) { return f.head, nil }
func (f *fakeChain) GetLogs(_ context.Context, filt LogFilter) ([]Log, error) {
	f.ranges = append(f.ranges, [2]int64{filt.FromBlock, filt.ToBlock})
	return f.logs, nil
}

// fakeCrediter mimics wallet.Service.Credit: idempotent on key (a replay returns
// the original entry without re-recording), so len(calls) is the count of
// distinct credits — the exactly-once probe.
type fakeCrediter struct {
	calls []wallet.MutationRequest
	byKey map[string]wallet.LedgerEntry
	seq   int
}

func (f *fakeCrediter) Credit(req wallet.MutationRequest) (wallet.LedgerEntry, error) {
	if f.byKey == nil {
		f.byKey = map[string]wallet.LedgerEntry{}
	}
	if e, ok := f.byKey[req.IdempotencyKey]; ok {
		return e, nil
	}
	f.seq++
	f.calls = append(f.calls, req)
	e := wallet.LedgerEntry{EntryID: fmt.Sprintf("entry-%d", f.seq), UserID: req.UserID, AmountCents: req.AmountCents}
	f.byKey[req.IdempotencyKey] = e
	return e, nil
}

func seedDepositAddress(t *testing.T, store *CryptoDepositStore, network, user, addr string) {
	t.Helper()
	if _, err := store.db.Exec(
		`INSERT INTO crypto_deposit_addresses (user_id, network, asset, address) VALUES ($1,$2,'USDT',$3)`,
		user, network, addr); err != nil {
		t.Fatalf("seed deposit address: %v", err)
	}
}

func transferLogTo(addr, tx, blockHash string, blockNumber int64) Log {
	return Log{
		Address: "0x55d398326f99059fF775485246999027B3197955",
		Topics: []string{
			erc20TransferTopic,
			"0x0000000000000000000000001111111111111111111111111111111111111111",
			addressToTopic(addr),
		},
		Data:        "0x0de0b6b3a7640000", // 1e18 -> 100 cents at 18 decimals
		BlockNumber: blockNumber,
		BlockHash:   blockHash,
		TxHash:      tx,
		LogIndex:    0,
	}
}

// uniqueNetwork isolates each watcher test in the shared dev DB: the watcher
// credits ALL pending deposits for its (network, asset) by design, so tests must
// not share a network or they'd credit each other's rows.
func uniqueNetwork() string { return fmt.Sprintf("bsc-test-%d", time.Now().UnixNano()) }

func watcherCfg(network string) WatcherConfig {
	return WatcherConfig{
		ChainID: 56, Network: network, Asset: "USDT",
		TokenContract: "0x55d398326f99059fF775485246999027B3197955",
		TokenDecimals: 18, Confirmations: 12,
	}
}

func TestDepositWatcher_CreditsOnceAfterFinality(t *testing.T) {
	db := cryptoTestDB(t)
	defer db.Close()
	store := NewCryptoDepositStore(db)
	ctx := context.Background()

	network := uniqueNetwork()
	user := "u-watch-1"
	addr := "0x000000000000000000000000000000000000abcd"
	tx := fmt.Sprintf("0x%064x", time.Now().UnixNano())
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM crypto_deposits WHERE network=$1`, network)
		_, _ = db.Exec(`DELETE FROM crypto_deposit_addresses WHERE network=$1`, network)
	})
	seedDepositAddress(t, store, network, user, addr)

	cfg := watcherCfg(network)
	chain := &fakeChain{head: 1000, logs: []Log{transferLogTo(addr, tx, "0xblk1", 1000)}}
	cr := &fakeCrediter{}
	w := NewDepositWatcher(cfg, chain, store, cr)
	id := depositID(cfg.ChainID, tx, 0, "0xblk1")

	// 1 confirmation (< 12): recorded pending, not credited.
	if _, err := w.Sync(ctx, 1); err != nil {
		t.Fatalf("Sync (pre-finality): %v", err)
	}
	if len(cr.calls) != 0 {
		t.Fatalf("credited before finality: %d calls", len(cr.calls))
	}
	got, err := store.GetByID(ctx, id)
	if err != nil {
		t.Fatalf("GetByID: %v", err)
	}
	if got.Status != DepositPending || got.AmountCents != 100 {
		t.Fatalf("recorded wrong: status=%s cents=%d", got.Status, got.AmountCents)
	}

	// Reach finality (1011 - 1000 + 1 == 12).
	chain.head = 1011
	if _, err := w.Sync(ctx, 1); err != nil {
		t.Fatalf("Sync (finality): %v", err)
	}
	if len(cr.calls) != 1 {
		t.Fatalf("want exactly 1 credit, got %d", len(cr.calls))
	}
	c0 := cr.calls[0]
	if c0.UserID != user || c0.AmountCents != 100 || c0.IdempotencyKey != creditIdempotencyKey(56, tx, 0) {
		t.Fatalf("credit payload wrong: %+v", c0)
	}
	got, _ = store.GetByID(ctx, id)
	if got.Status != DepositCredited || got.LedgerEntryID != "entry-1" {
		t.Fatalf("after credit: status=%s entry=%q", got.Status, got.LedgerEntryID)
	}

	// Re-run past finality: no double credit.
	chain.head = 1020
	if _, err := w.Sync(ctx, 1); err != nil {
		t.Fatalf("Sync (re-run): %v", err)
	}
	if len(cr.calls) != 1 {
		t.Fatalf("double credit: %d calls", len(cr.calls))
	}
}

func TestDepositWatcher_ReorgRemovesPending(t *testing.T) {
	db := cryptoTestDB(t)
	defer db.Close()
	store := NewCryptoDepositStore(db)
	ctx := context.Background()

	network := uniqueNetwork()
	user := "u-watch-2"
	addr := "0x000000000000000000000000000000000000ef01"
	tx := fmt.Sprintf("0x%064x", time.Now().UnixNano())
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM crypto_deposits WHERE network=$1`, network)
		_, _ = db.Exec(`DELETE FROM crypto_deposit_addresses WHERE network=$1`, network)
	})
	seedDepositAddress(t, store, network, user, addr)

	cfg := watcherCfg(network)
	pending := transferLogTo(addr, tx, "0xblk1", 1000)
	chain := &fakeChain{head: 1000, logs: []Log{pending}}
	cr := &fakeCrediter{}
	w := NewDepositWatcher(cfg, chain, store, cr)
	id := depositID(cfg.ChainID, tx, 0, "0xblk1")

	if _, err := w.Sync(ctx, 1); err != nil {
		t.Fatalf("Sync (record): %v", err)
	}
	if got, _ := store.GetByID(ctx, id); got.Status != DepositPending {
		t.Fatalf("want pending after record")
	}

	// The block carrying the transfer is reorged out.
	removed := pending
	removed.Removed = true
	chain.logs = []Log{removed}
	chain.head = 1001
	if _, err := w.Sync(ctx, 1); err != nil {
		t.Fatalf("Sync (reorg): %v", err)
	}
	got, err := store.GetByID(ctx, id)
	if err != nil {
		t.Fatalf("GetByID: %v", err)
	}
	if got.Status != DepositReorged {
		t.Fatalf("status=%s want reorged", got.Status)
	}

	// Even past finality, a reorged deposit is never credited.
	chain.logs = nil
	chain.head = 2000
	if _, err := w.Sync(ctx, 1); err != nil {
		t.Fatalf("Sync (post-reorg): %v", err)
	}
	if len(cr.calls) != 0 {
		t.Fatalf("reorged deposit was credited: %d calls", len(cr.calls))
	}
}

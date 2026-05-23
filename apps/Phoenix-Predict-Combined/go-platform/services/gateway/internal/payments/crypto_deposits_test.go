package payments

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"math/big"
	"os"
	"testing"
	"time"

	_ "github.com/lib/pq"
)

// cryptoTestDB returns a Postgres handle for the crypto_deposits integration
// tests, or skips when no DB is reachable (so CI without Postgres stays green).
// The money invariant under test is a Postgres partial-unique-index constraint,
// so it cannot be exercised in memory mode — it must hit a real database.
func cryptoTestDB(t *testing.T) *sql.DB {
	t.Helper()
	dsn := firstNonEmpty(
		os.Getenv("CASHIER_TEST_DB_DSN"),
		os.Getenv("WALLET_DB_DSN"),
		os.Getenv("GATEWAY_DB_DSN"),
	)
	if dsn == "" {
		t.Skip("no DB DSN set (CASHIER_TEST_DB_DSN / WALLET_DB_DSN / GATEWAY_DB_DSN); skipping crypto_deposits integration test")
	}
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Skipf("sql.Open: %v", err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		_ = db.Close()
		t.Skipf("DB not reachable, skipping: %v", err)
	}
	if err := EnsureCryptoSchema(db); err != nil {
		t.Fatalf("EnsureCryptoSchema: %v", err)
	}
	return db
}

func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if v != "" {
			return v
		}
	}
	return ""
}

func TestCryptoDepositStore_ExactlyOnceCredit(t *testing.T) {
	db := cryptoTestDB(t)
	defer db.Close()
	store := NewCryptoDepositStore(db)
	ctx := context.Background()

	tx := fmt.Sprintf("0x%x", time.Now().UnixNano())
	t.Cleanup(func() { _, _ = db.Exec(`DELETE FROM crypto_deposits WHERE tx_hash = $1`, tx) })

	// 1.234999999999999999 USDT -> 123 cents + sub-cent dust (decimals landmine).
	amt, _ := new(big.Int).SetString("1234999999999999999", 10)
	cents, dust, err := BSCUSDTToCents(amt)
	if err != nil {
		t.Fatalf("BSCUSDTToCents: %v", err)
	}
	if cents != 123 {
		t.Fatalf("cents = %d, want 123", cents)
	}

	dep := CryptoDeposit{
		ID: tx + ":0", UserID: "u-cashier-test", Network: "bsc", Asset: "USDT", ChainID: 56,
		TxHash: tx, LogIndex: 0, BlockHash: "0xblockA", BlockNumber: 1000,
		FromAddress: "0xfrom", ToAddress: "0xto",
		AmountBase: amt, AmountCents: cents, DustBase: dust,
	}

	// First detection inserts.
	ins, err := store.RecordDeposit(ctx, dep)
	if err != nil || !ins {
		t.Fatalf("RecordDeposit = (%v, %v), want (true, nil)", ins, err)
	}
	// Replay of the exact same log is deduped (idempotent detection).
	ins, err = store.RecordDeposit(ctx, dep)
	if err != nil || ins {
		t.Fatalf("replay RecordDeposit = (%v, %v), want (false, nil)", ins, err)
	}

	// Credit once.
	if err := store.MarkCredited(ctx, dep.ID, "ledger-entry-1"); err != nil {
		t.Fatalf("MarkCredited: %v", err)
	}

	// Reorg duplicate: same (chain, tx, log) re-mined under a different block is a
	// distinct row, but it must NOT be creditable a second time.
	dup := dep
	dup.ID = tx + ":0:reorg"
	dup.BlockHash = "0xblockB"
	ins, err = store.RecordDeposit(ctx, dup)
	if err != nil || !ins {
		t.Fatalf("reorg-dup RecordDeposit = (%v, %v), want (true, nil)", ins, err)
	}
	if err := store.MarkCredited(ctx, dup.ID, "ledger-entry-2"); !errors.Is(err, ErrDepositAlreadyCredited) {
		t.Fatalf("second credit err = %v, want ErrDepositAlreadyCredited", err)
	}

	// Stored amounts: cents truncated, dust retained, status credited.
	got, err := store.GetByID(ctx, dep.ID)
	if err != nil {
		t.Fatalf("GetByID: %v", err)
	}
	if got.AmountCents != 123 {
		t.Errorf("stored cents = %d, want 123", got.AmountCents)
	}
	if got.DustBase.String() != "4999999999999999" {
		t.Errorf("stored dust = %s, want 4999999999999999", got.DustBase.String())
	}
	if got.Status != DepositCredited {
		t.Errorf("status = %s, want credited", got.Status)
	}
}

func TestCryptoDepositStore_ReorgBeforeCredit(t *testing.T) {
	db := cryptoTestDB(t)
	defer db.Close()
	store := NewCryptoDepositStore(db)
	ctx := context.Background()

	tx := fmt.Sprintf("0x%x", time.Now().UnixNano())
	t.Cleanup(func() { _, _ = db.Exec(`DELETE FROM crypto_deposits WHERE tx_hash = $1`, tx) })

	dep := CryptoDeposit{
		ID: tx + ":0", UserID: "u-cashier-test", Network: "bsc", Asset: "USDT", ChainID: 56,
		TxHash: tx, LogIndex: 0, BlockHash: "0xb", BlockNumber: 1,
		FromAddress: "0xf", ToAddress: "0xt",
		AmountBase: big.NewInt(1_000_000_000_000_000_000), AmountCents: 100, DustBase: big.NewInt(0),
	}
	if _, err := store.RecordDeposit(ctx, dep); err != nil {
		t.Fatalf("RecordDeposit: %v", err)
	}
	if err := store.MarkReorged(ctx, dep.ID); err != nil {
		t.Fatalf("MarkReorged: %v", err)
	}
	got, err := store.GetByID(ctx, dep.ID)
	if err != nil {
		t.Fatalf("GetByID: %v", err)
	}
	if got.Status != DepositReorged {
		t.Errorf("status = %s, want reorged", got.Status)
	}
	// A reorged (never-credited) row is not pending, so it cannot be credited.
	if err := store.MarkCredited(ctx, dep.ID, "x"); !errors.Is(err, ErrDepositNotPending) {
		t.Fatalf("credit after reorg err = %v, want ErrDepositNotPending", err)
	}
}

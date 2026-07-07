package prediction

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"os"
	"sync"
	"testing"
	"time"
)

// txWalletStub satisfies WalletAdapter + TxWalletAdapter for the COR-01 race
// test. BeginTx hands out real transactions from the test DB, so the
// persisters' status-guarded UPDATE, settlement INSERT, and lifecycle INSERTs
// commit (or roll back) exactly as in production. Credit/debit are no-ops:
// the assertions target same-transaction prediction writes (settlement row,
// market status, lifecycle events), which prove single-commit atomicity on
// their own — if those can't double-commit, neither can wallet credits that
// share the transaction.
type txWalletStub struct{ db *sql.DB }

func (w *txWalletStub) Debit(_ context.Context, userID string, amountPoints int64, idempotencyKey, reason string) error {
	return nil
}
func (w *txWalletStub) Credit(_ context.Context, userID string, amountPoints int64, idempotencyKey, reason string) error {
	return nil
}
func (w *txWalletStub) Balance(_ context.Context, userID string) int64 { return 0 }
func (w *txWalletStub) BeginTx(ctx context.Context) (*sql.Tx, error) {
	return w.db.BeginTx(ctx, nil)
}
func (w *txWalletStub) DebitWithTx(ctx context.Context, tx *sql.Tx, userID string, amountPoints int64, idempotencyKey, reason string) error {
	return nil
}
func (w *txWalletStub) CreditWithTx(ctx context.Context, tx *sql.Tx, userID string, amountPoints int64, idempotencyKey, reason string) error {
	return nil
}

// TestTransitionMarketStatusGuard is the unit-level red/green proof for the
// COR-01 fix: the guarded UPDATE must refuse to apply when the row's status
// is not the one the caller validated.
//
// Run with: GATEWAY_DB_DSN=... go test ./internal/prediction/ -run TestTransitionMarketStatusGuard -v
func TestTransitionMarketStatusGuard(t *testing.T) {
	db := raceTestDB(t)
	repo := NewSQLRepository(db)
	ctx := context.Background()

	marketID := seedClosedMarketWithPositions(t, db, "guard")
	m, err := repo.GetMarket(ctx, marketID)
	if err != nil {
		t.Fatalf("get market: %v", err)
	}

	// Wrong expected-previous status → ErrStaleMarketStatus, row unchanged.
	m.Status = MarketStatusSettled
	err = repo.transitionMarketStatusWithExec(ctx, db, m, MarketStatusOpen)
	if !errors.Is(err, ErrStaleMarketStatus) {
		t.Fatalf("expected ErrStaleMarketStatus for wrong prev status, got %v", err)
	}
	var status string
	if err := db.QueryRow(`SELECT status FROM prediction_markets WHERE id=$1`, marketID).Scan(&status); err != nil {
		t.Fatalf("read status: %v", err)
	}
	if status != string(MarketStatusClosed) {
		t.Fatalf("guarded update must not apply on mismatch; status=%s", status)
	}

	// Correct expected-previous status → applies.
	if err := repo.transitionMarketStatusWithExec(ctx, db, m, MarketStatusClosed); err != nil {
		t.Fatalf("guarded update with correct prev status failed: %v", err)
	}
	if err := db.QueryRow(`SELECT status FROM prediction_markets WHERE id=$1`, marketID).Scan(&status); err != nil {
		t.Fatalf("re-read status: %v", err)
	}
	if status != string(MarketStatusSettled) {
		t.Fatalf("guarded update did not apply; status=%s", status)
	}
}

// TestConcurrentSettleAndVoidCannotBothCommit reproduces audit finding COR-01:
// before the status-guarded persisters, a concurrent ResolveMarket + VoidMarket
// on the same closed market could BOTH commit — winners paid and every stake
// refunded. With the guard, exactly one flow may commit per market.
//
// Run with:
//
//	GATEWAY_DB_DSN="postgres://predict:localdev@localhost:5439/predict?sslmode=disable" \
//	  go test ./internal/prediction/ -run TestConcurrentSettleAndVoid -race -count=20 -v
func TestConcurrentSettleAndVoidCannotBothCommit(t *testing.T) {
	db := raceTestDB(t)
	repo := NewSQLRepository(db)
	engine := NewSettlementEngine(repo, &txWalletStub{db: db})
	ctx := context.Background()

	const rounds = 10
	for i := 0; i < rounds; i++ {
		marketID := seedClosedMarketWithPositions(t, db, fmt.Sprintf("r%d", i))

		start := make(chan struct{})
		var wg sync.WaitGroup
		var settleErr, voidErr error
		wg.Add(2)
		go func() {
			defer wg.Done()
			<-start
			_, _, settleErr = engine.ResolveMarket(ctx, ResolveMarketRequest{
				Result:            MarketResultYes,
				AttestationSource: "race-test",
			}, marketID, nil)
		}()
		go func() {
			defer wg.Done()
			<-start
			_, voidErr = engine.VoidMarket(ctx, marketID, "race-test void", nil)
		}()
		close(start)
		wg.Wait()

		var settlements int
		if err := db.QueryRow(`SELECT COUNT(*) FROM prediction_settlements WHERE market_id=$1`, marketID).Scan(&settlements); err != nil {
			t.Fatalf("count settlements: %v", err)
		}
		var status string
		if err := db.QueryRow(`SELECT status FROM prediction_markets WHERE id=$1`, marketID).Scan(&status); err != nil {
			t.Fatalf("read market status: %v", err)
		}
		var settledEvents, voidedEvents int
		if err := db.QueryRow(`SELECT COUNT(*) FROM prediction_lifecycle_events WHERE market_id=$1 AND event_type='settled'`, marketID).Scan(&settledEvents); err != nil {
			t.Fatalf("count settled events: %v", err)
		}
		if err := db.QueryRow(`SELECT COUNT(*) FROM prediction_lifecycle_events WHERE market_id=$1 AND event_type='voided'`, marketID).Scan(&voidedEvents); err != nil {
			t.Fatalf("count voided events: %v", err)
		}

		// The COR-01 regression signature: both flows' same-tx writes present.
		if settledEvents > 0 && voidedEvents > 0 {
			t.Fatalf("round %d: BOTH settle and void committed (settledEvents=%d voidedEvents=%d status=%s) — double payout", i, settledEvents, voidedEvents, status)
		}
		if settlements > 0 && status == string(MarketStatusVoided) {
			t.Fatalf("round %d: settlement row exists but market is voided — void landed on top of settle", i)
		}

		switch status {
		case string(MarketStatusSettled):
			if settlements != 1 || settledEvents != 1 || voidedEvents != 0 {
				t.Fatalf("round %d: settled market invariants broken (settlements=%d settledEvents=%d voidedEvents=%d)", i, settlements, settledEvents, voidedEvents)
			}
			if voidErr == nil {
				t.Fatalf("round %d: void reported success on a settled market", i)
			}
		case string(MarketStatusVoided):
			if settlements != 0 || voidedEvents != 1 || settledEvents != 0 {
				t.Fatalf("round %d: voided market invariants broken (settlements=%d settledEvents=%d voidedEvents=%d)", i, settlements, settledEvents, voidedEvents)
			}
			if settleErr == nil {
				t.Fatalf("round %d: settle reported success on a voided market", i)
			}
		default:
			t.Fatalf("round %d: market in unexpected terminal status %q (settleErr=%v voidErr=%v)", i, status, settleErr, voidErr)
		}
	}
}

// raceTestDB connects to GATEWAY_DB_DSN or skips, same convention as
// sql_article_source_test.go. The schema must already be migrated (goose up).
func raceTestDB(t *testing.T) *sql.DB {
	t.Helper()
	dsn := os.Getenv("GATEWAY_DB_DSN")
	if dsn == "" {
		t.Skip("set GATEWAY_DB_DSN to run the settle/void race integration test")
	}
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	if err := db.Ping(); err != nil {
		t.Skipf("GATEWAY_DB_DSN set but db not reachable: %v", err)
	}
	return db
}

// seedClosedMarketWithPositions creates two punters, an event, a CLOSED
// market, and one YES + one NO position, returning the market id. Unique
// suffixes keep repeated runs (-count=N) collision-free; rows are left in
// place — the test DB is disposable.
func seedClosedMarketWithPositions(t *testing.T, db *sql.DB, tag string) string {
	t.Helper()
	suffix := fmt.Sprintf("%s-%d", tag, time.Now().UnixNano())

	for _, side := range []string{"yes", "no"} {
		userID := fmt.Sprintf("race-%s-%s", side, suffix)
		if _, err := db.Exec(
			`INSERT INTO punters (id, email, username, password_hash, status)
			 VALUES ($1, $2, $3, 'x', 'active')`,
			userID, userID+"@test.local", userID,
		); err != nil {
			t.Fatalf("seed punter %s: %v", side, err)
		}
	}

	var eventID string
	if err := db.QueryRow(
		`INSERT INTO prediction_events (title, status, open_at, close_at)
		 VALUES ($1, 'open', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 hour')
		 RETURNING id`,
		"race test event "+suffix,
	).Scan(&eventID); err != nil {
		t.Fatalf("seed event: %v", err)
	}

	var marketID string
	if err := db.QueryRow(
		`INSERT INTO prediction_markets
		 (event_id, ticker, title, status, settlement_source_key, settlement_rule, close_at)
		 VALUES ($1, $2, $3, 'closed', 'manual', 'manual-attestation', NOW() - INTERVAL '1 hour')
		 RETURNING id`,
		eventID, "RACE-"+suffix, "race test market "+suffix,
	).Scan(&marketID); err != nil {
		t.Fatalf("seed market: %v", err)
	}

	for _, side := range []string{"yes", "no"} {
		userID := fmt.Sprintf("race-%s-%s", side, suffix)
		if _, err := db.Exec(
			`INSERT INTO prediction_positions
			 (user_id, market_id, side, quantity, avg_price_points, total_cost_points)
			 VALUES ($1, $2, $3, 10, 50, 500)`,
			userID, marketID, side,
		); err != nil {
			t.Fatalf("seed %s position: %v", side, err)
		}
	}
	return marketID
}

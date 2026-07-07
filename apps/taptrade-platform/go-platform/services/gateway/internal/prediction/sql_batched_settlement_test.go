package prediction

import (
	"context"
	"database/sql"
	"fmt"
	"testing"
	"time"
)

// seedClosedMarketWithNPositions creates a closed market with n positions
// (alternating yes/no, each qty 10 @ 50¢ = 500¢ cost) ready to settle.
func seedClosedMarketWithNPositions(t *testing.T, db *sql.DB, tag string, n int) string {
	t.Helper()
	suffix := fmt.Sprintf("%s-%d", tag, time.Now().UnixNano())

	var eventID string
	if err := db.QueryRow(
		`INSERT INTO prediction_events (title, status, open_at, close_at)
		 VALUES ($1, 'open', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 hour')
		 RETURNING id`, "batch test event "+suffix,
	).Scan(&eventID); err != nil {
		t.Fatalf("seed event: %v", err)
	}

	var marketID string
	if err := db.QueryRow(
		`INSERT INTO prediction_markets
		 (event_id, ticker, title, status, settlement_source_key, settlement_rule, close_at)
		 VALUES ($1, $2, $3, 'closed', 'manual', 'manual-attestation', NOW() - INTERVAL '1 hour')
		 RETURNING id`,
		eventID, "BATCH-"+suffix, "batch test market "+suffix,
	).Scan(&marketID); err != nil {
		t.Fatalf("seed market: %v", err)
	}

	for i := 0; i < n; i++ {
		side := "yes"
		if i%2 == 1 {
			side = "no"
		}
		userID := fmt.Sprintf("batch-%d-%s", i, suffix)
		if _, err := db.Exec(
			`INSERT INTO punters (id, email, username, password_hash, status)
			 VALUES ($1, $2, $3, 'x', 'active')`,
			userID, userID+"@test.local", userID,
		); err != nil {
			t.Fatalf("seed punter %d: %v", i, err)
		}
		if _, err := db.Exec(
			`INSERT INTO prediction_positions
			 (user_id, market_id, side, quantity, avg_price_points, total_cost_points)
			 VALUES ($1, $2, $3, 10, 50, 500)`,
			userID, marketID, side,
		); err != nil {
			t.Fatalf("seed position %d: %v", i, err)
		}
	}
	return marketID
}

// assertFullyDisbursed checks the settlement invariants after settlement:
// every position has exactly one payout row, the cursor is complete, the
// market is settled, and winners/losers carry the right realized PnL.
func assertFullyDisbursed(t *testing.T, db *sql.DB, marketID string, n int) {
	t.Helper()

	var status string
	if err := db.QueryRow(`SELECT status FROM prediction_markets WHERE id=$1`, marketID).Scan(&status); err != nil {
		t.Fatalf("read market status: %v", err)
	}
	if status != string(MarketStatusSettled) {
		t.Fatalf("market status = %s, want settled", status)
	}

	var total, completed int
	if err := db.QueryRow(
		`SELECT payouts_total, payouts_completed FROM prediction_settlements WHERE market_id=$1`, marketID,
	).Scan(&total, &completed); err != nil {
		t.Fatalf("read settlement cursor: %v", err)
	}
	if total != n || completed != n {
		t.Fatalf("cursor payouts_total=%d completed=%d, want both %d", total, completed, n)
	}

	var payoutRows int
	if err := db.QueryRow(
		`SELECT COUNT(*) FROM prediction_payouts pay
		 JOIN prediction_settlements s ON s.id = pay.settlement_id
		 WHERE s.market_id=$1`, marketID,
	).Scan(&payoutRows); err != nil {
		t.Fatalf("count payouts: %v", err)
	}
	if payoutRows != n {
		t.Fatalf("payout rows = %d, want %d (duplicates or missing?)", payoutRows, n)
	}

	// Every position closed (quantity 0); winners realized +500, losers -500.
	var openPositions, wrongPnl int
	if err := db.QueryRow(`SELECT COUNT(*) FROM prediction_positions WHERE market_id=$1 AND quantity<>0`, marketID).Scan(&openPositions); err != nil {
		t.Fatalf("count open positions: %v", err)
	}
	if openPositions != 0 {
		t.Fatalf("%d positions still open after settlement", openPositions)
	}
	if err := db.QueryRow(
		`SELECT COUNT(*) FROM prediction_positions
		 WHERE market_id=$1 AND realized_pnl_points NOT IN (500, -500)`, marketID,
	).Scan(&wrongPnl); err != nil {
		t.Fatalf("check realized pnl: %v", err)
	}
	if wrongPnl != 0 {
		t.Fatalf("%d positions have unexpected realized_pnl (double-counted?)", wrongPnl)
	}
}

// TestBatchedSettlementHappyPath settles a market through the batched path
// (multiple batches, batch size 2) via ResolveMarket and asserts every position
// is paid exactly once with a complete cursor.
//
// Run with: GATEWAY_DB_DSN=... go test ./internal/prediction/ -run TestBatchedSettlement -v
func TestBatchedSettlementHappyPath(t *testing.T) {
	db := raceTestDB(t)
	repo := NewSQLRepository(db)
	ctx := context.Background()

	// Force multiple batches.
	orig := settlementPayoutBatchSize
	settlementPayoutBatchSize = 2
	t.Cleanup(func() { settlementPayoutBatchSize = orig })

	const n = 5
	marketID := seedClosedMarketWithNPositions(t, db, "happy", n)

	engine := NewSettlementEngine(repo, &txWalletStub{db: db})
	_, payouts, err := engine.ResolveMarket(ctx, ResolveMarketRequest{
		Result:            MarketResultYes,
		AttestationSource: "manual",
	}, marketID, nil)
	if err != nil {
		t.Fatalf("ResolveMarket (batched): %v", err)
	}
	if len(payouts) != n {
		t.Fatalf("returned %d payouts, want %d", len(payouts), n)
	}
	assertFullyDisbursed(t, db, marketID, n)
}

// TestBatchedSettlementResumeAfterCrash simulates a crash mid-settlement: the
// header commits and only the first batch of payouts lands, leaving the cursor
// short. ResumeIncompleteSettlements must finish disbursing the rest exactly
// once, and a second resume pass must be a no-op.
func TestBatchedSettlementResumeAfterCrash(t *testing.T) {
	db := raceTestDB(t)
	repo := NewSQLRepository(db)
	ctx := context.Background()

	orig := settlementPayoutBatchSize
	settlementPayoutBatchSize = 2
	t.Cleanup(func() { settlementPayoutBatchSize = orig })

	const n = 5
	marketID := seedClosedMarketWithNPositions(t, db, "resume", n)
	engine := NewSettlementEngine(repo, &txWalletStub{db: db})

	market, err := repo.GetMarket(ctx, marketID)
	if err != nil {
		t.Fatalf("get market: %v", err)
	}
	// Mirror resolveMarket: set result + transition in-memory to settled before
	// the header commit (the guarded UPDATE writes market.Status).
	res := MarketResultYes
	market.Result = &res
	if err := TransitionMarket(market, MarketStatusSettled); err != nil {
		t.Fatalf("transition market in-memory: %v", err)
	}

	// --- Simulate a crash after the header + first batch only. ---
	settlement := &Settlement{
		MarketID:          marketID,
		Result:            MarketResultYes,
		AttestationSource: "manual",
		PayoutsTotal:      n,
	}
	if err := repo.PersistSettlementHeader(ctx, market, MarketStatusClosed, settlement, nil); err != nil {
		t.Fatalf("persist header: %v", err)
	}
	first, err := repo.ListUnpaidSettlementPositions(ctx, settlement.ID, marketID, 2)
	if err != nil {
		t.Fatalf("list unpaid: %v", err)
	}
	if len(first) != 2 {
		t.Fatalf("expected 2 unpaid in first batch, got %d", len(first))
	}
	bp := make([]Payout, len(first))
	bc := make([]*WalletCreditRequest, len(first))
	for i, pos := range first {
		u := engine.buildSettlementUnit(pos, MarketResultYes, settlement.ID, marketID)
		bp[i] = u.payout
		bc[i] = u.credit
	}
	if _, err := repo.CommitPayoutBatch(ctx, &txWalletStub{db: db}, settlement.ID, bp, bc, nil, nil); err != nil {
		t.Fatalf("commit first batch: %v", err)
	}

	// Mid-crash state: cursor short, market settled, 3 unpaid.
	var completed int
	if err := db.QueryRow(`SELECT payouts_completed FROM prediction_settlements WHERE id=$1`, settlement.ID).Scan(&completed); err != nil {
		t.Fatalf("read cursor: %v", err)
	}
	if completed != 2 {
		t.Fatalf("expected cursor 2 after first batch, got %d", completed)
	}

	// --- Resume finishes disbursement. --- (done is a global count across any
	// incomplete settlements the shared test DB carries, so we only sanity-check
	// it advanced; the per-market invariant below is the real proof.)
	done, err := engine.ResumeIncompleteSettlements(ctx)
	if err != nil {
		t.Fatalf("resume: %v", err)
	}
	if done < 1 {
		t.Fatalf("resume completed %d settlements, want >=1 (ours)", done)
	}
	assertFullyDisbursed(t, db, marketID, n)

	// A second resume must not double-pay our market: assertFullyDisbursed
	// re-checks exactly one payout row per position and correct PnL, so a
	// re-processed batch would fail it.
	if _, err := engine.ResumeIncompleteSettlements(ctx); err != nil {
		t.Fatalf("second resume: %v", err)
	}
	assertFullyDisbursed(t, db, marketID, n)
}

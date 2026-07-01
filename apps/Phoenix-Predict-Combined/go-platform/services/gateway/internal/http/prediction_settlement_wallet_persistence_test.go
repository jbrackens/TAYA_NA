package http

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"strings"
	"testing"
	"time"

	"phoenix-revival/gateway/internal/prediction"
	"phoenix-revival/gateway/internal/wallet"
)

func TestSettlementPersistsPointLedgerCreditsThroughProductionWalletAdapter(t *testing.T) {
	dsn := strings.TrimSpace(os.Getenv("GATEWAY_DB_DSN"))
	if dsn == "" {
		t.Skip("set GATEWAY_DB_DSN to run the persisted settlement/ledger proof")
	}

	ctx := context.Background()
	predictionDB, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatalf("open prediction db: %v", err)
	}
	t.Cleanup(func() { _ = predictionDB.Close() })
	if err := predictionDB.PingContext(ctx); err != nil {
		t.Skipf("GATEWAY_DB_DSN set but db not reachable: %v", err)
	}

	walletSvc, err := wallet.NewServiceWithDB("postgres", dsn)
	if err != nil {
		t.Fatalf("open wallet db service: %v", err)
	}
	t.Cleanup(func() { _ = walletSvc.DB().Close() })

	repo := prediction.NewSQLRepository(predictionDB)
	engine := prediction.NewSettlementEngine(repo, NewPredictionWalletAdapter(walletSvc))
	marketID, yesUserA, yesUserB, noUser := seedClosedPointSettlementMarket(t, predictionDB)

	settlement, payouts, err := engine.ResolveMarket(ctx, prediction.ResolveMarketRequest{
		Result:            prediction.MarketResultYes,
		AttestationSource: "manual",
	}, marketID, nil)
	if err != nil {
		t.Fatalf("resolve market: %v", err)
	}
	if settlement.TotalPayoutCents != 2000 || settlement.PositionsSettled != 3 {
		t.Fatalf("unexpected settlement summary: %+v", settlement)
	}
	if len(payouts) != 3 {
		t.Fatalf("expected three persisted payout rows, got %d", len(payouts))
	}

	var completed int
	if err := predictionDB.QueryRowContext(ctx,
		`SELECT payouts_completed FROM prediction_settlements WHERE id = $1`,
		settlement.ID,
	).Scan(&completed); err != nil {
		t.Fatalf("read settlement cursor: %v", err)
	}
	if completed != 3 {
		t.Fatalf("expected all payout rows completed, got %d", completed)
	}

	assertSettlementWalletLedgerCredit(t, predictionDB, yesUserA, 1000)
	assertSettlementWalletLedgerCredit(t, predictionDB, yesUserB, 1000)
	assertNoSettlementWalletLedgerCredit(t, predictionDB, noUser)

	var ledgerRows, payoutRows int
	if err := predictionDB.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM wallet_ledger
		  WHERE user_id IN ($1, $2, $3)
		    AND entry_type = 'credit'
		    AND reason LIKE 'prediction settlement:%'`,
		yesUserA, yesUserB, noUser,
	).Scan(&ledgerRows); err != nil {
		t.Fatalf("count settlement ledger rows: %v", err)
	}
	if err := predictionDB.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM prediction_payouts WHERE settlement_id = $1`,
		settlement.ID,
	).Scan(&payoutRows); err != nil {
		t.Fatalf("count payout rows: %v", err)
	}
	if ledgerRows != 2 || payoutRows != 3 {
		t.Fatalf("expected two winner ledger credits and three payout rows, got ledger=%d payouts=%d", ledgerRows, payoutRows)
	}
}

func seedClosedPointSettlementMarket(t *testing.T, db *sql.DB) (marketID, yesUserA, yesUserB, noUser string) {
	t.Helper()

	suffix := fmt.Sprintf("settle-ledger-%d", time.Now().UnixNano())
	yesUserA = "yes-a-" + suffix
	yesUserB = "yes-b-" + suffix
	noUser = "no-" + suffix

	for _, userID := range []string{yesUserA, yesUserB, noUser} {
		if _, err := db.Exec(
			`INSERT INTO punters (id, email, username, password_hash, status)
			 VALUES ($1, $2, $3, 'x', 'active')`,
			userID, userID+"@test.local", userID,
		); err != nil {
			t.Fatalf("seed punter %s: %v", userID, err)
		}
	}

	var eventID string
	if err := db.QueryRow(
		`INSERT INTO prediction_events (title, status, open_at, close_at)
		 VALUES ($1, 'open', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 hour')
		 RETURNING id`,
		"settlement ledger proof event "+suffix,
	).Scan(&eventID); err != nil {
		t.Fatalf("seed event: %v", err)
	}
	if err := db.QueryRow(
		`INSERT INTO prediction_markets
		 (event_id, ticker, title, status, settlement_source_key, settlement_rule, close_at)
		 VALUES ($1, $2, $3, 'closed', 'manual', 'manual-attestation', NOW() - INTERVAL '1 hour')
		 RETURNING id`,
		eventID, "SETTLE-LEDGER-"+suffix, "settlement ledger proof market "+suffix,
	).Scan(&marketID); err != nil {
		t.Fatalf("seed market: %v", err)
	}

	for _, row := range []struct {
		userID string
		side   string
		cost   int64
	}{
		{yesUserA, "yes", 500},
		{yesUserB, "yes", 700},
		{noUser, "no", 400},
	} {
		if _, err := db.Exec(
			`INSERT INTO prediction_positions
			 (user_id, market_id, side, quantity, avg_price_cents, total_cost_cents)
			 VALUES ($1, $2, $3, 10, 50, $4)`,
			row.userID, marketID, row.side, row.cost,
		); err != nil {
			t.Fatalf("seed %s position for %s: %v", row.side, row.userID, err)
		}
	}

	return marketID, yesUserA, yesUserB, noUser
}

func assertSettlementWalletLedgerCredit(t *testing.T, db *sql.DB, userID string, wantAmount int64) {
	t.Helper()

	var amount, balance int64
	var reason, idempotencyKey string
	if err := db.QueryRow(
		`SELECT amount_cents, balance_cents, idempotency_key, reason
		   FROM wallet_ledger
		  WHERE user_id = $1 AND entry_type = 'credit'
		    AND reason LIKE 'prediction settlement:%'
		  ORDER BY id DESC
		  LIMIT 1`,
		userID,
	).Scan(&amount, &balance, &idempotencyKey, &reason); err != nil {
		t.Fatalf("read settlement ledger credit for %s: %v", userID, err)
	}
	if amount != wantAmount || balance != wantAmount {
		t.Fatalf("expected %s ledger amount/balance %d, got amount=%d balance=%d", userID, wantAmount, amount, balance)
	}
	if !strings.HasPrefix(idempotencyKey, "prediction_payout:") {
		t.Fatalf("expected settlement idempotency key for %s, got %q", userID, idempotencyKey)
	}
	for _, retired := range []string{"cashier", "crypto", "deposit", "fiat", "stake", "usd", "withdraw"} {
		if strings.Contains(strings.ToLower(reason), retired) {
			t.Fatalf("settlement ledger reason leaked retired vocabulary %q: %q", retired, reason)
		}
	}
}

func assertNoSettlementWalletLedgerCredit(t *testing.T, db *sql.DB, userID string) {
	t.Helper()

	var count int
	if err := db.QueryRow(
		`SELECT COUNT(*) FROM wallet_ledger
		  WHERE user_id = $1 AND entry_type = 'credit'
		    AND reason LIKE 'prediction settlement:%'`,
		userID,
	).Scan(&count); err != nil {
		t.Fatalf("count settlement ledger credits for %s: %v", userID, err)
	}
	if count != 0 {
		t.Fatalf("losing position user %s received %d settlement ledger credits", userID, count)
	}
}

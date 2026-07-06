package prediction

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"testing"
	"time"
)

// seedMarketWithStatus inserts a throwaway event+market in the given status and
// returns the market ID.
func seedMarketWithStatus(t *testing.T, db *sql.DB, status MarketStatus) string {
	t.Helper()
	suffix := fmt.Sprintf("cas-%d", time.Now().UnixNano())

	var eventID string
	if err := db.QueryRow(
		`INSERT INTO prediction_events (title, status, open_at, close_at)
		 VALUES ($1, 'open', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 hour')
		 RETURNING id`, "cas test event "+suffix,
	).Scan(&eventID); err != nil {
		t.Fatalf("seed event: %v", err)
	}

	var marketID string
	if err := db.QueryRow(
		`INSERT INTO prediction_markets
		 (event_id, ticker, title, status, settlement_source_key, settlement_rule, close_at)
		 VALUES ($1, $2, $3, $4, 'manual', 'manual-attestation', NOW() - INTERVAL '1 hour')
		 RETURNING id`,
		eventID, "CAS-"+suffix, "cas test market "+suffix, string(status),
	).Scan(&marketID); err != nil {
		t.Fatalf("seed market: %v", err)
	}
	return marketID
}

func casReadStatus(t *testing.T, db *sql.DB, id string) string {
	t.Helper()
	var s string
	if err := db.QueryRow(`SELECT status FROM prediction_markets WHERE id=$1`, id).Scan(&s); err != nil {
		t.Fatalf("read status: %v", err)
	}
	return s
}

// TestUpdateMarketStatusCASRejectsStale is the regression test for the
// void→close→settle double-pay hole (SECURITY-REVIEW finding #1): the
// closer/admin status writer must not clobber a market whose status changed
// underneath it. Run with: GATEWAY_DB_DSN=... go test ./internal/prediction/ -run CAS
func TestUpdateMarketStatusCASRejectsStale(t *testing.T) {
	db := raceTestDB(t)
	repo := NewSQLRepository(db)
	ctx := context.Background()

	// A market voided out from under the closer must NOT be re-closed.
	voided := seedMarketWithStatus(t, db, MarketStatusVoided)
	err := repo.UpdateMarketStatus(ctx, voided, MarketStatusClosed, MarketStatusOpen)
	if !errors.Is(err, ErrStaleMarketStatus) {
		t.Fatalf("expected ErrStaleMarketStatus closing a voided market, got %v", err)
	}
	if got := casReadStatus(t, db, voided); got != string(MarketStatusVoided) {
		t.Fatalf("voided market was clobbered to %q — double-pay hole reopened", got)
	}

	// The legitimate open→closed transition still succeeds.
	open := seedMarketWithStatus(t, db, MarketStatusOpen)
	if err := repo.UpdateMarketStatus(ctx, open, MarketStatusClosed, MarketStatusOpen); err != nil {
		t.Fatalf("expected open→closed to succeed, got %v", err)
	}
	if got := casReadStatus(t, db, open); got != string(MarketStatusClosed) {
		t.Fatalf("open market status = %q, want closed", got)
	}
}

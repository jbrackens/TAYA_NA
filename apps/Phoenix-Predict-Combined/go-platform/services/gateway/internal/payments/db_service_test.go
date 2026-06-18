package payments

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"os"
	"testing"
	"time"

	"phoenix-revival/gateway/internal/wallet"
)

// TestHandleWebhookTransactionalDeposit and TestHandleWebhookRejectsAmountMismatch
// exercise the transactional HandleWebhook (MEDIUM #17) against a real Postgres.
// They are skipped unless GATEWAY_DB_DSN is set (and reachable), so the default
// `go test` run stays hermetic; CI runs them with the dev database. The postgres
// driver is registered transitively by the wallet/prediction lib/pq imports.
//
//	GATEWAY_DB_DSN="postgres://predict:localdev@localhost:5434/predict?sslmode=disable" \
//	  go test ./internal/payments/ -run TestHandleWebhook -v
func newDBPaymentTestService(t *testing.T) (*DBPaymentService, *wallet.Service, *sql.DB) {
	t.Helper()
	dsn := os.Getenv("GATEWAY_DB_DSN")
	if dsn == "" {
		t.Skip("set GATEWAY_DB_DSN to run the payments webhook transactional integration test")
	}
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.PingContext(context.Background()); err != nil {
		t.Skipf("GATEWAY_DB_DSN set but db not reachable: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })

	ws, err := wallet.NewServiceWithDB("postgres", dsn)
	if err != nil {
		t.Fatalf("wallet service with db: %v", err)
	}
	svc, err := NewDBPaymentService(db, ws)
	if err != nil {
		t.Fatalf("new db payment service: %v", err)
	}
	return svc, ws, db
}

func TestHandleWebhookTransactionalDeposit(t *testing.T) {
	svc, ws, db := newDBPaymentTestService(t)
	ctx := context.Background()

	userID := "u-webhook-dep-" + time.Now().UTC().Format("150405.000000000")
	txnID := fmt.Sprintf("dep:db:%d", time.Now().UnixNano())
	idem := "webhooktest:" + txnID
	t.Cleanup(func() {
		_, _ = db.ExecContext(ctx, `DELETE FROM payment_transactions WHERE txn_id = $1`, txnID)
	})

	// Seed a pending deposit row directly (bypassing auto-approve).
	if _, err := db.ExecContext(ctx, `
INSERT INTO payment_transactions (txn_id, user_id, txn_type, amount_cents, payment_method, status, idempotency_key)
VALUES ($1, $2, 'deposit', $3, 'credit_card', 'pending', $4)`, txnID, userID, int64(2500), idem); err != nil {
		t.Fatalf("seed pending deposit: %v", err)
	}

	before := ws.Balance(ctx, userID)

	// Matching webhook (amount + user) approves and credits atomically.
	if err := svc.HandleWebhook(ctx, WebhookPayload{
		TransactionID: txnID,
		UserID:        userID,
		Amount:        2500,
		Status:        "approved",
		EventType:     "payment.succeeded",
	}); err != nil {
		t.Fatalf("HandleWebhook: %v", err)
	}

	if got := ws.Balance(ctx, userID) - before; got != 2500 {
		t.Fatalf("wallet credit: got %d, want 2500", got)
	}
	var status string
	if err := db.QueryRowContext(ctx, `SELECT status FROM payment_transactions WHERE txn_id = $1`, txnID).Scan(&status); err != nil {
		t.Fatalf("read status: %v", err)
	}
	if status != "approved" {
		t.Fatalf("status: got %s, want approved", status)
	}

	// Replay is idempotent: stale (already-approved) webhook is ignored, no
	// double credit.
	if err := svc.HandleWebhook(ctx, WebhookPayload{
		TransactionID: txnID, UserID: userID, Amount: 2500, Status: "approved",
	}); err != nil {
		t.Fatalf("HandleWebhook replay: %v", err)
	}
	if got := ws.Balance(ctx, userID) - before; got != 2500 {
		t.Fatalf("replay double-credited: balance delta %d", got)
	}
}

func TestHandleWebhookRejectsAmountMismatch(t *testing.T) {
	svc, ws, db := newDBPaymentTestService(t)
	ctx := context.Background()

	userID := "u-webhook-mismatch-" + time.Now().UTC().Format("150405.000000000")
	txnID := fmt.Sprintf("dep:db:%d", time.Now().UnixNano())
	idem := "webhooktest:" + txnID
	t.Cleanup(func() {
		_, _ = db.ExecContext(ctx, `DELETE FROM payment_transactions WHERE txn_id = $1`, txnID)
	})

	if _, err := db.ExecContext(ctx, `
INSERT INTO payment_transactions (txn_id, user_id, txn_type, amount_cents, payment_method, status, idempotency_key)
VALUES ($1, $2, 'deposit', $3, 'credit_card', 'pending', $4)`, txnID, userID, int64(2500), idem); err != nil {
		t.Fatalf("seed pending deposit: %v", err)
	}

	before := ws.Balance(ctx, userID)

	// Webhook asserts a different amount than the booked row → refuse, no funds
	// moved, row stays pending.
	err := svc.HandleWebhook(ctx, WebhookPayload{
		TransactionID: txnID,
		UserID:        userID,
		Amount:        9900, // mismatch vs recorded 2500
		Status:        "approved",
	})
	if !errors.Is(err, ErrWebhookMismatch) {
		t.Fatalf("expected ErrWebhookMismatch, got %v", err)
	}
	if got := ws.Balance(ctx, userID) - before; got != 0 {
		t.Fatalf("mismatch must not move funds, balance delta %d", got)
	}
	var status string
	if err := db.QueryRowContext(ctx, `SELECT status FROM payment_transactions WHERE txn_id = $1`, txnID).Scan(&status); err != nil {
		t.Fatalf("read status: %v", err)
	}
	if status != "pending" {
		t.Fatalf("status after mismatch: got %s, want pending", status)
	}
}

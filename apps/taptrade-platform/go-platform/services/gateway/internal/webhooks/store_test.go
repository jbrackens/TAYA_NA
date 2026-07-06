package webhooks

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"testing"
	"time"

	_ "github.com/lib/pq"
)

// storeTestDB connects to GATEWAY_DB_DSN (schema already migrated via goose up)
// or skips — same convention as internal/prediction/sql_settlement_race_test.go.
// It TRUNCATEs the two webhook tables so Enqueue fan-out counts are
// deterministic; the test DB is disposable and these tables are self-contained.
func storeTestDB(t *testing.T) *sql.DB {
	t.Helper()
	dsn := os.Getenv("GATEWAY_DB_DSN")
	if dsn == "" {
		t.Skip("set GATEWAY_DB_DSN to run the webhooks store integration test")
	}
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	if err := db.Ping(); err != nil {
		t.Skipf("GATEWAY_DB_DSN set but db not reachable: %v", err)
	}
	if _, err := db.Exec(`TRUNCATE webhook_deliveries, webhook_endpoints RESTART IDENTITY CASCADE`); err != nil {
		t.Fatalf("truncate webhook tables (is migration 039 applied?): %v", err)
	}
	return db
}

func seedPartner(t *testing.T, db *sql.DB) string {
	t.Helper()
	id := fmt.Sprintf("wh-partner-%d", time.Now().UnixNano())
	if _, err := db.Exec(
		`INSERT INTO punters (id, email, username, password_hash, status)
		 VALUES ($1, $2, $3, 'x', 'active')`,
		id, id+"@test.local", id,
	); err != nil {
		t.Fatalf("seed partner: %v", err)
	}
	return id
}

func TestStoreFanOutAndDeliveryLifecycle(t *testing.T) {
	db := storeTestDB(t)
	st := NewSQLStore(db)
	ctx := context.Background()
	partner := seedPartner(t, db)

	// Three endpoints: subscribe-all (active), selective-to-settled (active),
	// and subscribe-all-but-inactive.
	all, err := st.CreateEndpoint(ctx, Endpoint{PartnerID: partner, URL: "https://a.example/hook", Secret: "sa", Active: true})
	if err != nil {
		t.Fatalf("create all-endpoint: %v", err)
	}
	if all.ID == "" {
		t.Fatal("created endpoint should have an id")
	}
	if _, err := st.CreateEndpoint(ctx, Endpoint{PartnerID: partner, URL: "https://b.example/hook", Secret: "sb", Events: []string{EventMarketSettled}, Active: true}); err != nil {
		t.Fatalf("create selective endpoint: %v", err)
	}
	if _, err := st.CreateEndpoint(ctx, Endpoint{PartnerID: partner, URL: "https://c.example/hook", Secret: "sc", Active: false}); err != nil {
		t.Fatalf("create inactive endpoint: %v", err)
	}

	// order.filled reaches only the subscribe-all active endpoint (selective
	// wants settled-only; inactive wants nothing).
	n, err := st.Enqueue(ctx, EventOrderFilled, json.RawMessage(`{"orderId":"o1"}`))
	if err != nil {
		t.Fatalf("enqueue order.filled: %v", err)
	}
	if n != 1 {
		t.Fatalf("order.filled fan-out = %d, want 1", n)
	}

	// market.settled reaches subscribe-all + selective = 2.
	if n, err = st.Enqueue(ctx, EventMarketSettled, json.RawMessage(`{"marketId":"m1"}`)); err != nil {
		t.Fatalf("enqueue market.settled: %v", err)
	}
	if n != 2 {
		t.Fatalf("market.settled fan-out = %d, want 2", n)
	}

	// Claim everything due (3 pending rows total).
	due, err := st.ClaimDue(ctx, 10, 60*time.Second)
	if err != nil {
		t.Fatalf("claim due: %v", err)
	}
	if len(due) != 3 {
		t.Fatalf("claimed %d, want 3", len(due))
	}
	for _, d := range due {
		if d.URL == "" || d.Secret == "" {
			t.Fatalf("claimed delivery %s missing endpoint coords (url=%q secret=%q)", d.ID, d.URL, d.Secret)
		}
		if d.Attempts != 0 {
			t.Fatalf("fresh delivery should have 0 prior attempts, got %d", d.Attempts)
		}
		ev := d.Event()
		if ev.ID != d.ID || ev.Type != d.EventType {
			t.Fatalf("Event() envelope mismatch: %+v", ev)
		}
	}

	// A second immediate claim returns nothing — the lease pushed the rows out.
	if again, err := st.ClaimDue(ctx, 10, 60*time.Second); err != nil {
		t.Fatalf("re-claim: %v", err)
	} else if len(again) != 0 {
		t.Fatalf("leased rows should not re-claim immediately, got %d", len(again))
	}

	// Finalize: one delivered, one rescheduled (transient), one dead-lettered.
	if err := st.MarkDelivered(ctx, due[0].ID, 200); err != nil {
		t.Fatalf("mark delivered: %v", err)
	}
	next := time.Now().Add(2 * time.Second)
	if err := st.Reschedule(ctx, due[1].ID, next, 503, "service unavailable"); err != nil {
		t.Fatalf("reschedule: %v", err)
	}
	if err := st.DeadLetter(ctx, due[2].ID, 400, "bad request"); err != nil {
		t.Fatalf("dead-letter: %v", err)
	}

	assertDelivery(t, db, due[0].ID, "delivered", 1)
	assertDelivery(t, db, due[1].ID, "pending", 1)
	assertDelivery(t, db, due[2].ID, "failed", 1)
}

func TestSetEndpointActiveScopedToOwner(t *testing.T) {
	db := storeTestDB(t)
	st := NewSQLStore(db)
	ctx := context.Background()
	owner := seedPartner(t, db)
	other := seedPartner(t, db)

	ep, err := st.CreateEndpoint(ctx, Endpoint{PartnerID: owner, URL: "https://x.example/h", Secret: "s", Active: true})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	// A different partner cannot toggle it.
	if err := st.SetEndpointActive(ctx, ep.ID, other, false); err != sql.ErrNoRows {
		t.Fatalf("cross-owner toggle: err = %v, want sql.ErrNoRows", err)
	}
	// The owner can.
	if err := st.SetEndpointActive(ctx, ep.ID, owner, false); err != nil {
		t.Fatalf("owner toggle: %v", err)
	}
	eps, err := st.ListEndpoints(ctx, owner)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(eps) != 1 || eps[0].Active {
		t.Fatalf("endpoint should be paused after owner toggle: %+v", eps)
	}
}

func assertDelivery(t *testing.T, db *sql.DB, id, wantStatus string, wantAttempts int) {
	t.Helper()
	var status string
	var attempts int
	if err := db.QueryRow(`SELECT status, attempts FROM webhook_deliveries WHERE id = $1`, id).
		Scan(&status, &attempts); err != nil {
		t.Fatalf("read delivery %s: %v", id, err)
	}
	if status != wantStatus || attempts != wantAttempts {
		t.Fatalf("delivery %s: status=%q attempts=%d, want %q/%d", id, status, attempts, wantStatus, wantAttempts)
	}
}

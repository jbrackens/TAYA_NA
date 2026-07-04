package communications

// Opt-in live test: set COMMS_LIVE_DSN to a scratch database to exercise the
// player-communication history store against real Postgres.

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"testing"
	"time"

	_ "github.com/lib/pq"
)

func TestCommunicationsStoreLive(t *testing.T) {
	dsn := os.Getenv("COMMS_LIVE_DSN")
	if dsn == "" {
		t.Skip("COMMS_LIVE_DSN not set; skipping live communications test")
	}
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer db.Close()

	store, err := NewStore(db)
	if err != nil {
		t.Fatalf("store init: %v", err)
	}
	ctx := context.Background()
	user := fmt.Sprintf("u-comm-%d", time.Now().UnixNano())

	// Required fields are enforced.
	if _, err := store.Record(ctx, Communication{Channel: "email", Status: "sent"}); err != ErrInvalid {
		t.Fatalf("missing user id should be ErrInvalid, got %v", err)
	}
	if _, err := store.Record(ctx, Communication{UserID: user, Status: "sent"}); err != ErrInvalid {
		t.Fatalf("missing channel should be ErrInvalid, got %v", err)
	}

	// Record two comms; the second is newer.
	first, err := store.Record(ctx, Communication{
		UserID: user, Channel: "email", TemplateKey: "welcome",
		Subject: "Hi", Body: "Welcome", Status: "sent", ActorID: "admin-1",
	})
	if err != nil {
		t.Fatalf("record 1: %v", err)
	}
	if first.ID == 0 || first.CreatedAt == "" {
		t.Fatalf("record should return id + timestamp, got %+v", first)
	}
	second, err := store.Record(ctx, Communication{
		UserID: user, Channel: "sms", Status: "failed", ActorID: "admin-2",
	})
	if err != nil {
		t.Fatalf("record 2: %v", err)
	}

	// History is most-recent-first and isolated to the user.
	items, err := store.ListForUser(ctx, user, 0, 0)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(items) != 2 {
		t.Fatalf("expected 2 comms, got %d", len(items))
	}
	if items[0].ID != second.ID || items[1].ID != first.ID {
		t.Fatalf("expected most-recent-first ordering, got %+v", items)
	}
	if items[1].TemplateKey != "welcome" || items[1].Subject != "Hi" || items[1].Body != "Welcome" || items[1].Status != "sent" {
		t.Fatalf("full sent-content not round-tripped: %+v", items[1])
	}

	// Paging: limit 1 returns only the newest; offset 1 returns the older.
	page1, err := store.ListForUser(ctx, user, 1, 0)
	if err != nil || len(page1) != 1 || page1[0].ID != second.ID {
		t.Fatalf("limit=1 offset=0 mismatch: %+v err=%v", page1, err)
	}
	page2, err := store.ListForUser(ctx, user, 1, 1)
	if err != nil || len(page2) != 1 || page2[0].ID != first.ID {
		t.Fatalf("limit=1 offset=1 mismatch: %+v err=%v", page2, err)
	}

	// A user with no comms yields an empty (non-nil) slice.
	empty, err := store.ListForUser(ctx, "u-comm-none", 0, 0)
	if err != nil || empty == nil || len(empty) != 0 {
		t.Fatalf("expected empty non-nil slice, got %+v err=%v", empty, err)
	}
}

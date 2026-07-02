package http

// Opt-in live test (GAP-5): set AUTH_AUDIT_LIVE_DSN to a scratch database to
// confirm the durable auth audit logger persists events to auth_audit.

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"testing"
	"time"

	_ "github.com/lib/pq"
)

func TestAuthAuditDurableLive(t *testing.T) {
	dsn := os.Getenv("AUTH_AUDIT_LIVE_DSN")
	if dsn == "" {
		t.Skip("AUTH_AUDIT_LIVE_DSN not set; skipping live auth-audit test")
	}
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer db.Close()

	// The auth_audit table is created by ensureUserSchema; create it here so
	// the test is self-contained if the schema has not been initialized.
	ctx := context.Background()
	if _, err := db.ExecContext(ctx, `
CREATE TABLE IF NOT EXISTS auth_audit (
  id BIGSERIAL PRIMARY KEY, event TEXT NOT NULL, fields JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`); err != nil {
		t.Fatalf("ensure table: %v", err)
	}

	logger := &dbAuditLogger{db: db, logger: log.Default()}
	evt := fmt.Sprintf("test.audit.%d", time.Now().UnixNano())
	logger.Event(evt, map[string]any{"userId": "u-live", "ok": true})

	var count int
	if err := db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM auth_audit WHERE event = $1`, evt).Scan(&count); err != nil {
		t.Fatalf("query: %v", err)
	}
	if count != 1 {
		t.Fatalf("expected the event persisted once, got %d", count)
	}

	// A nil DB must not panic and must still tee to the log.
	nilLogger := &dbAuditLogger{db: nil, logger: log.Default()}
	nilLogger.Event("test.nildb", map[string]any{"x": 1})
}

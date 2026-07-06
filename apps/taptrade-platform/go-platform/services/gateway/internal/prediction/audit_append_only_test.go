package prediction

import (
	"context"
	"fmt"
	"strings"
	"testing"
	"time"
)

// TestAuditTablesAppendOnly verifies migration 036's DB-level guarantee: the
// compliance audit tables accept INSERTs but reject UPDATE and DELETE — the
// BEFORE trigger fires for every role, so the row is immutable even to the
// table owner (audit CMP-02/03, P3-06). The test lives here only to reuse the
// DB harness; it exercises the migration via raw SQL, not the domain.
//
// Run with: GATEWAY_DB_DSN=... go test ./internal/prediction/ -run TestAuditTablesAppendOnly -v
func TestAuditTablesAppendOnly(t *testing.T) {
	db := raceTestDB(t)
	ctx := context.Background()

	assertAppendOnly := func(t *testing.T, err error, op string) {
		t.Helper()
		if err == nil {
			t.Fatalf("%s on an append-only audit table must fail, got nil", op)
		}
		if !strings.Contains(strings.ToLower(err.Error()), "append-only") {
			t.Fatalf("%s should be rejected with an append-only error, got: %v", op, err)
		}
	}

	t.Run("provider_ops_audit_log", func(t *testing.T) {
		id := fmt.Sprintf("p3-06-%d", time.Now().UnixNano())
		if _, err := db.ExecContext(ctx,
			`INSERT INTO provider_ops_audit_log (id, action, actor_id, target_id, occurred_at, details)
			 VALUES ($1,'test.action','a-1','t-1','2026-01-01T00:00:00Z','{}')`, id); err != nil {
			t.Fatalf("INSERT (append) must succeed: %v", err)
		}
		_, uerr := db.ExecContext(ctx, `UPDATE provider_ops_audit_log SET action='tampered' WHERE id=$1`, id)
		assertAppendOnly(t, uerr, "UPDATE")
		_, derr := db.ExecContext(ctx, `DELETE FROM provider_ops_audit_log WHERE id=$1`, id)
		assertAppendOnly(t, derr, "DELETE")
	})

	t.Run("alpha_cashier_audit_events", func(t *testing.T) {
		var id string
		if err := db.QueryRowContext(ctx,
			`INSERT INTO alpha_cashier_audit_events (subject_type, subject_id, event_type, actor_type)
			 VALUES ('test','s-1','test.evt','system') RETURNING id`).Scan(&id); err != nil {
			t.Fatalf("INSERT (append) must succeed: %v", err)
		}
		_, uerr := db.ExecContext(ctx, `UPDATE alpha_cashier_audit_events SET event_type='tampered' WHERE id=$1`, id)
		assertAppendOnly(t, uerr, "UPDATE")
		_, derr := db.ExecContext(ctx, `DELETE FROM alpha_cashier_audit_events WHERE id=$1`, id)
		assertAppendOnly(t, derr, "DELETE")
	})
}

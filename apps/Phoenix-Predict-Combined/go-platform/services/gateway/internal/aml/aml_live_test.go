package aml

// Opt-in live test for the AML store: set AML_LIVE_DSN to a scratch database
// to exercise ensureSchema + the rule/alert/case workflow against real
// Postgres. Skipped everywhere the env is unset (CI, plain `go test`).

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"testing"
	"time"

	_ "github.com/lib/pq"
)

func TestAMLStoreWorkflowLive(t *testing.T) {
	dsn := os.Getenv("AML_LIVE_DSN")
	if dsn == "" {
		t.Skip("AML_LIVE_DSN not set; skipping live Postgres AML test")
	}
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer db.Close()
	store, err := NewStore(db)
	if err != nil {
		t.Fatalf("init (ensureSchema): %v", err)
	}
	ctx := context.Background()
	subject := fmt.Sprintf("u-aml-%d", time.Now().UnixNano())

	// Load a rule as DATA (the regime-agnostic path).
	ruleID, err := store.UpsertRule(ctx, Rule{
		Name: "large-deposit", Kind: "amount_threshold", RiskPoints: 60, Severity: "high",
		Enabled: true, Params: map[string]any{"thresholdCents": 1_000_000, "kinds": "deposit"},
	})
	if err != nil || ruleID == 0 {
		t.Fatalf("upsert rule: %v", err)
	}
	rules, err := store.EnabledRules(ctx)
	if err != nil || len(rules) == 0 {
		t.Fatalf("enabled rules: %v (%d)", err, len(rules))
	}

	// Evaluate an over-threshold event and persist the alert.
	ev := MoneyEvent{SubjectID: subject, Kind: "deposit", AmountCents: 2_000_000, Reference: "led-1"}
	alerts := Evaluate(rules, ev, SubjectWindow{})
	if len(alerts) != 1 {
		t.Fatalf("expected 1 alert, got %d", len(alerts))
	}
	inserted, alertID, err := store.InsertAlert(ctx, alerts[0])
	if err != nil || !inserted || alertID == 0 {
		t.Fatalf("insert alert: inserted=%v id=%d err=%v", inserted, alertID, err)
	}
	// Idempotent: the same event does not double-report.
	again, _, err := store.InsertAlert(ctx, alerts[0])
	if err != nil || again {
		t.Fatalf("re-insert must be idempotent, got inserted=%v err=%v", again, err)
	}

	// Risk points accrue for the subject (Scenario 5).
	pts, err := store.OpenAlertRiskPoints(ctx, subject)
	if err != nil || pts != 60 {
		t.Fatalf("risk points: got %d err=%v", pts, err)
	}

	// Open a case from the alert, then file a SAR.
	c, err := store.OpenCase(ctx, "Structuring review", "high", subject, "analyst-1", []int64{alertID})
	if err != nil || c == nil || c.AlertCount != 1 {
		t.Fatalf("open case: %+v err=%v", c, err)
	}
	// Closing without a resolution is refused.
	if _, err := store.UpdateCaseStatus(ctx, c.ID, "closed_sar_filed", "", "SAR-2026-001"); err != ErrResolutionRequired {
		t.Fatalf("close without resolution: want ErrResolutionRequired, got %v", err)
	}
	closed, err := store.UpdateCaseStatus(ctx, c.ID, "closed_sar_filed", "filed with FIU", "SAR-2026-001")
	if err != nil || closed.Status != "closed_sar_filed" || closed.SARReference != "SAR-2026-001" {
		t.Fatalf("close with SAR: %+v err=%v", closed, err)
	}
	// A closed case is terminal.
	if _, err := store.UpdateCaseStatus(ctx, c.ID, "investigating", "", ""); err != ErrCaseClosed {
		t.Fatalf("reopen closed case: want ErrCaseClosed, got %v", err)
	}
	// The alert is now linked, so it no longer counts as open risk.
	if pts, _ := store.OpenAlertRiskPoints(ctx, subject); pts != 0 {
		t.Fatalf("linked alert should not count as open risk, got %d", pts)
	}
}

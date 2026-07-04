package aml

// Opt-in live test for the AML ingestion scanner: set AML_LIVE_DSN to a
// scratch database. Seeds wallet_ledger rows directly (the scanner reads them
// read-only) and exercises ScanOnce end-to-end. Skipped when the env is unset.

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"testing"
	"time"

	_ "github.com/lib/pq"
)

// ensureWalletLedgerForTest creates the minimal wallet_ledger shape the scanner
// reads. In production the wallet service owns this table; the scanner only
// SELECTs from it. The columns/constraints mirror internal/wallet/service.go.
func ensureWalletLedgerForTest(t *testing.T, db *sql.DB) {
	t.Helper()
	_, err := db.Exec(`
CREATE TABLE IF NOT EXISTS wallet_ledger (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  entry_type TEXT NOT NULL,
  fund_type TEXT NOT NULL DEFAULT 'real',
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  balance_cents BIGINT NOT NULL DEFAULT 0,
  idempotency_key TEXT NOT NULL,
  reason TEXT,
  transaction_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (entry_type, user_id, idempotency_key)
)`)
	if err != nil {
		t.Fatalf("create wallet_ledger: %v", err)
	}
}

func seedLedger(t *testing.T, db *sql.DB, userID, entryType, fundType, reason, key string, amount int64, at time.Time) {
	t.Helper()
	_, err := db.Exec(`
INSERT INTO wallet_ledger (user_id, entry_type, fund_type, amount_cents, balance_cents, idempotency_key, reason, transaction_time)
VALUES ($1,$2,$3,$4,0,$5,$6,$7)`, userID, entryType, fundType, amount, key, reason, at)
	if err != nil {
		t.Fatalf("seed ledger: %v", err)
	}
}

// TestAMLScannerRescanBackfillLive proves GAP-60: a deposit scanned while NO
// rules are loaded has the watermark advanced past it and is never evaluated —
// until an admin Rescan reopens it against the now-loaded rules.
func TestAMLScannerRescanBackfillLive(t *testing.T) {
	dsn := os.Getenv("AML_LIVE_DSN")
	if dsn == "" {
		t.Skip("AML_LIVE_DSN not set; skipping live Postgres AML rescan test")
	}
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer db.Close()
	ensureWalletLedgerForTest(t, db)
	store, err := NewStore(db)
	if err != nil {
		t.Fatalf("store: %v", err)
	}
	ctx := context.Background()
	for _, stmt := range []string{
		"DELETE FROM aml_alerts", "DELETE FROM aml_cases", "DELETE FROM aml_rules",
		"DELETE FROM wallet_ledger", "UPDATE aml_scan_state SET last_ledger_id = 0",
	} {
		if _, err := db.Exec(stmt); err != nil {
			t.Fatalf("reset %q: %v", stmt, err)
		}
	}
	subject := fmt.Sprintf("u-rescan-%d", time.Now().UnixNano())
	now := time.Now().UTC()

	countAlerts := func() int {
		alerts, _ := store.ListAlerts(ctx, "", 50, 0)
		n := 0
		for _, a := range alerts {
			if a.SubjectID == subject {
				n++
			}
		}
		return n
	}

	// A large deposit lands while NO rules are loaded.
	seedLedger(t, db, subject, "credit", "real", "alpha USDC deposit 1/0xbig", "alpha-cashier:deposit:1:0xbig:0", 2_000_000, now)

	// First scan with zero rules: the watermark advances past the deposit and
	// nothing fires (fail-safe empty rule set).
	if _, err := store.forTestScan(t, db).ScanOnce(ctx); err != nil {
		t.Fatalf("scan (no rules): %v", err)
	}
	if countAlerts() != 0 {
		t.Fatal("no rules → no alert expected")
	}
	if wm, _ := store.Watermark(ctx); wm == 0 {
		t.Fatal("watermark should have advanced past the deposit")
	}

	// Compliance NOW loads a large-deposit rule.
	if _, err := store.UpsertRule(ctx, Rule{Name: "large-deposit", Kind: "amount_threshold", RiskPoints: 60,
		Severity: "high", Enabled: true, Params: map[string]any{"thresholdCents": 1_000_000, "kinds": "deposit"}}); err != nil {
		t.Fatalf("rule: %v", err)
	}

	// A normal scan does NOTHING for the earlier deposit — the watermark is past
	// it. THIS is the GAP-60 gap.
	if _, err := store.forTestScan(t, db).ScanOnce(ctx); err != nil {
		t.Fatalf("scan (rule loaded): %v", err)
	}
	if countAlerts() != 0 {
		t.Fatal("without a rescan, a rule loaded after the scan never sees the earlier deposit (the gap)")
	}

	// Rescan from 0 reopens the deposit against the now-loaded rule → alert.
	examined, err := store.forTestScan(t, db).Rescan(ctx, 0)
	if err != nil {
		t.Fatalf("rescan: %v", err)
	}
	if examined < 1 {
		t.Fatalf("rescan should re-examine the deposit row, examined=%d", examined)
	}
	if countAlerts() != 1 {
		t.Fatalf("rescan must evaluate the earlier deposit and raise the alert, got %d alerts", countAlerts())
	}
}

func TestAMLScannerIngestionLive(t *testing.T) {
	dsn := os.Getenv("AML_LIVE_DSN")
	if dsn == "" {
		t.Skip("AML_LIVE_DSN not set; skipping live Postgres AML scanner test")
	}
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer db.Close()
	ensureWalletLedgerForTest(t, db)
	store, err := NewStore(db)
	if err != nil {
		t.Fatalf("store: %v", err)
	}
	ctx := context.Background()
	// Hermetic: aml_rules is global state shared with other live tests, and
	// the scanner reads the whole ledger past its watermark. Reset both so this
	// test controls exactly which rules fire and which rows are scanned.
	for _, stmt := range []string{
		"DELETE FROM aml_alerts", "DELETE FROM aml_cases", "DELETE FROM aml_rules",
		"DELETE FROM wallet_ledger", "UPDATE aml_scan_state SET last_ledger_id = 0",
	} {
		if _, err := db.Exec(stmt); err != nil {
			t.Fatalf("reset %q: %v", stmt, err)
		}
	}
	subject := fmt.Sprintf("u-scan-%d", time.Now().UnixNano())
	now := time.Now().UTC()

	// A large-deposit rule loaded as data (60 points), plus an aggregate
	// structuring rule (50 points over 5 small deposits in a day).
	if _, err := store.UpsertRule(ctx, Rule{Name: "large-deposit", Kind: "amount_threshold", RiskPoints: 60,
		Severity: "high", Enabled: true, Params: map[string]any{"thresholdCents": 1_000_000, "kinds": "deposit"}}); err != nil {
		t.Fatalf("rule1: %v", err)
	}
	if _, err := store.UpsertRule(ctx, Rule{Name: "structuring", Kind: "aggregate", RiskPoints: 50,
		Severity: "high", Enabled: true, Params: map[string]any{"thresholdCents": 900_000, "windowSeconds": 86400, "kinds": "deposit"}}); err != nil {
		t.Fatalf("rule2: %v", err)
	}

	// Seed: one over-threshold NATIVE-CRYPTO deposit (verification #7 regression:
	// reason "alpha USDC deposit …" / key "alpha-cashier:deposit:…", which the
	// old reason-prefix classifier mislabeled as adjustment so deposit rules
	// never fired), plus rows the scanner must ignore — a trading fill
	// (prediction_ key), a bonus-fund row, and a release marker for a prediction
	// order (key "release:prediction_order:…", which does NOT start with
	// prediction_ and used to leak into "adjustment").
	seedLedger(t, db, subject, "credit", "real", "alpha USDC deposit 1/0xbig", "alpha-cashier:deposit:1:0xbig:0", 2_000_000, now)
	seedLedger(t, db, subject, "debit", "real", "fill", "prediction_fill:x", 500_000, now)
	seedLedger(t, db, subject, "credit", "bonus", "bonus grant", "bonus-grant:y", 3_000_000, now)
	seedLedger(t, db, subject, "release", "real", "reservation released prediction_order:o-1", "release:prediction_order:o-1", 400_000, now)

	n, err := store.forTestScan(t, db).ScanOnce(ctx)
	if err != nil {
		t.Fatalf("ScanOnce: %v", err)
	}
	if n != 4 {
		t.Fatalf("expected 4 ledger rows examined, got %d", n)
	}

	// Only the real deposit fires the large-deposit rule; the aggregate rule
	// also fires (2,000,000 >= 900,000 in the day). Trading + bonus ignored.
	alerts, _ := store.ListAlerts(ctx, "", 50, 0)
	subjAlerts := 0
	for _, a := range alerts {
		if a.SubjectID == subject {
			subjAlerts++
		}
	}
	if subjAlerts != 2 {
		t.Fatalf("expected 2 alerts for the deposit (threshold+aggregate), got %d", subjAlerts)
	}

	// Risk points = 60 + 50 = 110 >= 100 → a case was auto-opened, so the
	// alerts are now linked (no longer open risk).
	if pts, _ := store.OpenAlertRiskPoints(ctx, subject); pts != 0 {
		t.Fatalf("alerts should be linked to an auto-opened case, open risk=%d", pts)
	}
	cases, _ := store.ListCases(ctx, "", 50, 0)
	found := false
	for _, c := range cases {
		if c.SubjectID == subject && c.OpenedBy == "aml-scanner" && c.RiskPoints == 110 {
			found = true
		}
	}
	if !found {
		t.Fatal("expected an auto-opened case for the subject with 110 risk points")
	}

	// Idempotent: re-scanning advances nothing new (watermark consumed the batch).
	n2, err := store.forTestScan(t, db).ScanOnce(ctx)
	if err != nil {
		t.Fatalf("re-ScanOnce: %v", err)
	}
	if n2 != 0 {
		t.Fatalf("re-scan should examine 0 new rows, got %d", n2)
	}
}

// forTestScan builds a Scanner sharing the store's db handle, threshold 100.
func (s *Store) forTestScan(t *testing.T, ledger *sql.DB) *Scanner {
	t.Helper()
	return NewScanner(s, ledger, time.Minute, 100)
}

// TestAMLScannerRecomputesRiskOnAlertLive (GAP-82 slice 2) proves the end-to-end
// wiring: when a scan raises a NEW alert for a subject, the scanner invokes
// OnAlert once for that subject (the gateway wires this to the risk-rating
// recompute so AML risk-point accrual reaches the prohibited-tier order gate),
// and a subsequent scan that raises no new alert does not re-fire it.
func TestAMLScannerRecomputesRiskOnAlertLive(t *testing.T) {
	dsn := os.Getenv("AML_LIVE_DSN")
	if dsn == "" {
		t.Skip("AML_LIVE_DSN not set; skipping live Postgres AML OnAlert test")
	}
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer db.Close()
	ensureWalletLedgerForTest(t, db)
	store, err := NewStore(db)
	if err != nil {
		t.Fatalf("store: %v", err)
	}
	ctx := context.Background()
	for _, stmt := range []string{
		"DELETE FROM aml_alerts", "DELETE FROM aml_cases", "DELETE FROM aml_rules",
		"DELETE FROM wallet_ledger", "UPDATE aml_scan_state SET last_ledger_id = 0",
	} {
		if _, err := db.Exec(stmt); err != nil {
			t.Fatalf("reset %q: %v", stmt, err)
		}
	}
	subject := fmt.Sprintf("u-onalert-%d", time.Now().UnixNano())
	now := time.Now().UTC()

	if _, err := store.UpsertRule(ctx, Rule{Name: "large-deposit", Kind: "amount_threshold", RiskPoints: 60,
		Severity: "high", Enabled: true, Params: map[string]any{"thresholdCents": 1_000_000, "kinds": "deposit"}}); err != nil {
		t.Fatalf("rule: %v", err)
	}
	seedLedger(t, db, subject, "credit", "real", "alpha USDC deposit 1/0xbig", "alpha-cashier:deposit:1:0xbig:0", 2_000_000, now)

	var recomputed []string
	sc := store.forTestScan(t, db)
	sc.OnAlert = func(_ context.Context, subjectID string) { recomputed = append(recomputed, subjectID) }

	if _, err := sc.ScanOnce(ctx); err != nil {
		t.Fatalf("scan: %v", err)
	}
	if len(recomputed) != 1 || recomputed[0] != subject {
		t.Fatalf("expected one risk recompute for %s on the new alert, got %v", subject, recomputed)
	}

	// A second scan sees no new ledger rows / raises no new alert (dedup) → no
	// further recompute.
	recomputed = nil
	if _, err := sc.ScanOnce(ctx); err != nil {
		t.Fatalf("second scan: %v", err)
	}
	if len(recomputed) != 0 {
		t.Fatalf("a scan with no new alert must not recompute, got %v", recomputed)
	}
}

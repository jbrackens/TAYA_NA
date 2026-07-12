package wallet

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestCreditAndDebitFlow(t *testing.T) {
	svc := NewService()

	credit, err := svc.Credit(context.Background(), MutationRequest{
		UserID:         "u-1",
		AmountPoints:   1000,
		IdempotencyKey: "k1",
		Reason:         "deposit",
	})
	if err != nil {
		t.Fatalf("credit: %v", err)
	}
	if credit.BalancePoints != 1000 {
		t.Fatalf("expected balance 1000 after credit, got %d", credit.BalancePoints)
	}

	debit, err := svc.Debit(context.Background(), MutationRequest{
		UserID:         "u-1",
		AmountPoints:   300,
		IdempotencyKey: "k2",
		Reason:         "bet placement",
	})
	if err != nil {
		t.Fatalf("debit: %v", err)
	}
	if debit.BalancePoints != 700 {
		t.Fatalf("expected balance 700 after debit, got %d", debit.BalancePoints)
	}
}

func TestCreditIsIdempotentByKey(t *testing.T) {
	svc := NewService()

	first, err := svc.Credit(context.Background(), MutationRequest{
		UserID:         "u-2",
		AmountPoints:   500,
		IdempotencyKey: "same-key",
	})
	if err != nil {
		t.Fatalf("first credit: %v", err)
	}

	second, err := svc.Credit(context.Background(), MutationRequest{
		UserID:         "u-2",
		AmountPoints:   500,
		IdempotencyKey: "same-key",
	})
	if err != nil {
		t.Fatalf("second credit: %v", err)
	}

	if first.EntryID != second.EntryID {
		t.Fatalf("expected same ledger entry for idempotent replay")
	}
	if svc.Balance(context.Background(), "u-2") != 500 {
		t.Fatalf("expected balance to remain 500 after idempotent replay")
	}
}

func TestIdempotencyKeyConflictReturnsError(t *testing.T) {
	svc := NewService()

	_, err := svc.Credit(context.Background(), MutationRequest{
		UserID:         "u-2",
		AmountPoints:   500,
		IdempotencyKey: "same-key",
		Reason:         "initial",
	})
	if err != nil {
		t.Fatalf("initial credit: %v", err)
	}

	_, err = svc.Credit(context.Background(), MutationRequest{
		UserID:         "u-2",
		AmountPoints:   700,
		IdempotencyKey: "same-key",
		Reason:         "mismatch",
	})
	if err == nil {
		t.Fatalf("expected idempotency conflict error")
	}
	if err != ErrIdempotencyConflict {
		t.Fatalf("expected ErrIdempotencyConflict, got %v", err)
	}
}

func TestSameMutationReplayTrimsReason(t *testing.T) {
	existing := LedgerEntry{
		AmountPoints: 500,
		Reason:       "starter_grant",
	}
	request := MutationRequest{
		AmountPoints: 500,
		Reason:       " starter_grant ",
	}

	if !sameMutationReplay(existing, request) {
		t.Fatal("expected same mutation replay when only reason whitespace differs")
	}

	request.AmountPoints = 700
	if sameMutationReplay(existing, request) {
		t.Fatal("expected changed amount to remain an idempotency conflict")
	}
}

func TestDebitFailsWhenInsufficientFunds(t *testing.T) {
	svc := NewService()

	_, err := svc.Debit(context.Background(), MutationRequest{
		UserID:         "u-3",
		AmountPoints:   200,
		IdempotencyKey: "debit-insufficient",
	})
	if err == nil {
		t.Fatalf("expected insufficient funds error")
	}
	if err != ErrInsufficientFunds {
		t.Fatalf("expected ErrInsufficientFunds, got %v", err)
	}
}

func TestWalletStatePersistsAcrossServiceInstances(t *testing.T) {
	path := filepath.Join(t.TempDir(), "wallet-state.json")

	first := NewServiceWithPath(path)
	_, err := first.Credit(context.Background(), MutationRequest{
		UserID:         "u-4",
		AmountPoints:   250,
		IdempotencyKey: "credit-1",
		Reason:         "seed",
	})
	if err != nil {
		t.Fatalf("credit with persisted service: %v", err)
	}

	second := NewServiceWithPath(path)
	if got := second.Balance(context.Background(), "u-4"); got != 250 {
		t.Fatalf("expected persisted balance 250, got %d", got)
	}
}

func TestRewardClusterMigrationOwnsPersistentStore(t *testing.T) {
	raw, err := os.ReadFile(filepath.Join("..", "..", "migrations", "048_wallet_reward_clusters.sql"))
	if err != nil {
		t.Fatalf("read reward cluster migration: %v", err)
	}
	body := string(raw)
	for _, want := range []string{
		"CREATE TABLE IF NOT EXISTS wallet_reward_clusters",
		"signal_hash TEXT NOT NULL",
		"PRIMARY KEY (window_date, signal_type, signal_hash, user_id)",
		"idx_wallet_reward_clusters_signal",
		"DROP TABLE IF EXISTS wallet_reward_clusters",
	} {
		if !strings.Contains(body, want) {
			t.Fatalf("reward cluster migration missing %q", want)
		}
	}
}

func TestRewardClusterDBStoreBlocksAcrossServiceInstances(t *testing.T) {
	dsn := strings.TrimSpace(os.Getenv("WALLET_DB_DSN"))
	if dsn == "" {
		dsn = strings.TrimSpace(os.Getenv("GATEWAY_DB_DSN"))
	}
	if dsn == "" {
		t.Skip("set WALLET_DB_DSN or GATEWAY_DB_DSN to run the DB-backed reward cluster proof")
	}

	ctx := context.Background()
	first, err := NewServiceWithDB("postgres", dsn)
	if err != nil {
		t.Skipf("wallet DB not reachable: %v", err)
	}
	t.Cleanup(func() { _ = first.DB().Close() })
	second, err := NewServiceWithDB("postgres", dsn)
	if err != nil {
		t.Fatalf("open second wallet DB service: %v", err)
	}
	t.Cleanup(func() { _ = second.DB().Close() })

	windowDate := "2099-06-28"
	rawDevice := "device-db-multi-node-proof"
	rawIP := "203.0.113.88"
	signals := []RewardClusterSignal{
		{Kind: "device", Signal: rawDevice, MaxUsers: 1},
		{Kind: "ip", Signal: rawIP, MaxUsers: 1},
	}
	cleanup := func() {
		_, _ = first.DB().ExecContext(ctx, `DELETE FROM wallet_reward_clusters WHERE window_date = $1`, windowDate)
	}
	cleanup()
	t.Cleanup(cleanup)

	allowed, kind, err := first.TryRecordRewardClusters(ctx, windowDate, "u-db-cluster-1", signals)
	if err != nil {
		t.Fatalf("record first service cluster evidence: %v", err)
	}
	if !allowed || kind != "" {
		t.Fatalf("expected first service to allow cluster recording, allowed=%t kind=%q", allowed, kind)
	}

	allowed, kind, err = second.TryRecordRewardClusters(ctx, windowDate, "u-db-cluster-1", signals)
	if err != nil {
		t.Fatalf("same-user retry through second service: %v", err)
	}
	if !allowed || kind != "" {
		t.Fatalf("expected same-user retry through second service to stay allowed, allowed=%t kind=%q", allowed, kind)
	}

	allowed, kind, err = second.TryRecordRewardClusters(ctx, windowDate, "u-db-cluster-2", signals)
	if err != nil {
		t.Fatalf("second service cluster check: %v", err)
	}
	if allowed || kind != "device" {
		t.Fatalf("expected second service to block a different user on the shared device cluster, allowed=%t kind=%q", allowed, kind)
	}

	summaries, err := second.RewardClusterSummaries(ctx, windowDate, 10)
	if err != nil {
		t.Fatalf("read DB reward cluster summaries: %v", err)
	}
	if len(summaries) != 2 {
		t.Fatalf("expected device and IP cluster summaries, got %+v", summaries)
	}
	for _, summary := range summaries {
		if summary.WindowDate != windowDate || summary.DistinctUserCount != 1 {
			t.Fatalf("unexpected cluster summary: %+v", summary)
		}
		if len(summary.SignalHash) != 64 {
			t.Fatalf("expected hashed signal evidence, got %+v", summary)
		}
		if strings.Contains(summary.SignalHash, rawDevice) || strings.Contains(summary.SignalHash, rawIP) {
			t.Fatalf("summary leaked raw signal value: %+v", summary)
		}
		if len(summary.UserIDs) != 1 || summary.UserIDs[0] != "u-db-cluster-1" {
			t.Fatalf("blocked user should not be recorded in cluster evidence: %+v", summary)
		}
	}

	var rawSignalRows int
	if err := first.DB().QueryRowContext(ctx, `
SELECT COUNT(*)
FROM wallet_reward_clusters
WHERE window_date = $1 AND signal_hash IN ($2, $3)`,
		windowDate, rawDevice, rawIP).Scan(&rawSignalRows); err != nil {
		t.Fatalf("check raw signal storage: %v", err)
	}
	if rawSignalRows != 0 {
		t.Fatalf("raw reward cluster signals must not be stored, found %d rows", rawSignalRows)
	}
}

func TestNewServiceFromEnvFallsBackToLocalStoreWithoutDBDSN(t *testing.T) {
	t.Setenv("WALLET_STORE_MODE", "db")
	t.Setenv("WALLET_DB_DSN", "")
	t.Setenv("WALLET_LEDGER_FILE", "")

	svc := NewServiceFromEnv()
	if svc == nil {
		t.Fatalf("expected non-nil service")
	}
	if svc.db != nil {
		t.Fatalf("expected fallback local store when WALLET_DB_DSN is missing")
	}
}

func TestReconciliationSummaryLocalStore(t *testing.T) {
	svc := NewService()
	base := time.Date(2026, 3, 2, 10, 0, 0, 0, time.UTC)
	svc.now = func() time.Time { return base }

	_, err := svc.Credit(context.Background(), MutationRequest{
		UserID:         "u-recon-1",
		AmountPoints:   1200,
		IdempotencyKey: "credit-1",
	})
	if err != nil {
		t.Fatalf("credit: %v", err)
	}

	svc.now = func() time.Time { return base.Add(5 * time.Minute) }
	_, err = svc.Debit(context.Background(), MutationRequest{
		UserID:         "u-recon-1",
		AmountPoints:   300,
		IdempotencyKey: "debit-1",
	})
	if err != nil {
		t.Fatalf("debit: %v", err)
	}

	summary, err := svc.ReconciliationSummary(context.Background(), nil, nil)
	if err != nil {
		t.Fatalf("reconciliation summary: %v", err)
	}
	if summary.TotalCredits != 1200 || summary.TotalDebits != 300 {
		t.Fatalf("unexpected totals: %+v", summary)
	}
	if summary.NetMovement != 900 {
		t.Fatalf("expected net movement 900, got %d", summary.NetMovement)
	}
	if summary.EntryCount != 2 || summary.DistinctUserIDs != 1 {
		t.Fatalf("unexpected counts: %+v", summary)
	}
}

func TestManualCorrectionTaskLifecycle(t *testing.T) {
	svc := NewService()
	_, err := svc.Credit(context.Background(), MutationRequest{
		UserID:         "u-correction-1",
		AmountPoints:   1000,
		IdempotencyKey: "seed-correction-1",
	})
	if err != nil {
		t.Fatalf("seed balance: %v", err)
	}

	task, err := svc.CreateManualCorrectionTask(context.Background(), "u-correction-1", "manual review requested", "operator requested check", 250)
	if err != nil {
		t.Fatalf("create manual task: %v", err)
	}
	if task.Type != "manual_review" {
		t.Fatalf("expected manual_review task type, got %s", task.Type)
	}

	resolved, err := svc.ResolveCorrectionTask(task.TaskID, "admin-risk-1", "resolved after review")
	if err != nil {
		t.Fatalf("resolve task: %v", err)
	}
	if resolved.Status != "resolved" {
		t.Fatalf("expected resolved status, got %s", resolved.Status)
	}
	if resolved.ResolvedBy != "admin-risk-1" {
		t.Fatalf("expected resolvedBy admin-risk-1, got %s", resolved.ResolvedBy)
	}
}

// TestBalanceSummaryMemoryMode pins the memory-mode contract: available equals
// balance (no reservations exist in memory mode) and reserved is zero — the
// same answers Balance + AvailableBalance give.
func TestBalanceSummaryMemoryMode(t *testing.T) {
	svc := NewService()
	ctx := context.Background()
	if _, err := svc.Credit(ctx, MutationRequest{
		UserID:         "u-summary-mem",
		AmountPoints:   12345,
		IdempotencyKey: "seed-summary-mem",
		Reason:         "starter points",
	}); err != nil {
		t.Fatalf("seed balance: %v", err)
	}

	summary := svc.BalanceSummary(ctx, "u-summary-mem")
	if summary.BalancePoints != 12345 || summary.AvailablePoints != 12345 || summary.ReservedPoints != 0 {
		t.Fatalf("unexpected memory summary: %+v", summary)
	}
	if got := svc.Balance(ctx, "u-summary-mem"); got != summary.BalancePoints {
		t.Fatalf("summary balance %d diverges from Balance %d", summary.BalancePoints, got)
	}
	if got := svc.AvailableBalance(ctx, "u-summary-mem"); got != summary.AvailablePoints {
		t.Fatalf("summary available %d diverges from AvailableBalance %d", summary.AvailablePoints, got)
	}

	// Unknown user reads as all zeros, matching Balance/AvailableBalance.
	if empty := svc.BalanceSummary(ctx, "u-summary-mem-unknown"); empty != (BalanceSummary{}) {
		t.Fatalf("expected zero summary for unknown user, got %+v", empty)
	}
}

// TestBalanceSummaryDBMode proves the one-query summary matches the legacy
// Balance + AvailableBalance pair with an active held reservation in play.
// Skips without a DB DSN, like the other DB-backed wallet proofs.
func TestBalanceSummaryDBMode(t *testing.T) {
	dsn := strings.TrimSpace(os.Getenv("WALLET_DB_DSN"))
	if dsn == "" {
		dsn = strings.TrimSpace(os.Getenv("GATEWAY_DB_DSN"))
	}
	if dsn == "" {
		t.Skip("set WALLET_DB_DSN or GATEWAY_DB_DSN to run the DB-backed balance summary proof")
	}

	ctx := context.Background()
	svc, err := NewServiceWithDB("postgres", dsn)
	if err != nil {
		t.Skipf("wallet DB not reachable: %v", err)
	}
	t.Cleanup(func() { _ = svc.DB().Close() })

	userID := fmt.Sprintf("u-summary-db-%d", time.Now().UnixNano())
	cleanup := func() {
		_, _ = svc.DB().ExecContext(ctx, `DELETE FROM wallet_reservations WHERE user_id = $1`, userID)
		_, _ = svc.DB().ExecContext(ctx, `DELETE FROM wallet_ledger WHERE user_id = $1`, userID)
		_, _ = svc.DB().ExecContext(ctx, `DELETE FROM wallet_balances WHERE user_id = $1`, userID)
	}
	t.Cleanup(cleanup)

	if _, err := svc.Credit(ctx, MutationRequest{
		UserID:         userID,
		AmountPoints:   10000,
		IdempotencyKey: "seed-" + userID,
		Reason:         "starter points",
	}); err != nil {
		t.Fatalf("seed balance: %v", err)
	}
	if _, err := svc.Hold(ctx, HoldRequest{
		UserID:        userID,
		AmountPoints:  3000,
		ReferenceType: "test_summary",
		ReferenceID:   "hold-" + userID,
		ExpiresIn:     time.Minute,
	}); err != nil {
		t.Fatalf("hold: %v", err)
	}

	summary := svc.BalanceSummary(ctx, userID)
	if summary.BalancePoints != 10000 || summary.AvailablePoints != 7000 || summary.ReservedPoints != 3000 {
		t.Fatalf("unexpected DB summary: %+v", summary)
	}
	if got := svc.Balance(ctx, userID); got != summary.BalancePoints {
		t.Fatalf("summary balance %d diverges from Balance %d", summary.BalancePoints, got)
	}
	if got := svc.AvailableBalance(ctx, userID); got != summary.AvailablePoints {
		t.Fatalf("summary available %d diverges from AvailableBalance %d", summary.AvailablePoints, got)
	}

	// Missing balance row reads as all zeros — same swallow-to-zero posture
	// as Balance/AvailableBalance.
	if empty := svc.BalanceSummary(ctx, userID+"-missing"); empty != (BalanceSummary{}) {
		t.Fatalf("expected zero summary for missing wallet row, got %+v", empty)
	}
}

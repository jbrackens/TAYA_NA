package wallet

import (
	"context"
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
		AmountCents:    1000,
		IdempotencyKey: "k1",
		Reason:         "deposit",
	})
	if err != nil {
		t.Fatalf("credit: %v", err)
	}
	if credit.BalanceCents != 1000 {
		t.Fatalf("expected balance 1000 after credit, got %d", credit.BalanceCents)
	}

	debit, err := svc.Debit(context.Background(), MutationRequest{
		UserID:         "u-1",
		AmountCents:    300,
		IdempotencyKey: "k2",
		Reason:         "bet placement",
	})
	if err != nil {
		t.Fatalf("debit: %v", err)
	}
	if debit.BalanceCents != 700 {
		t.Fatalf("expected balance 700 after debit, got %d", debit.BalanceCents)
	}
}

func TestCreditIsIdempotentByKey(t *testing.T) {
	svc := NewService()

	first, err := svc.Credit(context.Background(), MutationRequest{
		UserID:         "u-2",
		AmountCents:    500,
		IdempotencyKey: "same-key",
	})
	if err != nil {
		t.Fatalf("first credit: %v", err)
	}

	second, err := svc.Credit(context.Background(), MutationRequest{
		UserID:         "u-2",
		AmountCents:    500,
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
		AmountCents:    500,
		IdempotencyKey: "same-key",
		Reason:         "initial",
	})
	if err != nil {
		t.Fatalf("initial credit: %v", err)
	}

	_, err = svc.Credit(context.Background(), MutationRequest{
		UserID:         "u-2",
		AmountCents:    700,
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
		AmountCents: 500,
		Reason:      "starter_grant",
	}
	request := MutationRequest{
		AmountCents: 500,
		Reason:      " starter_grant ",
	}

	if !sameMutationReplay(existing, request) {
		t.Fatal("expected same mutation replay when only reason whitespace differs")
	}

	request.AmountCents = 700
	if sameMutationReplay(existing, request) {
		t.Fatal("expected changed amount to remain an idempotency conflict")
	}
}

func TestDebitFailsWhenInsufficientFunds(t *testing.T) {
	svc := NewService()

	_, err := svc.Debit(context.Background(), MutationRequest{
		UserID:         "u-3",
		AmountCents:    200,
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
		AmountCents:    250,
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
		AmountCents:    1200,
		IdempotencyKey: "credit-1",
	})
	if err != nil {
		t.Fatalf("credit: %v", err)
	}

	svc.now = func() time.Time { return base.Add(5 * time.Minute) }
	_, err = svc.Debit(context.Background(), MutationRequest{
		UserID:         "u-recon-1",
		AmountCents:    300,
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
		AmountCents:    1000,
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

package wallet

import (
	"path/filepath"
	"testing"
	"time"
)

func TestCreditAndDebitFlow(t *testing.T) {
	svc := NewService()

	credit, err := svc.Credit(MutationRequest{
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

	debit, err := svc.Debit(MutationRequest{
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

	first, err := svc.Credit(MutationRequest{
		UserID:         "u-2",
		AmountCents:    500,
		IdempotencyKey: "same-key",
	})
	if err != nil {
		t.Fatalf("first credit: %v", err)
	}

	second, err := svc.Credit(MutationRequest{
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
	if svc.Balance("u-2") != 500 {
		t.Fatalf("expected balance to remain 500 after idempotent replay")
	}
}

func TestIdempotencyKeyConflictReturnsError(t *testing.T) {
	svc := NewService()

	_, err := svc.Credit(MutationRequest{
		UserID:         "u-2",
		AmountCents:    500,
		IdempotencyKey: "same-key",
		Reason:         "initial",
	})
	if err != nil {
		t.Fatalf("initial credit: %v", err)
	}

	_, err = svc.Credit(MutationRequest{
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

func TestDebitFailsWhenInsufficientFunds(t *testing.T) {
	svc := NewService()

	_, err := svc.Debit(MutationRequest{
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
	_, err := first.Credit(MutationRequest{
		UserID:         "u-4",
		AmountCents:    250,
		IdempotencyKey: "credit-1",
		Reason:         "seed",
	})
	if err != nil {
		t.Fatalf("credit with persisted service: %v", err)
	}

	second := NewServiceWithPath(path)
	if got := second.Balance("u-4"); got != 250 {
		t.Fatalf("expected persisted balance 250, got %d", got)
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

	_, err := svc.Credit(MutationRequest{
		UserID:         "u-recon-1",
		AmountCents:    1200,
		IdempotencyKey: "credit-1",
	})
	if err != nil {
		t.Fatalf("credit: %v", err)
	}

	svc.now = func() time.Time { return base.Add(5 * time.Minute) }
	_, err = svc.Debit(MutationRequest{
		UserID:         "u-recon-1",
		AmountCents:    300,
		IdempotencyKey: "debit-1",
	})
	if err != nil {
		t.Fatalf("debit: %v", err)
	}

	summary, err := svc.ReconciliationSummary(nil, nil)
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
	_, err := svc.Credit(MutationRequest{
		UserID:         "u-correction-1",
		AmountCents:    1000,
		IdempotencyKey: "seed-correction-1",
	})
	if err != nil {
		t.Fatalf("seed balance: %v", err)
	}

	task, err := svc.CreateManualCorrectionTask("u-correction-1", "manual review requested", "operator requested check", 250)
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

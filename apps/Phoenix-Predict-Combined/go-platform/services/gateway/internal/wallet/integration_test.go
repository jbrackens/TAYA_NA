package wallet

import (
	"sync"
	"testing"
	"time"
)

// TestCreditDebitIdempotency verifies that replayed mutations return the same
// result without applying the mutation twice.
func TestCreditDebitIdempotency(t *testing.T) {
	svc := NewService()

	// Seed balance
	entry1, err := svc.Credit(MutationRequest{
		UserID:         "user-1",
		AmountCents:    10000,
		IdempotencyKey: "seed-1",
		Reason:         "initial deposit",
	})
	if err != nil {
		t.Fatalf("credit failed: %v", err)
	}
	if entry1.BalanceCents != 10000 {
		t.Fatalf("expected balance 10000, got %d", entry1.BalanceCents)
	}

	// Replay same credit — should return same entry
	entry2, err := svc.Credit(MutationRequest{
		UserID:         "user-1",
		AmountCents:    10000,
		IdempotencyKey: "seed-1",
		Reason:         "initial deposit",
	})
	if err != nil {
		t.Fatalf("idempotent credit failed: %v", err)
	}
	if entry2.EntryID != entry1.EntryID {
		t.Errorf("expected same entry ID on replay, got %s vs %s", entry1.EntryID, entry2.EntryID)
	}

	// Balance should still be 10000 (not 20000)
	if svc.Balance("user-1") != 10000 {
		t.Errorf("balance should be 10000 after idempotent replay, got %d", svc.Balance("user-1"))
	}
}

// TestDebitInsufficientFunds verifies that debits exceeding balance are rejected.
func TestDebitInsufficientFunds(t *testing.T) {
	svc := NewService()

	// Seed 5000
	_, err := svc.Credit(MutationRequest{
		UserID:         "user-2",
		AmountCents:    5000,
		IdempotencyKey: "seed-2",
		Reason:         "deposit",
	})
	if err != nil {
		t.Fatalf("credit failed: %v", err)
	}

	// Debit 6000 — should fail
	_, err = svc.Debit(MutationRequest{
		UserID:         "user-2",
		AmountCents:    6000,
		IdempotencyKey: "over-debit",
		Reason:         "bet",
	})
	if err != ErrInsufficientFunds {
		t.Errorf("expected ErrInsufficientFunds, got %v", err)
	}

	// Balance unchanged
	if svc.Balance("user-2") != 5000 {
		t.Errorf("balance should be 5000 after failed debit, got %d", svc.Balance("user-2"))
	}
}

// TestConcurrentDebitsOnSameBalance verifies that concurrent debit attempts
// on the same balance do not cause overdraft. With a balance of 10000 and
// 10 concurrent debits of 10000 each, exactly 1 should succeed.
func TestConcurrentDebitsOnSameBalance(t *testing.T) {
	svc := NewService()

	// Seed 10000
	_, err := svc.Credit(MutationRequest{
		UserID:         "user-concurrent",
		AmountCents:    10000,
		IdempotencyKey: "seed-concurrent",
		Reason:         "deposit",
	})
	if err != nil {
		t.Fatalf("credit failed: %v", err)
	}

	// 10 concurrent debit attempts of 10000 each
	const workers = 10
	var wg sync.WaitGroup
	successes := make(chan int, workers)

	for i := 0; i < workers; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			_, err := svc.Debit(MutationRequest{
				UserID:         "user-concurrent",
				AmountCents:    10000,
				IdempotencyKey: time.Now().String() + string(rune(idx+'A')),
				Reason:         "concurrent bet",
			})
			if err == nil {
				successes <- idx
			}
		}(i)
	}

	wg.Wait()
	close(successes)

	successCount := 0
	for range successes {
		successCount++
	}

	if successCount != 1 {
		t.Errorf("expected exactly 1 successful debit, got %d", successCount)
	}

	finalBalance := svc.Balance("user-concurrent")
	if finalBalance != 0 {
		t.Errorf("expected final balance 0, got %d", finalBalance)
	}
}

// TestIdempotencyConflictDetection verifies that replaying a mutation with
// different parameters is rejected.
func TestIdempotencyConflictDetection(t *testing.T) {
	svc := NewService()

	_, err := svc.Credit(MutationRequest{
		UserID:         "user-conflict",
		AmountCents:    5000,
		IdempotencyKey: "deposit-1",
		Reason:         "first deposit",
	})
	if err != nil {
		t.Fatalf("credit failed: %v", err)
	}

	// Replay with different amount — should be rejected
	_, err = svc.Credit(MutationRequest{
		UserID:         "user-conflict",
		AmountCents:    7000, // different amount!
		IdempotencyKey: "deposit-1",
		Reason:         "first deposit",
	})
	if err != ErrIdempotencyConflict {
		t.Errorf("expected ErrIdempotencyConflict, got %v", err)
	}
}

// TestReconciliationSummary verifies the reconciliation calculation.
func TestReconciliationSummary(t *testing.T) {
	svc := NewService()

	_, _ = svc.Credit(MutationRequest{UserID: "u-a", AmountCents: 10000, IdempotencyKey: "c1", Reason: "deposit"})
	_, _ = svc.Credit(MutationRequest{UserID: "u-b", AmountCents: 5000, IdempotencyKey: "c2", Reason: "deposit"})
	_, _ = svc.Debit(MutationRequest{UserID: "u-a", AmountCents: 3000, IdempotencyKey: "d1", Reason: "bet"})

	summary, err := svc.ReconciliationSummary(nil, nil)
	if err != nil {
		t.Fatalf("reconciliation failed: %v", err)
	}

	if summary.TotalCredits != 15000 {
		t.Errorf("expected total credits 15000, got %d", summary.TotalCredits)
	}
	if summary.TotalDebits != 3000 {
		t.Errorf("expected total debits 3000, got %d", summary.TotalDebits)
	}
	if summary.NetMovement != 12000 {
		t.Errorf("expected net movement 12000, got %d", summary.NetMovement)
	}
	if summary.DistinctUserIDs != 2 {
		t.Errorf("expected 2 distinct users, got %d", summary.DistinctUserIDs)
	}
	if summary.EntryCount != 3 {
		t.Errorf("expected 3 entries, got %d", summary.EntryCount)
	}
}

// TestCorrectionTaskScanDetectsNegativeBalance verifies that the wallet scanner
// detects negative balance anomalies.
func TestCorrectionTaskScanDetectsNegativeBalance(t *testing.T) {
	svc := NewService()

	// Manually set a negative balance (simulates a bug)
	svc.mu.Lock()
	svc.balances["user-negative"] = -500
	svc.mu.Unlock()

	tasks, err := svc.ScanCorrectionTasks()
	if err != nil {
		t.Fatalf("scan failed: %v", err)
	}

	found := false
	for _, task := range tasks {
		if task.UserID == "user-negative" && task.Type == "negative_balance" {
			found = true
			if task.SuggestedAdjustmentCents != 500 {
				t.Errorf("expected suggested adjustment 500, got %d", task.SuggestedAdjustmentCents)
			}
		}
	}
	if !found {
		t.Error("expected negative_balance correction task not found")
	}
}

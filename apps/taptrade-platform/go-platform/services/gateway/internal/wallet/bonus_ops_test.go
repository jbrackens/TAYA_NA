package wallet

import (
	"context"
	"testing"
)

func TestDrawdownDebit_MemoryMode_FullFromReal(t *testing.T) {
	svc := NewService()

	// Seed balance
	_, err := svc.Credit(context.Background(), MutationRequest{
		UserID: "u-dd1", AmountPoints: 1000, IdempotencyKey: "seed1", Reason: "deposit",
	})
	if err != nil {
		t.Fatalf("credit: %v", err)
	}

	result, err := svc.DrawdownDebit(context.Background(), DrawdownRequest{
		UserID: "u-dd1", AmountPoints: 400, IdempotencyKey: "dd1", Reason: "bet",
	})
	if err != nil {
		t.Fatalf("drawdown: %v", err)
	}
	if result.TotalDebitPoints != 400 {
		t.Fatalf("expected total 400, got %d", result.TotalDebitPoints)
	}
	if result.RealDebitPoints != 400 {
		t.Fatalf("expected real 400, got %d", result.RealDebitPoints)
	}
	// Memory mode doesn't track bonus separately
	if result.BonusDebitPoints != 0 {
		t.Fatalf("expected bonus 0, got %d", result.BonusDebitPoints)
	}
	if len(result.LedgerEntries) != 1 {
		t.Fatalf("expected 1 ledger entry, got %d", len(result.LedgerEntries))
	}
}

func TestDrawdownDebit_InsufficientFunds(t *testing.T) {
	svc := NewService()

	_, err := svc.Credit(context.Background(), MutationRequest{
		UserID: "u-dd2", AmountPoints: 100, IdempotencyKey: "seed2", Reason: "deposit",
	})
	if err != nil {
		t.Fatalf("credit: %v", err)
	}

	_, err = svc.DrawdownDebit(context.Background(), DrawdownRequest{
		UserID: "u-dd2", AmountPoints: 500, IdempotencyKey: "dd2", Reason: "bet",
	})
	if err == nil {
		t.Fatal("expected insufficient funds error")
	}
}

func TestDrawdownDebit_InvalidRequest(t *testing.T) {
	svc := NewService()

	// Missing user
	_, err := svc.DrawdownDebit(context.Background(), DrawdownRequest{
		AmountPoints: 100, IdempotencyKey: "dd3",
	})
	if err == nil {
		t.Fatal("expected error for missing user")
	}

	// Zero amount
	_, err = svc.DrawdownDebit(context.Background(), DrawdownRequest{
		UserID: "u-dd3", AmountPoints: 0, IdempotencyKey: "dd4",
	})
	if err == nil {
		t.Fatal("expected error for zero amount")
	}

	// Missing idempotency key
	_, err = svc.DrawdownDebit(context.Background(), DrawdownRequest{
		UserID: "u-dd3", AmountPoints: 100,
	})
	if err == nil {
		t.Fatal("expected error for missing idempotency key")
	}
}

func TestDrawdownDebit_Idempotent(t *testing.T) {
	svc := NewService()

	_, err := svc.Credit(context.Background(), MutationRequest{
		UserID: "u-dd4", AmountPoints: 1000, IdempotencyKey: "seed4", Reason: "deposit",
	})
	if err != nil {
		t.Fatalf("credit: %v", err)
	}

	first, err := svc.DrawdownDebit(context.Background(), DrawdownRequest{
		UserID: "u-dd4", AmountPoints: 300, IdempotencyKey: "dd-idemp", Reason: "bet",
	})
	if err != nil {
		t.Fatalf("first drawdown: %v", err)
	}

	second, err := svc.DrawdownDebit(context.Background(), DrawdownRequest{
		UserID: "u-dd4", AmountPoints: 300, IdempotencyKey: "dd-idemp", Reason: "bet",
	})
	if err != nil {
		t.Fatalf("second drawdown: %v", err)
	}

	// Should return same result (idempotent via underlying Debit)
	if first.TotalDebitPoints != second.TotalDebitPoints {
		t.Fatalf("idempotent drawdown returned different totals: %d vs %d",
			first.TotalDebitPoints, second.TotalDebitPoints)
	}

	// Balance should only be debited once
	balance := svc.Balance(context.Background(), "u-dd4")
	if balance != 700 {
		t.Fatalf("expected balance 700 after idempotent drawdown, got %d", balance)
	}
}

func TestForfeitBonus_MemoryMode_NoOp(t *testing.T) {
	svc := NewService()

	// In memory mode, ForfeitBonus is a no-op (returns nil)
	_, err := svc.ForfeitBonus(context.Background(), "u-forfeit", 500, "test reason", "forfeit-key-1")
	if err != nil {
		t.Fatalf("forfeit should be no-op in memory mode, got: %v", err)
	}
}

func TestConvertBonusToReal_MemoryMode_NoOp(t *testing.T) {
	svc := NewService()

	// In memory mode, ConvertBonusToReal is a no-op
	_, err := svc.ConvertBonusToReal(context.Background(), "u-convert", 500, "convert-key-1")
	if err != nil {
		t.Fatalf("convert should be no-op in memory mode, got: %v", err)
	}
}

func TestDebitBonus_MemoryMode_FallsBackToRegularDebit(t *testing.T) {
	svc := NewService()

	// Seed balance
	_, err := svc.Credit(context.Background(), MutationRequest{
		UserID: "u-db1", AmountPoints: 1000, IdempotencyKey: "seed-db1", Reason: "deposit",
	})
	if err != nil {
		t.Fatalf("credit: %v", err)
	}

	// In memory mode, DebitBonus falls back to regular debit
	entry, err := svc.DebitBonus(context.Background(), MutationRequest{
		UserID: "u-db1", AmountPoints: 300, IdempotencyKey: "db1", Reason: "bonus debit",
	})
	if err != nil {
		t.Fatalf("debit bonus: %v", err)
	}
	if entry.BalancePoints != 700 {
		t.Fatalf("expected balance 700 after bonus debit, got %d", entry.BalancePoints)
	}
}

func TestBalanceWithBreakdown_MemoryMode(t *testing.T) {
	svc := NewService()

	_, err := svc.Credit(context.Background(), MutationRequest{
		UserID: "u-bb1", AmountPoints: 500, IdempotencyKey: "seed-bb1", Reason: "deposit",
	})
	if err != nil {
		t.Fatalf("credit: %v", err)
	}

	breakdown := svc.BalanceWithBreakdown(context.Background(), "u-bb1")
	if breakdown.RealMoneyPoints != 500 {
		t.Fatalf("expected real 500, got %d", breakdown.RealMoneyPoints)
	}
	if breakdown.BonusFundPoints != 0 {
		t.Fatalf("expected bonus 0 in memory mode, got %d", breakdown.BonusFundPoints)
	}
	if breakdown.TotalPoints != 500 {
		t.Fatalf("expected total 500, got %d", breakdown.TotalPoints)
	}
}

func TestMin64(t *testing.T) {
	if min64(5, 10) != 5 {
		t.Fatal("min64(5,10) should be 5")
	}
	if min64(10, 5) != 5 {
		t.Fatal("min64(10,5) should be 5")
	}
	if min64(5, 5) != 5 {
		t.Fatal("min64(5,5) should be 5")
	}
}

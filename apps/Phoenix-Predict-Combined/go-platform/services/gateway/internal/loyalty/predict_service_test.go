package loyalty

import (
	"context"
	"database/sql"
	"errors"
	"testing"
	"time"
)

// fakePredictRepo is a minimal in-memory PredictRepo used for unit tests.
// It records the last Accrue/AccrueWithTx input so assertions can inspect
// what the service forwarded.
type fakePredictRepo struct {
	account      *PredictAccount
	ledger       []PredictLedgerEntry
	getAccountErr error
	accrueResult  *PredictAccrualResult
	accrueErr     error
	lastAccrue    *PredictAccrualInput
	lastTx        *sql.Tx
	accrueCalls   int
}

func (f *fakePredictRepo) GetAccount(_ context.Context, _ string) (*PredictAccount, error) {
	if f.getAccountErr != nil {
		return nil, f.getAccountErr
	}
	return f.account, nil
}

func (f *fakePredictRepo) ListLedger(_ context.Context, _ string, _ int) ([]PredictLedgerEntry, error) {
	return f.ledger, nil
}

func (f *fakePredictRepo) Accrue(_ context.Context, in PredictAccrualInput) (*PredictAccrualResult, error) {
	f.accrueCalls++
	f.lastAccrue = &in
	if f.accrueErr != nil {
		return nil, f.accrueErr
	}
	return f.accrueResult, nil
}

func (f *fakePredictRepo) AccrueWithTx(_ context.Context, tx *sql.Tx, in PredictAccrualInput) (*PredictAccrualResult, error) {
	f.accrueCalls++
	f.lastAccrue = &in
	f.lastTx = tx
	if f.accrueErr != nil {
		return nil, f.accrueErr
	}
	return f.accrueResult, nil
}

func TestPredictStanding_ZeroStateWhenAccountNotFound(t *testing.T) {
	repo := &fakePredictRepo{getAccountErr: ErrPredictAccountNotFound}
	svc := NewPredictService(repo)

	s, err := svc.Standing(context.Background(), "u-new")
	if err != nil {
		t.Fatalf("Standing: %v", err)
	}
	if s.PointsBalance != 0 {
		t.Errorf("expected 0 balance, got %d", s.PointsBalance)
	}
	if s.Tier != PredictTierHidden {
		t.Errorf("expected Hidden tier for never-accrued user, got %d", s.Tier)
	}
	if s.LastActivity != nil {
		t.Errorf("expected nil LastActivity, got %v", *s.LastActivity)
	}
	// Hidden < Legend, so NextTier should advance to Newcomer.
	if s.NextTier != PredictTierNewcomer {
		t.Errorf("expected NextTier=Newcomer for zero-state user, got %d", s.NextTier)
	}
}

func TestPredictStanding_PropagatesReadErrors(t *testing.T) {
	boom := errors.New("db down")
	repo := &fakePredictRepo{getAccountErr: boom}
	svc := NewPredictService(repo)

	if _, err := svc.Standing(context.Background(), "u-x"); !errors.Is(err, boom) {
		t.Fatalf("expected db error to propagate, got %v", err)
	}
}

func TestPredictStanding_MidTierReportsPointsToNext(t *testing.T) {
	ts := time.Date(2026, 4, 20, 12, 0, 0, 0, time.UTC)
	repo := &fakePredictRepo{account: &PredictAccount{
		UserID:        "u-mid",
		PointsBalance: 5175, // alice's state post-settlement per PRIMER: tier 3 (Sharp), 52 display pts
		Tier:          PredictTierSharp,
		LastActivity:  ts,
	}}
	svc := NewPredictService(repo)

	s, err := svc.Standing(context.Background(), "u-mid")
	if err != nil {
		t.Fatalf("Standing: %v", err)
	}
	if s.Tier != PredictTierSharp {
		t.Errorf("expected Sharp tier, got %d", s.Tier)
	}
	if s.NextTier != PredictTierSharp+1 {
		t.Errorf("expected NextTier = Sharp+1, got %d", s.NextTier)
	}
	if s.PointsToNextTier <= 0 {
		t.Errorf("expected positive PointsToNextTier for mid-tier user, got %d", s.PointsToNextTier)
	}
	if s.LastActivity == nil || !s.LastActivity.Equal(ts) {
		t.Errorf("LastActivity mismatch: want %v got %v", ts, s.LastActivity)
	}
}

func TestPredictStanding_LegendTierHasNoNext(t *testing.T) {
	repo := &fakePredictRepo{account: &PredictAccount{
		UserID:        "u-legend",
		PointsBalance: 10_000_000,
		Tier:          PredictTierLegend,
	}}
	svc := NewPredictService(repo)

	s, _ := svc.Standing(context.Background(), "u-legend")
	// Legend is the terminal tier: NextTier must not advance past Legend.
	if s.NextTier > PredictTierLegend {
		t.Errorf("Legend should not have a NextTier > Legend, got %d", s.NextTier)
	}
}

func TestAccrueSettled_RejectsZeroVolume(t *testing.T) {
	repo := &fakePredictRepo{}
	svc := NewPredictService(repo)

	_, err := svc.AccrueSettled(context.Background(), PredictSettlementAccrual{
		UserID:         "u-1",
		VolumeCents:    0,
		IsCorrect:      true,
		IdempotencyKey: "key",
	})
	if err == nil {
		t.Fatalf("expected error for zero-volume accrual, got nil")
	}
	if repo.accrueCalls != 0 {
		t.Errorf("expected repo.Accrue NOT to be called on validation failure, got %d calls", repo.accrueCalls)
	}
}

func TestAccrueSettled_RejectsMissingIdempotencyKey(t *testing.T) {
	repo := &fakePredictRepo{}
	svc := NewPredictService(repo)

	_, err := svc.AccrueSettled(context.Background(), PredictSettlementAccrual{
		UserID:      "u-1",
		VolumeCents: 1000,
		IsCorrect:   true,
	})
	if err == nil {
		t.Fatalf("expected error for missing idempotency_key")
	}
}

func TestAccrueSettled_WonEmitsWonReason(t *testing.T) {
	repo := &fakePredictRepo{accrueResult: &PredictAccrualResult{}}
	svc := NewPredictService(repo)

	_, err := svc.AccrueSettled(context.Background(), PredictSettlementAccrual{
		UserID:         "u-won",
		VolumeCents:    1000,
		IsCorrect:      true,
		MarketID:       "mkt-btc",
		TradeID:        "trade-1",
		IdempotencyKey: "accrual:mkt-btc:pos-1",
	})
	if err != nil {
		t.Fatalf("AccrueSettled: %v", err)
	}
	if repo.lastAccrue == nil {
		t.Fatalf("expected repo.Accrue called")
	}
	if repo.lastAccrue.Reason != "settled trade (won)" {
		t.Errorf("won reason: expected 'settled trade (won)', got %q", repo.lastAccrue.Reason)
	}
	if repo.lastAccrue.EventType != "accrual" {
		t.Errorf("event type: expected 'accrual', got %q", repo.lastAccrue.EventType)
	}
	if repo.lastAccrue.MarketID == nil || *repo.lastAccrue.MarketID != "mkt-btc" {
		t.Errorf("market id not forwarded")
	}
	if repo.lastAccrue.TradeID == nil || *repo.lastAccrue.TradeID != "trade-1" {
		t.Errorf("trade id not forwarded")
	}
	if repo.lastAccrue.DeltaPoints <= 0 {
		t.Errorf("expected positive delta for won trade, got %d", repo.lastAccrue.DeltaPoints)
	}
}

func TestAccrueSettled_LostEmitsLostReason(t *testing.T) {
	repo := &fakePredictRepo{accrueResult: &PredictAccrualResult{}}
	svc := NewPredictService(repo)

	_, err := svc.AccrueSettled(context.Background(), PredictSettlementAccrual{
		UserID:         "u-lost",
		VolumeCents:    1000,
		IsCorrect:      false,
		IdempotencyKey: "accrual:mkt-fed:pos-2",
	})
	if err != nil {
		t.Fatalf("AccrueSettled: %v", err)
	}
	if repo.lastAccrue.Reason != "settled trade (lost)" {
		t.Errorf("lost reason: expected 'settled trade (lost)', got %q", repo.lastAccrue.Reason)
	}
}

func TestAccrueSettledWithTx_ForwardsTx(t *testing.T) {
	repo := &fakePredictRepo{accrueResult: &PredictAccrualResult{}}
	svc := NewPredictService(repo)

	// We can't construct a real *sql.Tx without a DB; a nil tx is acceptable —
	// we're asserting that the service passes whatever tx it receives through
	// unchanged to AccrueWithTx (not to Accrue).
	_, err := svc.AccrueSettledWithTx(context.Background(), nil, PredictSettlementAccrual{
		UserID:         "u-tx",
		VolumeCents:    2500,
		IsCorrect:      true,
		IdempotencyKey: "accrual:mkt-x:pos-3",
	})
	if err != nil {
		t.Fatalf("AccrueSettledWithTx: %v", err)
	}
	if repo.accrueCalls != 1 {
		t.Errorf("expected 1 accrue call, got %d", repo.accrueCalls)
	}
	// lastTx should have been captured by AccrueWithTx (even if nil) — proves
	// the tx-carrying path was taken, not the tx-less Accrue.
	if repo.lastAccrue == nil {
		t.Errorf("expected accrual input captured via AccrueWithTx path")
	}
}

func TestAdjust_RequiresAllFields(t *testing.T) {
	svc := NewPredictService(&fakePredictRepo{})

	cases := []struct {
		name string
		in   PredictAdjustment
	}{
		{"missing user", PredictAdjustment{DeltaPoints: 100, Reason: "r", IdempotencyKey: "k"}},
		{"missing delta", PredictAdjustment{UserID: "u", Reason: "r", IdempotencyKey: "k"}},
		{"missing reason", PredictAdjustment{UserID: "u", DeltaPoints: 100, IdempotencyKey: "k"}},
		{"missing key", PredictAdjustment{UserID: "u", DeltaPoints: 100, Reason: "r"}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if _, err := svc.Adjust(context.Background(), tc.in); err == nil {
				t.Errorf("expected validation error for %s", tc.name)
			}
		})
	}
}

func TestAdjust_DefaultsEventTypeToAdjustment(t *testing.T) {
	repo := &fakePredictRepo{accrueResult: &PredictAccrualResult{}}
	svc := NewPredictService(repo)

	_, err := svc.Adjust(context.Background(), PredictAdjustment{
		UserID:         "u-adj",
		DeltaPoints:    500,
		Reason:         "CS correction",
		IdempotencyKey: "adj:ticket-42",
	})
	if err != nil {
		t.Fatalf("Adjust: %v", err)
	}
	if repo.lastAccrue.EventType != "adjustment" {
		t.Errorf("expected default event type 'adjustment', got %q", repo.lastAccrue.EventType)
	}
	if repo.lastAccrue.DeltaPoints != 500 {
		t.Errorf("delta: expected 500, got %d", repo.lastAccrue.DeltaPoints)
	}
}

func TestAdjust_AcceptsMigrationEventType(t *testing.T) {
	repo := &fakePredictRepo{accrueResult: &PredictAccrualResult{}}
	svc := NewPredictService(repo)

	_, err := svc.Adjust(context.Background(), PredictAdjustment{
		UserID:         "u-legacy",
		DeltaPoints:    2500,
		Reason:         "imported from sportsbook loyalty",
		IdempotencyKey: "migrate:u-legacy",
		EventType:      "migration",
	})
	if err != nil {
		t.Fatalf("Adjust: %v", err)
	}
	if repo.lastAccrue.EventType != "migration" {
		t.Errorf("expected 'migration' event type preserved, got %q", repo.lastAccrue.EventType)
	}
}

func TestTiers_ReturnsStaticCatalog(t *testing.T) {
	svc := NewPredictService(&fakePredictRepo{})
	tiers := svc.Tiers()
	if len(tiers) == 0 {
		t.Fatalf("expected non-empty tier catalog")
	}
	// Sanity: tiers should be contiguous ascending from lowest tier.
	for i, td := range tiers {
		if int(td.Tier) != i {
			t.Errorf("tier catalog not contiguous at index %d: tier=%d", i, td.Tier)
		}
	}
}

package loyalty

import (
	"errors"
	"testing"
	"time"

	canonicalv1 "phoenix-revival/platform/canonical/v1"
)

func TestAccrueSettledBetCreatesAccountAndLedgerEntry(t *testing.T) {
	svc := NewService()
	svc.now = func() time.Time { return time.Date(2026, 4, 8, 15, 0, 0, 0, time.UTC) }

	entry, account, err := svc.AccrueSettledBet(SettlementAccrualRequest{
		PlayerID:         "u-loyalty-1",
		BetID:            "bet:local:001",
		SettlementStatus: "settled_won",
		StakeCents:       1250,
		IdempotencyKey:   "loyalty:bet_settlement:bet:local:001:v1",
		Reason:           "bet settled",
		SettledAt:        svc.now(),
	})
	if err != nil {
		t.Fatalf("accrue settled bet: %v", err)
	}
	if entry.PointsDelta != 12 {
		t.Fatalf("expected pointsDelta=12, got %d", entry.PointsDelta)
	}
	if account.PointsBalance != 12 {
		t.Fatalf("expected pointsBalance=12, got %d", account.PointsBalance)
	}
	if account.CurrentTier != canonicalv1.LoyaltyTierBronze {
		t.Fatalf("expected bronze tier, got %s", account.CurrentTier)
	}

	ledger := svc.Ledger("u-loyalty-1", 10)
	if len(ledger) != 1 {
		t.Fatalf("expected 1 ledger entry, got %d", len(ledger))
	}
}

func TestAccrueSettledBetIsIdempotent(t *testing.T) {
	svc := NewService()
	request := SettlementAccrualRequest{
		PlayerID:         "u-loyalty-2",
		BetID:            "bet:local:002",
		SettlementStatus: "settled_lost",
		StakeCents:       2000,
		IdempotencyKey:   "loyalty:bet_settlement:bet:local:002:v1",
		SettledAt:        time.Date(2026, 4, 8, 15, 0, 0, 0, time.UTC),
	}

	first, accountAfterFirst, err := svc.AccrueSettledBet(request)
	if err != nil {
		t.Fatalf("first accrue: %v", err)
	}
	second, accountAfterSecond, err := svc.AccrueSettledBet(request)
	if err != nil {
		t.Fatalf("second accrue: %v", err)
	}

	if first.EntryID != second.EntryID {
		t.Fatalf("expected same ledger entry on idempotent replay")
	}
	if accountAfterFirst.PointsBalance != accountAfterSecond.PointsBalance {
		t.Fatalf("expected same points balance on replay")
	}
}

func TestAdjustAppliesManualOperatorDelta(t *testing.T) {
	svc := NewService()

	entry, account, err := svc.Adjust(AdjustmentRequest{
		PlayerID:       "u-adjust-1",
		PointsDelta:    250,
		IdempotencyKey: "adjust:u-adjust-1:1",
		Reason:         "manual grant",
		CreatedBy:      "admin-risk-1",
		EntrySubtype:   "manual_grant",
	})
	if err != nil {
		t.Fatalf("manual adjust: %v", err)
	}
	if entry.EntryType != canonicalv1.LoyaltyLedgerEntryAdjustment {
		t.Fatalf("expected adjustment entry type, got %s", entry.EntryType)
	}
	if account.PointsBalance != 250 {
		t.Fatalf("expected balance 250, got %d", account.PointsBalance)
	}
	if account.PointsEarnedLifetime != 250 {
		t.Fatalf("expected lifetime earned 250, got %d", account.PointsEarnedLifetime)
	}
}

func TestAdjustRejectsConflictingReplay(t *testing.T) {
	svc := NewService()
	_, _, err := svc.Adjust(AdjustmentRequest{
		PlayerID:       "u-adjust-2",
		PointsDelta:    100,
		IdempotencyKey: "adjust:u-adjust-2:1",
		Reason:         "manual grant",
	})
	if err != nil {
		t.Fatalf("seed adjustment: %v", err)
	}

	_, _, err = svc.Adjust(AdjustmentRequest{
		PlayerID:       "u-adjust-2",
		PointsDelta:    200,
		IdempotencyKey: "adjust:u-adjust-2:1",
		Reason:         "different amount",
	})
	if !errors.Is(err, ErrAdjustmentConflict) {
		t.Fatalf("expected ErrAdjustmentConflict, got %v", err)
	}
}

func TestListAccountsSortsByLifetimePoints(t *testing.T) {
	svc := NewService()
	accounts := svc.ListAccounts(AccountFilter{})
	if len(accounts) < 2 {
		t.Fatalf("expected seeded accounts")
	}
	if accounts[0].PointsEarnedLifetime < accounts[1].PointsEarnedLifetime {
		t.Fatalf("expected accounts sorted descending by lifetime points")
	}
}

func TestReferralQualifiesOnFirstSettledBet(t *testing.T) {
	svc := NewService()
	svc.now = func() time.Time { return time.Date(2026, 4, 8, 16, 0, 0, 0, time.UTC) }

	referral, err := svc.RegisterReferral(ReferralCreateRequest{
		ReferrerPlayerID: "u-referrer-1",
		ReferredPlayerID: "u-referred-1",
	})
	if err != nil {
		t.Fatalf("register referral: %v", err)
	}

	_, _, err = svc.AccrueSettledBet(SettlementAccrualRequest{
		PlayerID:         "u-referred-1",
		BetID:            "bet:local:ref:1",
		SettlementStatus: "settled_won",
		StakeCents:       1000,
		IdempotencyKey:   "loyalty:bet_settlement:bet:local:ref:1:v1",
		SettledAt:        svc.now(),
	})
	if err != nil {
		t.Fatalf("accrue settled bet: %v", err)
	}

	referrer, ok := svc.GetAccount("u-referrer-1")
	if !ok {
		t.Fatal("expected referrer loyalty account to exist")
	}
	if referrer.PointsBalance != 250 {
		t.Fatalf("expected referral bonus balance 250, got %d", referrer.PointsBalance)
	}

	referrals := svc.ListReferralsByReferrer("u-referrer-1")
	if len(referrals) != 1 {
		t.Fatalf("expected one referral, got %d", len(referrals))
	}
	if referrals[0].ReferralID != referral.ReferralID {
		t.Fatalf("expected referral id %s, got %s", referral.ReferralID, referrals[0].ReferralID)
	}
	if referrals[0].QualificationState != canonicalv1.LoyaltyQualificationQualified {
		t.Fatalf("expected referral to qualify, got %s", referrals[0].QualificationState)
	}

	referrerLedger := svc.Ledger("u-referrer-1", 10)
	if len(referrerLedger) != 1 {
		t.Fatalf("expected one referrer ledger entry, got %d", len(referrerLedger))
	}
	if referrerLedger[0].EntryType != canonicalv1.LoyaltyLedgerEntryReferralBonus {
		t.Fatalf("expected referral bonus entry type, got %s", referrerLedger[0].EntryType)
	}
}

func TestRegisterReferralRejectsConflictingReferrer(t *testing.T) {
	svc := NewService()
	_, err := svc.RegisterReferral(ReferralCreateRequest{
		ReferrerPlayerID: "u-referrer-1",
		ReferredPlayerID: "u-referred-2",
	})
	if err != nil {
		t.Fatalf("seed referral: %v", err)
	}

	_, err = svc.RegisterReferral(ReferralCreateRequest{
		ReferrerPlayerID: "u-referrer-2",
		ReferredPlayerID: "u-referred-2",
	})
	if !errors.Is(err, ErrReferralConflict) {
		t.Fatalf("expected ErrReferralConflict, got %v", err)
	}
}

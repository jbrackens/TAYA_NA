package v1

import (
	"encoding/json"
	"testing"
	"time"
)

func TestLoyaltyAccountJSONRoundTrip(t *testing.T) {
	now := time.Date(2026, time.April, 8, 12, 0, 0, 0, time.UTC)
	tierAssignedAt := now.Add(-24 * time.Hour)
	lastAccrualAt := now.Add(-2 * time.Hour)
	payload := LoyaltyAccount{
		AccountID:                "loyalty:local:001",
		PlayerID:                 "u-1",
		PointsBalance:            4200,
		PointsEarnedLifetime:     5800,
		PointsEarned7D:           350,
		PointsEarned30D:          900,
		PointsEarnedCurrentMonth: 700,
		CurrentTier:              LoyaltyTierGold,
		CurrentTierAssignedAt:    &tierAssignedAt,
		PointsToNextTier:         14200,
		NextTier:                 LoyaltyTierVIP,
		LastAccrualAt:            &lastAccrualAt,
		CreatedAt:                now.Add(-30 * 24 * time.Hour),
		UpdatedAt:                now,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("marshal payload: %v", err)
	}

	var decoded LoyaltyAccount
	if err := json.Unmarshal(body, &decoded); err != nil {
		t.Fatalf("unmarshal payload: %v", err)
	}

	if decoded.AccountID != payload.AccountID {
		t.Fatalf("expected accountId=%s, got %s", payload.AccountID, decoded.AccountID)
	}
	if decoded.CurrentTier != LoyaltyTierGold {
		t.Fatalf("expected currentTier=%s, got %s", LoyaltyTierGold, decoded.CurrentTier)
	}
	if decoded.PointsBalance != 4200 {
		t.Fatalf("expected pointsBalance=4200, got %d", decoded.PointsBalance)
	}
}

func TestLoyaltyLedgerEntryJSONRoundTrip(t *testing.T) {
	now := time.Date(2026, time.April, 8, 12, 15, 0, 0, time.UTC)
	payload := LoyaltyLedgerEntry{
		EntryID:      "ll:local:001",
		AccountID:    "loyalty:local:001",
		PlayerID:     "u-1",
		EntryType:    LoyaltyLedgerEntryAccrual,
		EntrySubtype: "settled_win",
		SourceType:   LoyaltyLedgerSourceBetSettlement,
		SourceID:     "bet:local:001",
		PointsDelta:  125,
		BalanceAfter: 4325,
		Metadata: map[string]string{
			"betId":        "bet:local:001",
			"settlementId": "settlement:local:001",
		},
		CreatedBy: "system",
		CreatedAt: now,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("marshal payload: %v", err)
	}

	var decoded LoyaltyLedgerEntry
	if err := json.Unmarshal(body, &decoded); err != nil {
		t.Fatalf("unmarshal payload: %v", err)
	}

	if decoded.EntryType != LoyaltyLedgerEntryAccrual {
		t.Fatalf("expected entryType=%s, got %s", LoyaltyLedgerEntryAccrual, decoded.EntryType)
	}
	if decoded.SourceType != LoyaltyLedgerSourceBetSettlement {
		t.Fatalf("expected sourceType=%s, got %s", LoyaltyLedgerSourceBetSettlement, decoded.SourceType)
	}
	if decoded.BalanceAfter != 4325 {
		t.Fatalf("expected balanceAfter=4325, got %d", decoded.BalanceAfter)
	}
}

func TestLoyaltyEntityConstants(t *testing.T) {
	if EntityLoyaltyAccount == "" {
		t.Fatal("expected loyalty account entity constant to be non-empty")
	}
	if string(EntityLoyaltyAccount) != "loyalty_account" {
		t.Fatalf("unexpected loyalty account entity value: %s", EntityLoyaltyAccount)
	}
	if EntityLoyaltyLedger == "" {
		t.Fatal("expected loyalty ledger entity constant to be non-empty")
	}
	if string(EntityLoyaltyLedger) != "loyalty_ledger_entry" {
		t.Fatalf("unexpected loyalty ledger entity value: %s", EntityLoyaltyLedger)
	}
}

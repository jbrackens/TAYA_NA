package riskintel

import (
	"testing"
	"time"

	"phoenix-revival/gateway/internal/bets"
	"phoenix-revival/gateway/internal/domain"
	"phoenix-revival/gateway/internal/wallet"
)

func TestRankMarketsReturnsOrderedScores(t *testing.T) {
	repository := domain.NewInMemoryReadRepository()
	service := NewService(repository, nil)
	service.now = func() time.Time {
		return time.Date(2026, 3, 5, 10, 0, 0, 0, time.UTC)
	}

	items, err := service.RankMarkets(RankingRequest{
		UserID: "u-1",
		Limit:  3,
	})
	if err != nil {
		t.Fatalf("rank markets: %v", err)
	}
	if len(items) == 0 {
		t.Fatalf("expected ranked markets")
	}
	if items[0].Rank != 1 {
		t.Fatalf("expected first rank to be 1, got %d", items[0].Rank)
	}
	if items[0].Score < items[len(items)-1].Score {
		t.Fatalf("expected descending ranking by score")
	}
}

func TestSuggestCombosReturnsEligibleSuggestions(t *testing.T) {
	repository := domain.NewInMemoryReadRepository()
	service := NewService(repository, nil)

	suggestions, err := service.SuggestCombos(ComboSuggestionRequest{
		UserID: "u-1",
		Limit:  3,
	})
	if err != nil {
		t.Fatalf("suggest combos: %v", err)
	}
	if len(suggestions) == 0 {
		t.Fatalf("expected at least one suggestion")
	}
	if len(suggestions[0].Legs) < 2 {
		t.Fatalf("expected multi-leg suggestion, got %+v", suggestions[0].Legs)
	}
	if !suggestions[0].Eligible {
		t.Fatalf("expected suggestion to be eligible")
	}
}

func TestRiskSegmentUsesOverrideWhenPresent(t *testing.T) {
	repository := domain.NewInMemoryReadRepository()
	walletService := wallet.NewService()
	betService := bets.NewService(repository, walletService)

	_, err := walletService.Credit(wallet.MutationRequest{
		UserID:         "u-risk-1",
		AmountCents:    5000,
		IdempotencyKey: "seed-risk-wallet-1",
	})
	if err != nil {
		t.Fatalf("seed wallet: %v", err)
	}
	_, err = betService.Place(bets.PlaceBetRequest{
		UserID:         "u-risk-1",
		MarketID:       "m:local:001",
		SelectionID:    "home",
		StakeCents:     500,
		Odds:           1.91,
		IdempotencyKey: "seed-risk-bet-1",
	})
	if err != nil {
		t.Fatalf("seed bet: %v", err)
	}

	service := NewService(repository, betService)
	override, err := service.SetRiskSegmentOverride("u-risk-1", SetOverrideRequest{
		SegmentID: "vip_manual",
		Reason:    "operator review",
		Operator:  "admin-risk-1",
	})
	if err != nil {
		t.Fatalf("set override: %v", err)
	}
	if override.SegmentID != "vip_manual" {
		t.Fatalf("expected override segment vip_manual, got %s", override.SegmentID)
	}

	profile, err := service.RiskSegment("u-risk-1")
	if err != nil {
		t.Fatalf("risk segment: %v", err)
	}
	if profile.SegmentID != "vip_manual" {
		t.Fatalf("expected manual segment override to apply, got %s", profile.SegmentID)
	}
	if !profile.HasManualOverride {
		t.Fatalf("expected manual override flag")
	}
	if profile.Override == nil || profile.Override.SetBy != "admin-risk-1" {
		t.Fatalf("expected override metadata in profile, got %+v", profile.Override)
	}
}

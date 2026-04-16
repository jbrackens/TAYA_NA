package bets

import (
	"errors"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"phoenix-revival/gateway/internal/domain"
	"phoenix-revival/gateway/internal/wallet"
)

func TestQuoteBetBuilderReturnsCombinedQuote(t *testing.T) {
	repository := domain.NewInMemoryReadRepository()
	walletService := wallet.NewService()
	service := NewService(repository, walletService)

	quote, err := service.QuoteBetBuilder(BetBuilderQuoteRequest{
		UserID:    "u-builder-1",
		RequestID: "builder-quote-1",
		Legs: []BetBuilderLegRequest{
			{MarketID: "m:local:001", SelectionID: "home"},
			{MarketID: "m:local:002", SelectionID: "over"},
		},
	})
	if err != nil {
		t.Fatalf("quote bet builder: %v", err)
	}
	if !quote.Combinable {
		t.Fatalf("expected combinable quote, got %+v", quote)
	}
	if quote.ComboType != "same_game_combo" {
		t.Fatalf("expected comboType same_game_combo, got %s", quote.ComboType)
	}
	if !strings.HasPrefix(quote.QuoteID, "bbq:") {
		t.Fatalf("expected quote id prefix bbq:, got %s", quote.QuoteID)
	}
	if !sameOdds(quote.CombinedOdds, 3.51) {
		t.Fatalf("expected combined odds 3.51, got %.6f", quote.CombinedOdds)
	}
	if len(quote.Legs) != 2 {
		t.Fatalf("expected 2 quote legs, got %d", len(quote.Legs))
	}
}

func TestQuoteBetBuilderRejectsDuplicateMarketLegs(t *testing.T) {
	repository := domain.NewInMemoryReadRepository()
	walletService := wallet.NewService()
	service := NewService(repository, walletService)

	_, err := service.QuoteBetBuilder(BetBuilderQuoteRequest{
		UserID:    "u-builder-2",
		RequestID: "builder-quote-2",
		Legs: []BetBuilderLegRequest{
			{MarketID: "m:local:001", SelectionID: "home"},
			{MarketID: "m:local:001", SelectionID: "home"},
		},
	})
	if err == nil {
		t.Fatal("expected duplicate-leg combinability error")
	}
	if !errors.Is(err, ErrSameGameComboDuplicateMarket) {
		t.Fatalf("expected ErrSameGameComboDuplicateMarket, got %v", err)
	}
}

func TestQuoteBetBuilderRejectsCrossFixtureLegs(t *testing.T) {
	repository := sameGameComboTestRepository{base: domain.NewInMemoryReadRepository()}
	walletService := wallet.NewService()
	service := NewService(repository, walletService)

	_, err := service.QuoteBetBuilder(BetBuilderQuoteRequest{
		UserID:    "u-builder-xfixture-1",
		RequestID: "builder-xfixture-1",
		Legs: []BetBuilderLegRequest{
			{MarketID: "m:local:001", SelectionID: "home"},
			{MarketID: "m:local:003", SelectionID: "yes"},
		},
	})
	if err == nil {
		t.Fatal("expected same-game cross-fixture rejection")
	}
	if !errors.Is(err, ErrSameGameComboFixtureMismatch) {
		t.Fatalf("expected ErrSameGameComboFixtureMismatch, got %v", err)
	}
}

func TestQuoteBetBuilderRejectsRequestedOddsDrift(t *testing.T) {
	repository := domain.NewInMemoryReadRepository()
	walletService := wallet.NewService()
	service := NewService(repository, walletService)

	_, err := service.QuoteBetBuilder(BetBuilderQuoteRequest{
		UserID:    "u-builder-3",
		RequestID: "builder-quote-3",
		Legs: []BetBuilderLegRequest{
			{MarketID: "m:local:001", SelectionID: "home", RequestedOdds: 1.9},
			{MarketID: "m:local:002", SelectionID: "over"},
		},
	})
	if err == nil {
		t.Fatal("expected requested odds mismatch to fail")
	}
	if !errors.Is(err, ErrOddsChanged) {
		t.Fatalf("expected ErrOddsChanged, got %v", err)
	}
}

func TestQuoteBetBuilderRejectsInvalidShape(t *testing.T) {
	repository := domain.NewInMemoryReadRepository()
	walletService := wallet.NewService()
	service := NewService(repository, walletService)

	_, err := service.QuoteBetBuilder(BetBuilderQuoteRequest{
		UserID:    "u-builder-4",
		RequestID: "builder-quote-4",
		Legs: []BetBuilderLegRequest{
			{MarketID: "m:local:001", SelectionID: "home"},
		},
	})
	if err == nil {
		t.Fatal("expected invalid builder request")
	}
	if !errors.Is(err, ErrInvalidBetBuilderRequest) {
		t.Fatalf("expected ErrInvalidBetBuilderRequest, got %v", err)
	}
}

func TestBetBuilderQuotePersistsToFile(t *testing.T) {
	repository := domain.NewInMemoryReadRepository()
	walletService := wallet.NewService()
	statePath := filepath.Join(t.TempDir(), "bets-builder-state.json")

	service := NewServiceWithPath(repository, walletService, statePath)
	quote, err := service.QuoteBetBuilder(BetBuilderQuoteRequest{
		UserID:    "u-builder-persist-1",
		RequestID: "builder-persist-1",
		Legs: []BetBuilderLegRequest{
			{MarketID: "m:local:001", SelectionID: "home"},
			{MarketID: "m:local:002", SelectionID: "over"},
		},
	})
	if err != nil {
		t.Fatalf("quote bet builder: %v", err)
	}

	reloaded := NewServiceWithPath(repository, walletService, statePath)
	loaded, err := reloaded.GetBetBuilderQuote(quote.QuoteID)
	if err != nil {
		t.Fatalf("get builder quote: %v", err)
	}
	if loaded.QuoteID != quote.QuoteID {
		t.Fatalf("expected quoteId %s, got %s", quote.QuoteID, loaded.QuoteID)
	}
	if loaded.Status != betBuilderQuoteStatusOpen {
		t.Fatalf("expected open quote status, got %s", loaded.Status)
	}
}

func TestAcceptBetBuilderQuotePlacesBetIdempotently(t *testing.T) {
	repository := domain.NewInMemoryReadRepository()
	walletService := wallet.NewService()
	_, _ = walletService.Credit(wallet.MutationRequest{UserID: "u-builder-accept-1", AmountCents: 5000, IdempotencyKey: "seed"})
	service := NewService(repository, walletService)

	quote, err := service.QuoteBetBuilder(BetBuilderQuoteRequest{
		UserID:    "u-builder-accept-1",
		RequestID: "builder-accept-quote-1",
		Legs: []BetBuilderLegRequest{
			{MarketID: "m:local:001", SelectionID: "home"},
			{MarketID: "m:local:002", SelectionID: "over"},
		},
	})
	if err != nil {
		t.Fatalf("quote bet builder: %v", err)
	}

	firstBet, firstQuote, err := service.AcceptBetBuilderQuote(BetBuilderAcceptRequest{
		QuoteID:    quote.QuoteID,
		UserID:     "u-builder-accept-1",
		RequestID:  "builder-accept-1",
		StakeCents: 700,
		Reason:     "placing combo",
	})
	if err != nil {
		t.Fatalf("accept builder quote: %v", err)
	}
	if firstBet.Status != statusPlaced {
		t.Fatalf("expected placed bet status, got %s", firstBet.Status)
	}
	if firstQuote.Status != betBuilderQuoteStatusAccepted {
		t.Fatalf("expected accepted quote status, got %s", firstQuote.Status)
	}
	if firstQuote.AcceptedBetID != firstBet.BetID {
		t.Fatalf("expected accepted bet %s, got %s", firstBet.BetID, firstQuote.AcceptedBetID)
	}
	if len(firstBet.Legs) != 2 {
		t.Fatalf("expected 2 bet legs, got %d", len(firstBet.Legs))
	}
	if firstBet.Legs[0].SelectionID != "home" || firstBet.Legs[1].SelectionID != "over" {
		t.Fatalf("unexpected builder legs %+v", firstBet.Legs)
	}

	secondBet, secondQuote, err := service.AcceptBetBuilderQuote(BetBuilderAcceptRequest{
		QuoteID:    quote.QuoteID,
		UserID:     "u-builder-accept-1",
		RequestID:  "builder-accept-2",
		StakeCents: 700,
	})
	if err != nil {
		t.Fatalf("repeat accept builder quote: %v", err)
	}
	if secondBet.BetID != firstBet.BetID {
		t.Fatalf("expected idempotent accepted bet %s, got %s", firstBet.BetID, secondBet.BetID)
	}
	if secondQuote.AcceptedBetID != firstBet.BetID {
		t.Fatalf("expected accepted quote to reference %s, got %s", firstBet.BetID, secondQuote.AcceptedBetID)
	}
	if balance := walletService.Balance("u-builder-accept-1"); balance != 4300 {
		t.Fatalf("expected single wallet debit to balance 4300, got %d", balance)
	}
}

func TestAcceptBetBuilderQuoteRejectsExpiredQuote(t *testing.T) {
	t.Setenv("BET_BUILDER_QUOTE_TTL_SECONDS", "1")

	repository := domain.NewInMemoryReadRepository()
	walletService := wallet.NewService()
	_, _ = walletService.Credit(wallet.MutationRequest{UserID: "u-builder-expired-1", AmountCents: 5000, IdempotencyKey: "seed"})
	service := NewService(repository, walletService)

	now := time.Date(2026, 3, 2, 12, 0, 0, 0, time.UTC)
	service.now = func() time.Time { return now }

	quote, err := service.QuoteBetBuilder(BetBuilderQuoteRequest{
		UserID:    "u-builder-expired-1",
		RequestID: "builder-expired-quote-1",
		Legs: []BetBuilderLegRequest{
			{MarketID: "m:local:001", SelectionID: "home"},
			{MarketID: "m:local:002", SelectionID: "over"},
		},
	})
	if err != nil {
		t.Fatalf("quote bet builder: %v", err)
	}

	now = now.Add(2 * time.Second)
	_, _, err = service.AcceptBetBuilderQuote(BetBuilderAcceptRequest{
		QuoteID:    quote.QuoteID,
		UserID:     "u-builder-expired-1",
		RequestID:  "builder-expired-accept-1",
		StakeCents: 500,
	})
	if err == nil {
		t.Fatal("expected expired quote rejection")
	}
	if !errors.Is(err, ErrBetBuilderQuoteExpired) {
		t.Fatalf("expected ErrBetBuilderQuoteExpired, got %v", err)
	}
}

func TestSettleBetBuilderBetWithMultiSelectionReference(t *testing.T) {
	repository := domain.NewInMemoryReadRepository()
	walletService := wallet.NewService()
	_, _ = walletService.Credit(wallet.MutationRequest{UserID: "u-builder-settle-1", AmountCents: 5000, IdempotencyKey: "seed"})
	service := NewService(repository, walletService)

	quote, err := service.QuoteBetBuilder(BetBuilderQuoteRequest{
		UserID:    "u-builder-settle-1",
		RequestID: "builder-settle-quote-1",
		Legs: []BetBuilderLegRequest{
			{MarketID: "m:local:001", SelectionID: "home"},
			{MarketID: "m:local:002", SelectionID: "over"},
		},
	})
	if err != nil {
		t.Fatalf("quote bet builder: %v", err)
	}

	placed, _, err := service.AcceptBetBuilderQuote(BetBuilderAcceptRequest{
		QuoteID:    quote.QuoteID,
		UserID:     "u-builder-settle-1",
		RequestID:  "builder-settle-accept-1",
		StakeCents: 500,
	})
	if err != nil {
		t.Fatalf("accept builder quote: %v", err)
	}

	settled, err := service.Settle(SettleBetRequest{
		BetID:              placed.BetID,
		WinningSelectionID: "over,home",
		Reason:             "final result",
	})
	if err != nil {
		t.Fatalf("settle builder bet: %v", err)
	}
	if settled.Status != statusSettledWon {
		t.Fatalf("expected status %s, got %s", statusSettledWon, settled.Status)
	}
	if settled.SettlementReference != "home,over" {
		t.Fatalf("expected normalized settlement reference home,over, got %s", settled.SettlementReference)
	}
	if settled.SettlementLedgerEntryID == "" {
		t.Fatal("expected settlement credit ledger entry for winning builder bet")
	}
}

func TestSettleBetBuilderBetRequiresMultiSelectionReference(t *testing.T) {
	repository := domain.NewInMemoryReadRepository()
	walletService := wallet.NewService()
	_, _ = walletService.Credit(wallet.MutationRequest{UserID: "u-builder-settle-2", AmountCents: 5000, IdempotencyKey: "seed"})
	service := NewService(repository, walletService)

	quote, err := service.QuoteBetBuilder(BetBuilderQuoteRequest{
		UserID:    "u-builder-settle-2",
		RequestID: "builder-settle-quote-2",
		Legs: []BetBuilderLegRequest{
			{MarketID: "m:local:001", SelectionID: "home"},
			{MarketID: "m:local:002", SelectionID: "over"},
		},
	})
	if err != nil {
		t.Fatalf("quote bet builder: %v", err)
	}

	placed, _, err := service.AcceptBetBuilderQuote(BetBuilderAcceptRequest{
		QuoteID:    quote.QuoteID,
		UserID:     "u-builder-settle-2",
		RequestID:  "builder-settle-accept-2",
		StakeCents: 500,
	})
	if err != nil {
		t.Fatalf("accept builder quote: %v", err)
	}

	_, err = service.Settle(SettleBetRequest{
		BetID:              placed.BetID,
		WinningSelectionID: "home",
	})
	if err == nil {
		t.Fatal("expected invalid settle request for multi-leg bet without multi-selection payload")
	}
	if !errors.Is(err, ErrInvalidSettleRequest) {
		t.Fatalf("expected ErrInvalidSettleRequest, got %v", err)
	}
}

type sameGameComboTestRepository struct {
	base domain.ReadRepository
}

func (r sameGameComboTestRepository) ListFixtures(filter domain.FixtureFilter, page domain.PageRequest) ([]domain.Fixture, domain.PageMeta, error) {
	return r.base.ListFixtures(filter, page)
}

func (r sameGameComboTestRepository) GetFixtureByID(id string) (domain.Fixture, error) {
	return r.base.GetFixtureByID(id)
}

func (r sameGameComboTestRepository) ListMarkets(filter domain.MarketFilter, page domain.PageRequest) ([]domain.Market, domain.PageMeta, error) {
	return r.base.ListMarkets(filter, page)
}

func (r sameGameComboTestRepository) GetMarketByID(id string) (domain.Market, error) {
	market, err := r.base.GetMarketByID(id)
	if err != nil {
		return market, err
	}
	if id == "m:local:003" {
		market.Status = "open"
	}
	return market, nil
}

func (r sameGameComboTestRepository) ListPunters(filter domain.PunterFilter, page domain.PageRequest) ([]domain.Punter, domain.PageMeta, error) {
	return r.base.ListPunters(filter, page)
}

func (r sameGameComboTestRepository) GetPunterByID(id string) (domain.Punter, error) {
	return r.base.GetPunterByID(id)
}

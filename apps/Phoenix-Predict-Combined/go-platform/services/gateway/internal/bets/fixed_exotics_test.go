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

func TestQuoteFixedExoticReturnsExactaQuote(t *testing.T) {
	repository := domain.NewInMemoryReadRepository()
	walletService := wallet.NewService()
	service := NewService(repository, walletService)

	quote, err := service.QuoteFixedExotic(FixedExoticQuoteRequest{
		UserID:     "u-exotic-1",
		RequestID:  "fixed-exacta-1",
		ExoticType: "exacta",
		StakeCents: 500,
		Legs: []FixedExoticLegRequest{
			{Position: 1, MarketID: "m:local:001", SelectionID: "home"},
			{Position: 2, MarketID: "m:local:002", SelectionID: "over"},
		},
	})
	if err != nil {
		t.Fatalf("quote fixed exotic: %v", err)
	}
	if quote.ExoticType != "exacta" {
		t.Fatalf("expected exacta type, got %s", quote.ExoticType)
	}
	if !quote.Combinable {
		t.Fatalf("expected combinable quote, got %+v", quote)
	}
	if quote.Status != fixedExoticQuoteStatusOpen {
		t.Fatalf("expected fixed exotic quote status open, got %s", quote.Status)
	}
	if !strings.HasPrefix(quote.QuoteID, "feq:") {
		t.Fatalf("expected quote id prefix feq:, got %s", quote.QuoteID)
	}
	if !sameOdds(quote.CombinedOdds, 3.51) {
		t.Fatalf("expected combined odds 3.51, got %.6f", quote.CombinedOdds)
	}
	if quote.EncodedTicket != "exacta:home>over" {
		t.Fatalf("expected encoded ticket exacta:home>over, got %s", quote.EncodedTicket)
	}
	if quote.PotentialPayoutCents != 1755 {
		t.Fatalf("expected potential payout 1755, got %d", quote.PotentialPayoutCents)
	}
}

func TestQuoteFixedExoticRejectsUnsupportedType(t *testing.T) {
	repository := domain.NewInMemoryReadRepository()
	walletService := wallet.NewService()
	service := NewService(repository, walletService)

	_, err := service.QuoteFixedExotic(FixedExoticQuoteRequest{
		UserID:     "u-exotic-2",
		RequestID:  "fixed-type-1",
		ExoticType: "superfecta",
		Legs: []FixedExoticLegRequest{
			{Position: 1, MarketID: "m:local:001", SelectionID: "home"},
			{Position: 2, MarketID: "m:local:002", SelectionID: "over"},
		},
	})
	if err == nil {
		t.Fatal("expected unsupported fixed exotic type error")
	}
	if !errors.Is(err, ErrUnsupportedFixedExoticType) {
		t.Fatalf("expected ErrUnsupportedFixedExoticType, got %v", err)
	}
}

func TestQuoteFixedExoticRejectsDuplicateMarkets(t *testing.T) {
	repository := domain.NewInMemoryReadRepository()
	walletService := wallet.NewService()
	service := NewService(repository, walletService)

	_, err := service.QuoteFixedExotic(FixedExoticQuoteRequest{
		UserID:     "u-exotic-3",
		RequestID:  "fixed-dup-market-1",
		ExoticType: "exacta",
		Legs: []FixedExoticLegRequest{
			{Position: 1, MarketID: "m:local:001", SelectionID: "home"},
			{Position: 2, MarketID: "m:local:001", SelectionID: "away"},
		},
	})
	if err == nil {
		t.Fatal("expected duplicate market validation error")
	}
	if !errors.Is(err, ErrFixedExoticDuplicateMarket) {
		t.Fatalf("expected ErrFixedExoticDuplicateMarket, got %v", err)
	}
}

func TestQuoteFixedExoticRejectsFixtureMismatch(t *testing.T) {
	repository := sameGameComboTestRepository{base: domain.NewInMemoryReadRepository()}
	walletService := wallet.NewService()
	service := NewService(repository, walletService)

	_, err := service.QuoteFixedExotic(FixedExoticQuoteRequest{
		UserID:     "u-exotic-4",
		RequestID:  "fixed-fixture-1",
		ExoticType: "exacta",
		Legs: []FixedExoticLegRequest{
			{Position: 1, MarketID: "m:local:001", SelectionID: "home"},
			{Position: 2, MarketID: "m:local:003", SelectionID: "yes"},
		},
	})
	if err == nil {
		t.Fatal("expected fixed exotic fixture mismatch error")
	}
	if !errors.Is(err, ErrFixedExoticFixtureMismatch) {
		t.Fatalf("expected ErrFixedExoticFixtureMismatch, got %v", err)
	}
}

func TestFixedExoticQuotePersistsToFile(t *testing.T) {
	repository := domain.NewInMemoryReadRepository()
	walletService := wallet.NewService()
	statePath := filepath.Join(t.TempDir(), "bets-fixed-exotics-state.json")

	service := NewServiceWithPath(repository, walletService, statePath)
	quote, err := service.QuoteFixedExotic(FixedExoticQuoteRequest{
		UserID:     "u-exotic-persist-1",
		RequestID:  "fixed-persist-1",
		ExoticType: "exacta",
		StakeCents: 500,
		Legs: []FixedExoticLegRequest{
			{Position: 1, MarketID: "m:local:001", SelectionID: "home"},
			{Position: 2, MarketID: "m:local:002", SelectionID: "over"},
		},
	})
	if err != nil {
		t.Fatalf("quote fixed exotic: %v", err)
	}

	reloaded := NewServiceWithPath(repository, walletService, statePath)
	loaded, err := reloaded.GetFixedExoticQuote(quote.QuoteID)
	if err != nil {
		t.Fatalf("get fixed exotic quote: %v", err)
	}
	if loaded.QuoteID != quote.QuoteID {
		t.Fatalf("expected quoteId %s, got %s", quote.QuoteID, loaded.QuoteID)
	}
	if loaded.EncodedTicket != "exacta:home>over" {
		t.Fatalf("expected encoded ticket exacta:home>over, got %s", loaded.EncodedTicket)
	}
}

func TestListFixedExoticQuotesSupportsStatusAndUserFilters(t *testing.T) {
	repository := domain.NewInMemoryReadRepository()
	walletService := wallet.NewService()
	_, _ = walletService.Credit(wallet.MutationRequest{UserID: "u-exotic-list-1", AmountCents: 5000, IdempotencyKey: "seed-u1"})
	_, _ = walletService.Credit(wallet.MutationRequest{UserID: "u-exotic-list-2", AmountCents: 5000, IdempotencyKey: "seed-u2"})
	service := NewService(repository, walletService)

	openQuote, err := service.QuoteFixedExotic(FixedExoticQuoteRequest{
		UserID:     "u-exotic-list-1",
		RequestID:  "fixed-list-open-1",
		ExoticType: "exacta",
		StakeCents: 500,
		Legs: []FixedExoticLegRequest{
			{Position: 1, MarketID: "m:local:001", SelectionID: "home"},
			{Position: 2, MarketID: "m:local:002", SelectionID: "over"},
		},
	})
	if err != nil {
		t.Fatalf("quote fixed exotic open: %v", err)
	}

	acceptedQuote, err := service.QuoteFixedExotic(FixedExoticQuoteRequest{
		UserID:     "u-exotic-list-2",
		RequestID:  "fixed-list-accepted-1",
		ExoticType: "exacta",
		StakeCents: 500,
		Legs: []FixedExoticLegRequest{
			{Position: 1, MarketID: "m:local:001", SelectionID: "away"},
			{Position: 2, MarketID: "m:local:002", SelectionID: "under"},
		},
	})
	if err != nil {
		t.Fatalf("quote fixed exotic accepted: %v", err)
	}

	if _, _, err := service.AcceptFixedExoticQuote(FixedExoticAcceptRequest{
		QuoteID:   acceptedQuote.QuoteID,
		UserID:    "u-exotic-list-2",
		RequestID: "fixed-list-accepted-accept-1",
	}); err != nil {
		t.Fatalf("accept fixed exotic quote: %v", err)
	}

	allQuotes := service.ListFixedExoticQuotes("", "", 10)
	if len(allQuotes) != 2 {
		t.Fatalf("expected 2 total quotes, got %d", len(allQuotes))
	}

	openQuotes := service.ListFixedExoticQuotes("", "open", 10)
	if len(openQuotes) != 1 {
		t.Fatalf("expected 1 open quote, got %d", len(openQuotes))
	}
	if openQuotes[0].QuoteID != openQuote.QuoteID {
		t.Fatalf("expected open quote %s, got %s", openQuote.QuoteID, openQuotes[0].QuoteID)
	}

	userTwoAccepted := service.ListFixedExoticQuotes("u-exotic-list-2", "accepted", 10)
	if len(userTwoAccepted) != 1 {
		t.Fatalf("expected 1 accepted quote for user-2, got %d", len(userTwoAccepted))
	}
	if userTwoAccepted[0].QuoteID != acceptedQuote.QuoteID {
		t.Fatalf("expected accepted quote %s, got %s", acceptedQuote.QuoteID, userTwoAccepted[0].QuoteID)
	}
}

func TestAdminExpireFixedExoticQuoteTransitionsOpenQuote(t *testing.T) {
	repository := domain.NewInMemoryReadRepository()
	walletService := wallet.NewService()
	service := NewService(repository, walletService)

	quote, err := service.QuoteFixedExotic(FixedExoticQuoteRequest{
		UserID:     "u-exotic-admin-1",
		RequestID:  "fixed-admin-expire-1",
		ExoticType: "exacta",
		StakeCents: 500,
		Legs: []FixedExoticLegRequest{
			{Position: 1, MarketID: "m:local:001", SelectionID: "home"},
			{Position: 2, MarketID: "m:local:002", SelectionID: "over"},
		},
	})
	if err != nil {
		t.Fatalf("quote fixed exotic: %v", err)
	}

	updated, err := service.AdminExpireFixedExoticQuote(quote.QuoteID, "risk_manual_expire", "admin-risk-1")
	if err != nil {
		t.Fatalf("admin expire fixed exotic quote: %v", err)
	}
	if updated.Status != fixedExoticQuoteStatusExpired {
		t.Fatalf("expected expired status, got %s", updated.Status)
	}
	if !strings.Contains(updated.LastReason, "risk_manual_expire") {
		t.Fatalf("expected reason to contain risk_manual_expire, got %s", updated.LastReason)
	}
	if !strings.Contains(updated.LastReason, "admin-risk-1") {
		t.Fatalf("expected reason to contain admin actor, got %s", updated.LastReason)
	}

	events, err := service.ListEvents(10)
	if err != nil {
		t.Fatalf("list events: %v", err)
	}
	found := false
	for _, event := range events {
		if event.Action == actionFixedExoticQuoteExpired &&
			event.BetID == quote.QuoteID &&
			event.ActorID == "admin-risk-1" {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("expected fixed exotic expire audit event for quote %s", quote.QuoteID)
	}
}

func TestAdminExpireFixedExoticQuoteRejectsAcceptedQuote(t *testing.T) {
	repository := domain.NewInMemoryReadRepository()
	walletService := wallet.NewService()
	_, _ = walletService.Credit(wallet.MutationRequest{UserID: "u-exotic-admin-2", AmountCents: 5000, IdempotencyKey: "seed"})
	service := NewService(repository, walletService)

	quote, err := service.QuoteFixedExotic(FixedExoticQuoteRequest{
		UserID:     "u-exotic-admin-2",
		RequestID:  "fixed-admin-expire-accepted-1",
		ExoticType: "exacta",
		StakeCents: 500,
		Legs: []FixedExoticLegRequest{
			{Position: 1, MarketID: "m:local:001", SelectionID: "home"},
			{Position: 2, MarketID: "m:local:002", SelectionID: "over"},
		},
	})
	if err != nil {
		t.Fatalf("quote fixed exotic: %v", err)
	}

	if _, _, err := service.AcceptFixedExoticQuote(FixedExoticAcceptRequest{
		QuoteID:   quote.QuoteID,
		UserID:    "u-exotic-admin-2",
		RequestID: "fixed-admin-expire-accepted-accept-1",
	}); err != nil {
		t.Fatalf("accept fixed exotic quote: %v", err)
	}

	_, err = service.AdminExpireFixedExoticQuote(quote.QuoteID, "manual_expire_attempt", "admin-risk-2")
	if err == nil {
		t.Fatal("expected fixed exotic quote conflict for accepted quote")
	}
	if !errors.Is(err, ErrFixedExoticQuoteConflict) {
		t.Fatalf("expected ErrFixedExoticQuoteConflict, got %v", err)
	}
}

func TestAcceptFixedExoticQuotePlacesBetIdempotently(t *testing.T) {
	repository := domain.NewInMemoryReadRepository()
	walletService := wallet.NewService()
	_, _ = walletService.Credit(wallet.MutationRequest{UserID: "u-exotic-accept-1", AmountCents: 5000, IdempotencyKey: "seed"})
	service := NewService(repository, walletService)

	quote, err := service.QuoteFixedExotic(FixedExoticQuoteRequest{
		UserID:     "u-exotic-accept-1",
		RequestID:  "fixed-accept-quote-1",
		ExoticType: "exacta",
		StakeCents: 500,
		Legs: []FixedExoticLegRequest{
			{Position: 1, MarketID: "m:local:001", SelectionID: "home"},
			{Position: 2, MarketID: "m:local:002", SelectionID: "over"},
		},
	})
	if err != nil {
		t.Fatalf("quote fixed exotic: %v", err)
	}

	firstBet, firstQuote, err := service.AcceptFixedExoticQuote(FixedExoticAcceptRequest{
		QuoteID:   quote.QuoteID,
		UserID:    "u-exotic-accept-1",
		RequestID: "fixed-accept-1",
		Reason:    "placing exacta",
	})
	if err != nil {
		t.Fatalf("accept fixed exotic quote: %v", err)
	}
	if firstBet.Status != statusPlaced {
		t.Fatalf("expected placed bet status, got %s", firstBet.Status)
	}
	if len(firstBet.Legs) != 2 {
		t.Fatalf("expected 2 fixed exotic legs, got %d", len(firstBet.Legs))
	}
	if firstQuote.Status != fixedExoticQuoteStatusAccepted {
		t.Fatalf("expected accepted quote status, got %s", firstQuote.Status)
	}
	if firstQuote.AcceptedBetID != firstBet.BetID {
		t.Fatalf("expected accepted bet %s, got %s", firstBet.BetID, firstQuote.AcceptedBetID)
	}

	secondBet, secondQuote, err := service.AcceptFixedExoticQuote(FixedExoticAcceptRequest{
		QuoteID:   quote.QuoteID,
		UserID:    "u-exotic-accept-1",
		RequestID: "fixed-accept-2",
	})
	if err != nil {
		t.Fatalf("repeat accept fixed exotic quote: %v", err)
	}
	if secondBet.BetID != firstBet.BetID {
		t.Fatalf("expected idempotent accepted bet %s, got %s", firstBet.BetID, secondBet.BetID)
	}
	if secondQuote.AcceptedBetID != firstBet.BetID {
		t.Fatalf("expected accepted quote to reference %s, got %s", firstBet.BetID, secondQuote.AcceptedBetID)
	}
	if balance := walletService.Balance("u-exotic-accept-1"); balance != 4500 {
		t.Fatalf("expected single wallet debit to balance 4500, got %d", balance)
	}
}

func TestAcceptFixedExoticQuoteRejectsExpiredQuote(t *testing.T) {
	t.Setenv("FIXED_EXOTIC_QUOTE_TTL_SECONDS", "1")

	repository := domain.NewInMemoryReadRepository()
	walletService := wallet.NewService()
	_, _ = walletService.Credit(wallet.MutationRequest{UserID: "u-exotic-expired-1", AmountCents: 5000, IdempotencyKey: "seed"})
	service := NewService(repository, walletService)

	now := time.Date(2026, 3, 2, 12, 0, 0, 0, time.UTC)
	service.now = func() time.Time { return now }

	quote, err := service.QuoteFixedExotic(FixedExoticQuoteRequest{
		UserID:     "u-exotic-expired-1",
		RequestID:  "fixed-expired-quote-1",
		ExoticType: "exacta",
		StakeCents: 500,
		Legs: []FixedExoticLegRequest{
			{Position: 1, MarketID: "m:local:001", SelectionID: "home"},
			{Position: 2, MarketID: "m:local:002", SelectionID: "over"},
		},
	})
	if err != nil {
		t.Fatalf("quote fixed exotic: %v", err)
	}

	now = now.Add(2 * time.Second)
	_, _, err = service.AcceptFixedExoticQuote(FixedExoticAcceptRequest{
		QuoteID:   quote.QuoteID,
		UserID:    "u-exotic-expired-1",
		RequestID: "fixed-expired-accept-1",
	})
	if err == nil {
		t.Fatal("expected expired fixed exotic quote rejection")
	}
	if !errors.Is(err, ErrFixedExoticQuoteExpired) {
		t.Fatalf("expected ErrFixedExoticQuoteExpired, got %v", err)
	}
}

func TestSettleFixedExoticBetWithMultiSelectionReference(t *testing.T) {
	repository := domain.NewInMemoryReadRepository()
	walletService := wallet.NewService()
	_, _ = walletService.Credit(wallet.MutationRequest{UserID: "u-exotic-settle-1", AmountCents: 5000, IdempotencyKey: "seed"})
	service := NewService(repository, walletService)

	quote, err := service.QuoteFixedExotic(FixedExoticQuoteRequest{
		UserID:     "u-exotic-settle-1",
		RequestID:  "fixed-settle-quote-1",
		ExoticType: "exacta",
		StakeCents: 500,
		Legs: []FixedExoticLegRequest{
			{Position: 1, MarketID: "m:local:001", SelectionID: "home"},
			{Position: 2, MarketID: "m:local:002", SelectionID: "over"},
		},
	})
	if err != nil {
		t.Fatalf("quote fixed exotic: %v", err)
	}

	placed, _, err := service.AcceptFixedExoticQuote(FixedExoticAcceptRequest{
		QuoteID:   quote.QuoteID,
		UserID:    "u-exotic-settle-1",
		RequestID: "fixed-settle-accept-1",
	})
	if err != nil {
		t.Fatalf("accept fixed exotic quote: %v", err)
	}

	settled, err := service.Settle(SettleBetRequest{
		BetID:              placed.BetID,
		WinningSelectionID: "over,home",
		Reason:             "exacta confirmed",
	})
	if err != nil {
		t.Fatalf("settle fixed exotic bet: %v", err)
	}
	if settled.Status != statusSettledWon {
		t.Fatalf("expected status %s, got %s", statusSettledWon, settled.Status)
	}
	if settled.SettlementReference != "home,over" {
		t.Fatalf("expected normalized settlement reference home,over, got %s", settled.SettlementReference)
	}
	if settled.SettlementLedgerEntryID == "" {
		t.Fatal("expected settlement credit ledger entry for winning fixed exotic bet")
	}
}

func TestSettleFixedExoticBetRequiresMultiSelectionReference(t *testing.T) {
	repository := domain.NewInMemoryReadRepository()
	walletService := wallet.NewService()
	_, _ = walletService.Credit(wallet.MutationRequest{UserID: "u-exotic-settle-2", AmountCents: 5000, IdempotencyKey: "seed"})
	service := NewService(repository, walletService)

	quote, err := service.QuoteFixedExotic(FixedExoticQuoteRequest{
		UserID:     "u-exotic-settle-2",
		RequestID:  "fixed-settle-quote-2",
		ExoticType: "exacta",
		StakeCents: 500,
		Legs: []FixedExoticLegRequest{
			{Position: 1, MarketID: "m:local:001", SelectionID: "home"},
			{Position: 2, MarketID: "m:local:002", SelectionID: "over"},
		},
	})
	if err != nil {
		t.Fatalf("quote fixed exotic: %v", err)
	}

	placed, _, err := service.AcceptFixedExoticQuote(FixedExoticAcceptRequest{
		QuoteID:   quote.QuoteID,
		UserID:    "u-exotic-settle-2",
		RequestID: "fixed-settle-accept-2",
	})
	if err != nil {
		t.Fatalf("accept fixed exotic quote: %v", err)
	}

	_, err = service.Settle(SettleBetRequest{
		BetID:              placed.BetID,
		WinningSelectionID: "home",
	})
	if err == nil {
		t.Fatal("expected invalid settle request for fixed exotic bet without multi-selection payload")
	}
	if !errors.Is(err, ErrInvalidSettleRequest) {
		t.Fatalf("expected ErrInvalidSettleRequest, got %v", err)
	}
}

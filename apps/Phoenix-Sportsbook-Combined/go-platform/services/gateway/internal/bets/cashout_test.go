package bets

import (
	"errors"
	"testing"
	"time"

	"phoenix-revival/gateway/internal/domain"
	"phoenix-revival/gateway/internal/wallet"
)

func TestCashoutQuoteAndAcceptLifecycle(t *testing.T) {
	repository := domain.NewInMemoryReadRepository()
	walletService := wallet.NewService()
	_, _ = walletService.Credit(wallet.MutationRequest{
		UserID:         "u-cashout-1",
		AmountCents:    5000,
		IdempotencyKey: "seed-cashout",
	})
	service := NewService(repository, walletService)

	placed, err := service.Place(PlaceBetRequest{
		UserID:         "u-cashout-1",
		RequestID:      "cashout-place-1",
		MarketID:       "m:local:001",
		SelectionID:    "home",
		StakeCents:     1000,
		Odds:           2.0,
		IdempotencyKey: "cashout-place-1",
	})
	if err != nil {
		t.Fatalf("place bet: %v", err)
	}

	quote, err := service.QuoteCashout(CashoutQuoteRequest{
		BetID:     placed.BetID,
		UserID:    placed.UserID,
		RequestID: "cashout-quote-1",
	})
	if err != nil {
		t.Fatalf("quote cashout: %v", err)
	}
	if quote.Status != cashoutQuoteStatusOpen {
		t.Fatalf("expected open quote status, got %s", quote.Status)
	}
	if quote.Revision != 1 {
		t.Fatalf("expected quote revision 1, got %d", quote.Revision)
	}
	if quote.Source != "local_heuristic" {
		t.Fatalf("expected quote source local_heuristic, got %s", quote.Source)
	}
	if quote.AmountCents <= 0 {
		t.Fatalf("expected positive quote amount, got %d", quote.AmountCents)
	}

	settled, acceptedQuote, err := service.AcceptCashout(CashoutAcceptRequest{
		BetID:         placed.BetID,
		UserID:        placed.UserID,
		QuoteID:       quote.QuoteID,
		RequestID:     "cashout-accept-1",
		QuoteRevision: quote.Revision,
		Reason:        "taking cashout",
	})
	if err != nil {
		t.Fatalf("accept cashout: %v", err)
	}
	if settled.Status != statusCashedOut {
		t.Fatalf("expected cashed_out status, got %s", settled.Status)
	}
	if settled.SettlementReference != quote.QuoteID {
		t.Fatalf("expected settlement reference %s, got %s", quote.QuoteID, settled.SettlementReference)
	}
	if acceptedQuote.Status != cashoutQuoteStatusAccepted {
		t.Fatalf("expected accepted quote status, got %s", acceptedQuote.Status)
	}
}

func TestCashoutQuoteExpires(t *testing.T) {
	repository := domain.NewInMemoryReadRepository()
	walletService := wallet.NewService()
	_, _ = walletService.Credit(wallet.MutationRequest{
		UserID:         "u-cashout-2",
		AmountCents:    5000,
		IdempotencyKey: "seed-cashout-2",
	})
	service := NewService(repository, walletService)

	now := time.Date(2026, 3, 4, 14, 0, 0, 0, time.UTC)
	service.now = func() time.Time {
		return now
	}

	placed, err := service.Place(PlaceBetRequest{
		UserID:         "u-cashout-2",
		RequestID:      "cashout-place-2",
		MarketID:       "m:local:001",
		SelectionID:    "home",
		StakeCents:     1000,
		Odds:           2.0,
		IdempotencyKey: "cashout-place-2",
	})
	if err != nil {
		t.Fatalf("place bet: %v", err)
	}

	quote, err := service.QuoteCashout(CashoutQuoteRequest{
		BetID:     placed.BetID,
		UserID:    placed.UserID,
		RequestID: "cashout-quote-2",
	})
	if err != nil {
		t.Fatalf("quote cashout: %v", err)
	}

	now = now.Add(20 * time.Second)
	_, _, err = service.AcceptCashout(CashoutAcceptRequest{
		BetID:     placed.BetID,
		UserID:    placed.UserID,
		QuoteID:   quote.QuoteID,
		RequestID: "cashout-accept-2",
	})
	if err == nil {
		t.Fatal("expected cashout accept to fail for expired quote")
	}
	if !errors.Is(err, ErrCashoutQuoteExpired) {
		t.Fatalf("expected ErrCashoutQuoteExpired, got %v", err)
	}
}

func TestCashoutQuoteRequiresPlacedBet(t *testing.T) {
	repository := domain.NewInMemoryReadRepository()
	walletService := wallet.NewService()
	service := NewService(repository, walletService)

	_, err := service.QuoteCashout(CashoutQuoteRequest{
		BetID:     "b:missing",
		UserID:    "u-cashout-missing",
		RequestID: "cashout-missing",
	})
	if err == nil {
		t.Fatal("expected missing bet to fail")
	}
}

func TestCashoutQuoteRejectsStaleProviderRevision(t *testing.T) {
	repository := domain.NewInMemoryReadRepository()
	walletService := wallet.NewService()
	_, _ = walletService.Credit(wallet.MutationRequest{
		UserID:         "u-cashout-3",
		AmountCents:    5000,
		IdempotencyKey: "seed-cashout-3",
	})
	service := NewService(repository, walletService)

	placed, err := service.Place(PlaceBetRequest{
		UserID:         "u-cashout-3",
		RequestID:      "cashout-place-3",
		MarketID:       "m:local:001",
		SelectionID:    "home",
		StakeCents:     800,
		Odds:           2.0,
		IdempotencyKey: "cashout-place-3",
	})
	if err != nil {
		t.Fatalf("place bet: %v", err)
	}

	first, err := service.QuoteCashout(CashoutQuoteRequest{
		BetID:               placed.BetID,
		UserID:              placed.UserID,
		RequestID:           "cashout-quote-3-a",
		ProviderAmountCents: 850,
		ProviderRevision:    7,
		ProviderSource:      "provider_stream",
	})
	if err != nil {
		t.Fatalf("quote cashout first: %v", err)
	}
	if first.Revision != 7 {
		t.Fatalf("expected first provider revision 7, got %d", first.Revision)
	}

	_, err = service.QuoteCashout(CashoutQuoteRequest{
		BetID:               placed.BetID,
		UserID:              placed.UserID,
		RequestID:           "cashout-quote-3-b",
		ProviderAmountCents: 900,
		ProviderRevision:    7,
		ProviderSource:      "provider_stream",
	})
	if !errors.Is(err, ErrCashoutQuoteStale) {
		t.Fatalf("expected ErrCashoutQuoteStale, got %v", err)
	}
}

func TestCashoutAcceptRejectsStaleRevision(t *testing.T) {
	repository := domain.NewInMemoryReadRepository()
	walletService := wallet.NewService()
	_, _ = walletService.Credit(wallet.MutationRequest{
		UserID:         "u-cashout-4",
		AmountCents:    6000,
		IdempotencyKey: "seed-cashout-4",
	})
	service := NewService(repository, walletService)

	placed, err := service.Place(PlaceBetRequest{
		UserID:         "u-cashout-4",
		RequestID:      "cashout-place-4",
		MarketID:       "m:local:001",
		SelectionID:    "home",
		StakeCents:     1000,
		Odds:           2.0,
		IdempotencyKey: "cashout-place-4",
	})
	if err != nil {
		t.Fatalf("place bet: %v", err)
	}

	firstQuote, err := service.QuoteCashout(CashoutQuoteRequest{
		BetID:     placed.BetID,
		UserID:    placed.UserID,
		RequestID: "cashout-quote-4-a",
	})
	if err != nil {
		t.Fatalf("quote cashout first: %v", err)
	}
	if firstQuote.Revision != 1 {
		t.Fatalf("expected revision 1, got %d", firstQuote.Revision)
	}

	secondQuote, err := service.QuoteCashout(CashoutQuoteRequest{
		BetID:     placed.BetID,
		UserID:    placed.UserID,
		RequestID: "cashout-quote-4-b",
	})
	if err != nil {
		t.Fatalf("quote cashout second: %v", err)
	}
	if secondQuote.Revision != 2 {
		t.Fatalf("expected revision 2, got %d", secondQuote.Revision)
	}

	_, _, err = service.AcceptCashout(CashoutAcceptRequest{
		BetID:         placed.BetID,
		UserID:        placed.UserID,
		QuoteID:       firstQuote.QuoteID,
		RequestID:     "cashout-accept-4",
		QuoteRevision: firstQuote.Revision,
	})
	if !errors.Is(err, ErrCashoutQuoteStale) {
		t.Fatalf("expected ErrCashoutQuoteStale when accepting stale quote, got %v", err)
	}

	metrics := service.CashoutMetricsSnapshot()
	if metrics.StaleRejects != 1 {
		t.Fatalf("expected stale reject metric to be 1, got %d", metrics.StaleRejects)
	}
}

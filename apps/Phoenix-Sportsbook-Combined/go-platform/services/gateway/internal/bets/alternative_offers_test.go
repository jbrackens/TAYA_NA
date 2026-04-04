package bets

import (
	"errors"
	"testing"
	"time"

	"phoenix-revival/gateway/internal/domain"
	"phoenix-revival/gateway/internal/wallet"
)

func TestAlternativeOddsOfferLifecycleCreateRepriceAccept(t *testing.T) {
	repository := domain.NewInMemoryReadRepository()
	walletService := wallet.NewService()
	service := NewService(repository, walletService)

	created, err := service.CreateAlternativeOddsOffer(AlternativeOddsOfferCreateRequest{
		UserID:        "u-offer-1",
		RequestID:     "offer-req-1",
		MarketID:      "m:local:001",
		SelectionID:   "home",
		StakeCents:    500,
		RequestedOdds: 1.95,
		OfferedOdds:   2.05,
	})
	if err != nil {
		t.Fatalf("create alternative odds offer: %v", err)
	}
	if created.Status != offerStatusOpen {
		t.Fatalf("expected status %s, got %s", offerStatusOpen, created.Status)
	}
	if created.OfferID == "" {
		t.Fatal("expected offerId to be populated")
	}
	if created.Version != 1 {
		t.Fatalf("expected version 1, got %d", created.Version)
	}

	repriced, err := service.RepriceAlternativeOddsOffer(AlternativeOddsOfferRepriceRequest{
		OfferID:          created.OfferID,
		UserID:           created.UserID,
		RequestID:        "offer-req-1-reprice",
		OfferedOdds:      2.1,
		ExpiresInSeconds: 45,
		Reason:           "market shifted",
	})
	if err != nil {
		t.Fatalf("reprice alternative offer: %v", err)
	}
	if repriced.Status != offerStatusOpen {
		t.Fatalf("expected open status after reprice, got %s", repriced.Status)
	}
	if repriced.OfferedOdds != 2.1 {
		t.Fatalf("expected offeredOdds 2.1, got %.3f", repriced.OfferedOdds)
	}
	if repriced.LastAction != "repriced" {
		t.Fatalf("expected lastAction repriced, got %s", repriced.LastAction)
	}
	if repriced.Version != 2 {
		t.Fatalf("expected version 2, got %d", repriced.Version)
	}

	accepted, err := service.AcceptAlternativeOddsOffer(AlternativeOddsOfferDecisionRequest{
		OfferID:   created.OfferID,
		UserID:    created.UserID,
		RequestID: "offer-req-1-accept",
		Reason:    "accepting offer",
	})
	if err != nil {
		t.Fatalf("accept alternative offer: %v", err)
	}
	if accepted.Status != offerStatusAccepted {
		t.Fatalf("expected accepted status, got %s", accepted.Status)
	}
	if accepted.AcceptedAt == "" {
		t.Fatal("expected acceptedAt timestamp")
	}
	if accepted.LastAction != "accepted" {
		t.Fatalf("expected lastAction accepted, got %s", accepted.LastAction)
	}
}

func TestAlternativeOddsOfferExpiresAndRejectsDecision(t *testing.T) {
	repository := domain.NewInMemoryReadRepository()
	walletService := wallet.NewService()
	service := NewService(repository, walletService)

	now := time.Date(2026, 3, 4, 13, 0, 0, 0, time.UTC)
	service.now = func() time.Time {
		return now
	}

	created, err := service.CreateAlternativeOddsOffer(AlternativeOddsOfferCreateRequest{
		UserID:          "u-offer-2",
		RequestID:       "offer-req-2",
		MarketID:        "m:local:001",
		SelectionID:     "home",
		StakeCents:      500,
		RequestedOdds:   1.9,
		OfferedOdds:     2.0,
		ExpiresInSecond: 1,
	})
	if err != nil {
		t.Fatalf("create alternative odds offer: %v", err)
	}

	now = now.Add(2 * time.Second)
	_, err = service.AcceptAlternativeOddsOffer(AlternativeOddsOfferDecisionRequest{
		OfferID:   created.OfferID,
		UserID:    created.UserID,
		RequestID: "offer-req-2-accept",
		Reason:    "late accept",
	})
	if err == nil {
		t.Fatal("expected accept to fail on expired offer")
	}
	if !errors.Is(err, ErrAlternativeOfferExpired) {
		t.Fatalf("expected ErrAlternativeOfferExpired, got %v", err)
	}

	offer, err := service.GetAlternativeOddsOffer(created.OfferID)
	if err != nil {
		t.Fatalf("get expired offer: %v", err)
	}
	if offer.Status != offerStatusExpired {
		t.Fatalf("expected expired status, got %s", offer.Status)
	}
}

func TestAlternativeOddsOfferListFiltersAndLimit(t *testing.T) {
	repository := domain.NewInMemoryReadRepository()
	walletService := wallet.NewService()
	service := NewService(repository, walletService)

	_, _ = service.CreateAlternativeOddsOffer(AlternativeOddsOfferCreateRequest{
		UserID:        "u-offer-3",
		RequestID:     "offer-req-3a",
		MarketID:      "m:local:001",
		SelectionID:   "home",
		StakeCents:    500,
		RequestedOdds: 1.9,
		OfferedOdds:   2.0,
	})
	createdSecond, _ := service.CreateAlternativeOddsOffer(AlternativeOddsOfferCreateRequest{
		UserID:        "u-offer-3",
		RequestID:     "offer-req-3b",
		MarketID:      "m:local:001",
		SelectionID:   "away",
		StakeCents:    500,
		RequestedOdds: 2.1,
		OfferedOdds:   2.3,
	})
	_, _ = service.AcceptAlternativeOddsOffer(AlternativeOddsOfferDecisionRequest{
		OfferID:   createdSecond.OfferID,
		UserID:    createdSecond.UserID,
		RequestID: "offer-req-3b-accept",
	})

	openOnly := service.ListAlternativeOddsOffers("u-offer-3", offerStatusOpen, 10)
	if len(openOnly) != 1 {
		t.Fatalf("expected one open offer, got %d", len(openOnly))
	}

	allLimited := service.ListAlternativeOddsOffers("u-offer-3", "", 1)
	if len(allLimited) != 1 {
		t.Fatalf("expected one limited result, got %d", len(allLimited))
	}
}

func TestAlternativeOddsOfferCommitPlacesBetIdempotently(t *testing.T) {
	repository := domain.NewInMemoryReadRepository()
	walletService := wallet.NewService()
	_, _ = walletService.Credit(wallet.MutationRequest{
		UserID:         "u-offer-commit-1",
		AmountCents:    5000,
		IdempotencyKey: "seed-offer-commit-1",
	})
	service := NewService(repository, walletService)

	offer, err := service.CreateAlternativeOddsOffer(AlternativeOddsOfferCreateRequest{
		UserID:        "u-offer-commit-1",
		RequestID:     "offer-commit-create-1",
		MarketID:      "m:local:001",
		SelectionID:   "home",
		StakeCents:    700,
		RequestedOdds: 1.9,
		OfferedOdds:   2.05,
	})
	if err != nil {
		t.Fatalf("create alternative offer: %v", err)
	}

	committedOffer, committedBet, err := service.CommitAlternativeOddsOffer(AlternativeOddsOfferCommitRequest{
		OfferID:        offer.OfferID,
		UserID:         offer.UserID,
		RequestID:      "offer-commit-request-1",
		IdempotencyKey: "offer-commit-idem-1",
		Reason:         "punter accepted improved price",
		ActorID:        offer.UserID,
	})
	if err != nil {
		t.Fatalf("commit alternative offer: %v", err)
	}
	if committedOffer.Status != offerStatusAccepted {
		t.Fatalf("expected accepted offer status, got %s", committedOffer.Status)
	}
	if committedOffer.CommittedBetID == "" {
		t.Fatal("expected committedBetId to be set")
	}
	if committedOffer.CommittedBetID != committedBet.BetID {
		t.Fatalf("expected committedBetId=%s, got %s", committedBet.BetID, committedOffer.CommittedBetID)
	}
	if committedOffer.LastAction != "committed" {
		t.Fatalf("expected lastAction committed, got %s", committedOffer.LastAction)
	}
	if !sameOdds(committedBet.Odds, offer.OfferedOdds) {
		t.Fatalf("expected committed bet odds %.3f, got %.3f", offer.OfferedOdds, committedBet.Odds)
	}

	committedOfferAgain, committedBetAgain, err := service.CommitAlternativeOddsOffer(AlternativeOddsOfferCommitRequest{
		OfferID:        offer.OfferID,
		UserID:         offer.UserID,
		RequestID:      "offer-commit-request-2",
		IdempotencyKey: "offer-commit-idem-2",
		Reason:         "retry commit",
		ActorID:        offer.UserID,
	})
	if err != nil {
		t.Fatalf("recommit alternative offer: %v", err)
	}
	if committedBetAgain.BetID != committedBet.BetID {
		t.Fatalf("expected recommit to return same betId %s, got %s", committedBet.BetID, committedBetAgain.BetID)
	}
	if committedOfferAgain.CommittedBetID != committedBet.BetID {
		t.Fatalf("expected recommit offer committedBetId %s, got %s", committedBet.BetID, committedOfferAgain.CommittedBetID)
	}
}

func TestAlternativeOfferMetricsSnapshot(t *testing.T) {
	repository := domain.NewInMemoryReadRepository()
	walletService := wallet.NewService()
	_, _ = walletService.Credit(wallet.MutationRequest{
		UserID:         "u-offer-metrics-1",
		AmountCents:    8000,
		IdempotencyKey: "seed-offer-metrics-1",
	})
	service := NewService(repository, walletService)

	first, err := service.CreateAlternativeOddsOffer(AlternativeOddsOfferCreateRequest{
		UserID:        "u-offer-metrics-1",
		RequestID:     "offer-metrics-create-1",
		MarketID:      "m:local:001",
		SelectionID:   "home",
		StakeCents:    600,
		RequestedOdds: 1.9,
		OfferedOdds:   2.0,
	})
	if err != nil {
		t.Fatalf("create first offer: %v", err)
	}
	if _, err := service.RepriceAlternativeOddsOffer(AlternativeOddsOfferRepriceRequest{
		OfferID:          first.OfferID,
		UserID:           first.UserID,
		RequestID:        "offer-metrics-reprice-1",
		OfferedOdds:      2.1,
		ExpiresInSeconds: 30,
	}); err != nil {
		t.Fatalf("reprice first offer: %v", err)
	}
	if _, _, err := service.CommitAlternativeOddsOffer(AlternativeOddsOfferCommitRequest{
		OfferID:        first.OfferID,
		UserID:         first.UserID,
		RequestID:      "offer-metrics-commit-1",
		IdempotencyKey: "offer-metrics-commit-idem-1",
		Reason:         "accept and place",
	}); err != nil {
		t.Fatalf("commit first offer: %v", err)
	}

	second, err := service.CreateAlternativeOddsOffer(AlternativeOddsOfferCreateRequest{
		UserID:        "u-offer-metrics-1",
		RequestID:     "offer-metrics-create-2",
		MarketID:      "m:local:001",
		SelectionID:   "away",
		StakeCents:    600,
		RequestedOdds: 2.1,
		OfferedOdds:   2.2,
	})
	if err != nil {
		t.Fatalf("create second offer: %v", err)
	}
	if _, err := service.DeclineAlternativeOddsOffer(AlternativeOddsOfferDecisionRequest{
		OfferID:   second.OfferID,
		UserID:    second.UserID,
		RequestID: "offer-metrics-decline-1",
		Reason:    "not interested",
	}); err != nil {
		t.Fatalf("decline second offer: %v", err)
	}

	metrics, status := service.AlternativeOfferMetricsSnapshot()
	if metrics.Created != 2 {
		t.Fatalf("expected created=2, got %d", metrics.Created)
	}
	if metrics.Repriced != 1 {
		t.Fatalf("expected repriced=1, got %d", metrics.Repriced)
	}
	if metrics.Accepted != 1 {
		t.Fatalf("expected accepted=1, got %d", metrics.Accepted)
	}
	if metrics.Declined != 1 {
		t.Fatalf("expected declined=1, got %d", metrics.Declined)
	}
	if metrics.Committed != 1 {
		t.Fatalf("expected committed=1, got %d", metrics.Committed)
	}
	if status.Total != 2 {
		t.Fatalf("expected total status=2, got %d", status.Total)
	}
	if status.Accepted != 1 || status.Declined != 1 || status.Committed != 1 {
		t.Fatalf("unexpected status snapshot: %+v", status)
	}
}

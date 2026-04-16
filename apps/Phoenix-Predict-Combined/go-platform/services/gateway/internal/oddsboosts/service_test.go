package oddsboosts

import (
	"errors"
	"testing"
	"time"

	canonicalv1 "phoenix-revival/platform/canonical/v1"
)

func TestServiceListByUserFiltersStatus(t *testing.T) {
	service := NewService()

	all := service.ListByUser("u-1", "")
	if len(all) != 2 {
		t.Fatalf("expected two odds boosts for u-1, got %d", len(all))
	}

	available := service.ListByUser("u-1", "available")
	if len(available) != 2 {
		t.Fatalf("expected two available odds boosts for u-1, got %d", len(available))
	}

	accepted := service.ListByUser("u-1", "accepted")
	if len(accepted) != 0 {
		t.Fatalf("expected zero accepted odds boosts before accept, got %d", len(accepted))
	}
}

func TestServiceAcceptLifecycleAndIdempotency(t *testing.T) {
	service := NewService()

	accepted, err := service.Accept(AcceptRequest{
		OddsBoostID: "ob:local:001",
		UserID:      "u-1",
		RequestID:   "boost-accept-1",
		Reason:      "used in betslip",
	})
	if err != nil {
		t.Fatalf("accept odds boost: %v", err)
	}
	if accepted.Status != canonicalv1.OddsBoostStatusAccepted {
		t.Fatalf("expected accepted status, got %s", accepted.Status)
	}
	if accepted.AcceptRequestID != "boost-accept-1" {
		t.Fatalf("expected acceptRequestId boost-accept-1, got %s", accepted.AcceptRequestID)
	}
	if accepted.AcceptedAt == nil {
		t.Fatal("expected acceptedAt to be set")
	}

	replay, err := service.Accept(AcceptRequest{
		OddsBoostID: "ob:local:001",
		UserID:      "u-1",
		RequestID:   "boost-accept-1",
		Reason:      "idempotent replay",
	})
	if err != nil {
		t.Fatalf("idempotent replay should succeed: %v", err)
	}
	if replay.Status != canonicalv1.OddsBoostStatusAccepted {
		t.Fatalf("expected replay status accepted, got %s", replay.Status)
	}
}

func TestServiceAcceptRejectsWrongUserAndNotFound(t *testing.T) {
	service := NewService()

	_, err := service.Accept(AcceptRequest{
		OddsBoostID: "ob:local:001",
		UserID:      "u-2",
		RequestID:   "boost-accept-2",
	})
	if !errors.Is(err, ErrOddsBoostForbidden) {
		t.Fatalf("expected ErrOddsBoostForbidden, got %v", err)
	}

	_, err = service.Accept(AcceptRequest{
		OddsBoostID: "ob:missing",
		UserID:      "u-1",
		RequestID:   "boost-accept-3",
	})
	if !errors.Is(err, ErrOddsBoostNotFound) {
		t.Fatalf("expected ErrOddsBoostNotFound, got %v", err)
	}
}

func TestServiceAcceptMarksExpiredBoostNotAcceptable(t *testing.T) {
	service := NewService()
	item, exists := service.GetByID("ob:local:001")
	if !exists {
		t.Fatal("expected odds boost to exist")
	}
	service.now = func() time.Time {
		return item.ExpiresAt.Add(time.Minute)
	}

	_, err := service.Accept(AcceptRequest{
		OddsBoostID: "ob:local:001",
		UserID:      "u-1",
		RequestID:   "boost-accept-expired",
	})
	if !errors.Is(err, ErrOddsBoostNotAcceptable) {
		t.Fatalf("expected ErrOddsBoostNotAcceptable, got %v", err)
	}

	item, exists = service.GetByID("ob:local:001")
	if !exists {
		t.Fatal("expected odds boost to exist")
	}
	if item.Status != canonicalv1.OddsBoostStatusExpired {
		t.Fatalf("expected status expired, got %s", item.Status)
	}
}

func TestValidateForBetAcceptsOnlyAcceptedMatchingBoost(t *testing.T) {
	service := NewService()

	_, err := service.Accept(AcceptRequest{
		OddsBoostID: "ob:local:001",
		UserID:      "u-1",
		RequestID:   "boost-accept-validate-1",
	})
	if err != nil {
		t.Fatalf("accept odds boost: %v", err)
	}

	validated, err := service.ValidateForBet(ValidateForBetRequest{
		OddsBoostID:   "ob:local:001",
		UserID:        "u-1",
		MarketID:      "m:local:001",
		SelectionID:   "home",
		StakeCents:    1000,
		RequestedOdds: 2.05,
	})
	if err != nil {
		t.Fatalf("validate odds boost for bet: %v", err)
	}
	if validated.Status != canonicalv1.OddsBoostStatusAccepted {
		t.Fatalf("expected accepted status, got %s", validated.Status)
	}
}

func TestValidateForBetRejectsWhenNotAcceptedOrMismatch(t *testing.T) {
	service := NewService()

	_, err := service.ValidateForBet(ValidateForBetRequest{
		OddsBoostID:   "ob:local:001",
		UserID:        "u-1",
		MarketID:      "m:local:001",
		SelectionID:   "home",
		StakeCents:    500,
		RequestedOdds: 2.05,
	})
	if !errors.Is(err, ErrOddsBoostNotAcceptable) {
		t.Fatalf("expected ErrOddsBoostNotAcceptable before accept, got %v", err)
	}

	_, err = service.Accept(AcceptRequest{
		OddsBoostID: "ob:local:001",
		UserID:      "u-1",
		RequestID:   "boost-accept-validate-2",
	})
	if err != nil {
		t.Fatalf("accept odds boost: %v", err)
	}

	_, err = service.ValidateForBet(ValidateForBetRequest{
		OddsBoostID:   "ob:local:001",
		UserID:        "u-1",
		MarketID:      "m:local:002",
		SelectionID:   "over",
		StakeCents:    500,
		RequestedOdds: 2.05,
	})
	if !errors.Is(err, ErrOddsBoostNotAcceptable) {
		t.Fatalf("expected ErrOddsBoostNotAcceptable for market mismatch, got %v", err)
	}

	_, err = service.ValidateForBet(ValidateForBetRequest{
		OddsBoostID:   "ob:local:001",
		UserID:        "u-1",
		MarketID:      "m:local:001",
		SelectionID:   "home",
		StakeCents:    5000,
		RequestedOdds: 2.05,
	})
	if !errors.Is(err, ErrOddsBoostNotAcceptable) {
		t.Fatalf("expected ErrOddsBoostNotAcceptable for stake over max, got %v", err)
	}

	_, err = service.ValidateForBet(ValidateForBetRequest{
		OddsBoostID:   "ob:local:001",
		UserID:        "u-1",
		MarketID:      "m:local:001",
		SelectionID:   "home",
		StakeCents:    1000,
		RequestedOdds: 1.9,
	})
	if !errors.Is(err, ErrOddsBoostNotAcceptable) {
		t.Fatalf("expected ErrOddsBoostNotAcceptable for boosted odds mismatch, got %v", err)
	}
}

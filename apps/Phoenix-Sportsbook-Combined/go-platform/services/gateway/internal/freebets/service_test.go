package freebets

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
		t.Fatalf("expected two freebets for u-1, got %d", len(all))
	}

	available := service.ListByUser("u-1", "available")
	if len(available) != 1 {
		t.Fatalf("expected one available freebet for u-1, got %d", len(available))
	}
	if available[0].FreebetID != "fb:local:001" {
		t.Fatalf("unexpected available freebet id: %s", available[0].FreebetID)
	}
}

func TestServiceGetByID(t *testing.T) {
	service := NewService()

	item, exists := service.GetByID("fb:local:002")
	if !exists {
		t.Fatal("expected freebet fb:local:002 to exist")
	}
	if item.PlayerID != "u-1" {
		t.Fatalf("expected player u-1, got %s", item.PlayerID)
	}

	_, exists = service.GetByID("fb:missing")
	if exists {
		t.Fatal("expected missing freebet to not exist")
	}
}

func TestApplyToBetConsumesBalanceAndIsIdempotent(t *testing.T) {
	service := NewService()

	first, err := service.ApplyToBet(ApplyToBetRequest{
		FreebetID:  "fb:local:001",
		UserID:     "u-1",
		RequestID:  "apply-1",
		StakeCents: 1000,
		Odds:       1.8,
	})
	if err != nil {
		t.Fatalf("apply freebet: %v", err)
	}
	if first.AppliedAmountCents != 1000 {
		t.Fatalf("expected applied amount 1000, got %d", first.AppliedAmountCents)
	}
	if first.Freebet.RemainingAmountCents != 500 {
		t.Fatalf("expected remaining amount 500, got %d", first.Freebet.RemainingAmountCents)
	}
	if first.Freebet.Status != canonicalv1.FreebetStatusReserved {
		t.Fatalf("expected reserved status, got %s", first.Freebet.Status)
	}

	replay, err := service.ApplyToBet(ApplyToBetRequest{
		FreebetID:  "fb:local:001",
		UserID:     "u-1",
		RequestID:  "apply-1",
		StakeCents: 1000,
		Odds:       1.8,
	})
	if err != nil {
		t.Fatalf("idempotent replay should succeed: %v", err)
	}
	if replay.AppliedAmountCents != first.AppliedAmountCents {
		t.Fatalf("expected idempotent applied amount %d, got %d", first.AppliedAmountCents, replay.AppliedAmountCents)
	}

	consumed, err := service.ApplyToBet(ApplyToBetRequest{
		FreebetID:  "fb:local:001",
		UserID:     "u-1",
		RequestID:  "apply-2",
		StakeCents: 1000,
		Odds:       1.8,
	})
	if err != nil {
		t.Fatalf("second apply freebet: %v", err)
	}
	if consumed.AppliedAmountCents != 500 {
		t.Fatalf("expected applied amount 500, got %d", consumed.AppliedAmountCents)
	}
	if consumed.Freebet.Status != canonicalv1.FreebetStatusConsumed {
		t.Fatalf("expected consumed status, got %s", consumed.Freebet.Status)
	}
}

func TestApplyToBetRollbackRestoresOriginalState(t *testing.T) {
	service := NewService()

	_, err := service.ApplyToBet(ApplyToBetRequest{
		FreebetID:  "fb:local:001",
		UserID:     "u-1",
		RequestID:  "apply-rollback",
		StakeCents: 900,
		Odds:       1.8,
	})
	if err != nil {
		t.Fatalf("apply freebet: %v", err)
	}

	if err := service.RollbackApply("apply-rollback"); err != nil {
		t.Fatalf("rollback freebet apply: %v", err)
	}

	item, exists := service.GetByID("fb:local:001")
	if !exists {
		t.Fatal("expected freebet fb:local:001 to exist")
	}
	if item.RemainingAmountCents != 1500 {
		t.Fatalf("expected remaining amount restored to 1500, got %d", item.RemainingAmountCents)
	}
	if item.Status != canonicalv1.FreebetStatusAvailable {
		t.Fatalf("expected status restored to available, got %s", item.Status)
	}
}

func TestApplyToBetRejectsInvalidStateAndWrongUser(t *testing.T) {
	service := NewService()

	_, err := service.ApplyToBet(ApplyToBetRequest{
		FreebetID:  "fb:local:001",
		UserID:     "u-2",
		RequestID:  "apply-forbidden",
		StakeCents: 500,
		Odds:       1.8,
	})
	if !errors.Is(err, ErrFreebetForbidden) {
		t.Fatalf("expected ErrFreebetForbidden, got %v", err)
	}

	_, err = service.ApplyToBet(ApplyToBetRequest{
		FreebetID:  "fb:local:002",
		UserID:     "u-1",
		RequestID:  "apply-min-odds",
		StakeCents: 500,
		Odds:       1.1,
	})
	if !errors.Is(err, ErrFreebetNotApplicable) {
		t.Fatalf("expected ErrFreebetNotApplicable for min odds mismatch, got %v", err)
	}
}

func TestApplyToBetMarksExpiredAsNotApplicable(t *testing.T) {
	service := NewService()
	service.now = func() time.Time {
		return time.Date(2026, 4, 5, 0, 0, 0, 0, time.UTC)
	}

	_, err := service.ApplyToBet(ApplyToBetRequest{
		FreebetID:  "fb:local:001",
		UserID:     "u-1",
		RequestID:  "apply-expired",
		StakeCents: 500,
		Odds:       1.8,
	})
	if !errors.Is(err, ErrFreebetNotApplicable) {
		t.Fatalf("expected ErrFreebetNotApplicable, got %v", err)
	}

	item, exists := service.GetByID("fb:local:001")
	if !exists {
		t.Fatal("expected freebet to exist")
	}
	if item.Status != canonicalv1.FreebetStatusExpired {
		t.Fatalf("expected status expired, got %s", item.Status)
	}
}

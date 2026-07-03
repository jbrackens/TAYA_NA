package compliance

import (
	"context"
	"errors"
	"testing"
)

// GAP-11 (PAM §13 Responsible Gaming): the loss-limit type — storage +
// management. Enforcement (against realized losses) and the office display land
// in later slices; this covers Set/Get across the mock and fail-closed impls.
func TestMockLossLimitSetGet(t *testing.T) {
	svc := NewMockResponsibleGamblingService()
	ctx := context.Background()

	// No limits for a fresh user.
	if got, err := svc.GetLossLimits(ctx, "u-1"); err != nil || len(got) != 0 {
		t.Fatalf("fresh user: got %v err %v, want empty", got, err)
	}

	// Set daily + weekly.
	if err := svc.SetLossLimit(ctx, "u-1", "daily", 5000); err != nil {
		t.Fatalf("set daily: %v", err)
	}
	if err := svc.SetLossLimit(ctx, "u-1", "weekly", 20000); err != nil {
		t.Fatalf("set weekly: %v", err)
	}
	got, err := svc.GetLossLimits(ctx, "u-1")
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if len(got) != 2 {
		t.Fatalf("expected 2 limits, got %d", len(got))
	}
	byPeriod := map[string]int64{}
	for _, l := range got {
		byPeriod[l.Period] = l.LimitCents
		if l.ResetsAt == "" || l.CreatedAt == "" {
			t.Fatalf("limit %s missing timestamps: %+v", l.Period, l)
		}
	}
	if byPeriod["daily"] != 5000 || byPeriod["weekly"] != 20000 {
		t.Fatalf("wrong limits: %+v", byPeriod)
	}

	// Upsert: re-setting the same period replaces (no duplicate row).
	if err := svc.SetLossLimit(ctx, "u-1", "daily", 3000); err != nil {
		t.Fatalf("upsert daily: %v", err)
	}
	got, _ = svc.GetLossLimits(ctx, "u-1")
	if len(got) != 2 {
		t.Fatalf("upsert should not add a row, got %d", len(got))
	}
	for _, l := range got {
		if l.Period == "daily" && l.LimitCents != 3000 {
			t.Fatalf("daily should be updated to 3000, got %d", l.LimitCents)
		}
	}
}

func TestMockLossLimitValidation(t *testing.T) {
	svc := NewMockResponsibleGamblingService()
	ctx := context.Background()
	if err := svc.SetLossLimit(ctx, "", "daily", 100); !errors.Is(err, ErrInvalidUserID) {
		t.Fatalf("empty user: want ErrInvalidUserID, got %v", err)
	}
	if err := svc.SetLossLimit(ctx, "u-1", "hourly", 100); !errors.Is(err, ErrInvalidLimitPeriod) {
		t.Fatalf("bad period: want ErrInvalidLimitPeriod, got %v", err)
	}
	if err := svc.SetLossLimit(ctx, "u-1", "daily", 0); !errors.Is(err, ErrInvalidLimitPeriod) {
		t.Fatalf("zero amount: want rejection, got %v", err)
	}
	if _, err := svc.GetLossLimits(ctx, ""); !errors.Is(err, ErrInvalidUserID) {
		t.Fatalf("get empty user: want ErrInvalidUserID, got %v", err)
	}
}

func TestFailClosedLossLimitRefuses(t *testing.T) {
	svc := NewFailClosedResponsibleGamblingService()
	ctx := context.Background()
	if err := svc.SetLossLimit(ctx, "u-1", "daily", 100); !errors.Is(err, ErrRGProviderNotConfigured) {
		t.Fatalf("fail-closed set: want ErrRGProviderNotConfigured, got %v", err)
	}
	if _, err := svc.GetLossLimits(ctx, "u-1"); !errors.Is(err, ErrRGProviderNotConfigured) {
		t.Fatalf("fail-closed get: want ErrRGProviderNotConfigured, got %v", err)
	}
}

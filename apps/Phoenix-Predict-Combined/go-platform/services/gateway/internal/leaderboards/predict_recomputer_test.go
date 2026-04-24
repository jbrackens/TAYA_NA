package leaderboards

import (
	"context"
	"errors"
	"testing"
	"time"
)

// ── weekBounds ────────────────────────────────────────────────────────────

func TestWeekBounds_MondayIsStartOfItsOwnWeek(t *testing.T) {
	// 2026-04-20 is a Monday in UTC. weekBounds should return that day 00:00
	// as the start, and the next Monday 00:00 as the end.
	mon := time.Date(2026, 4, 20, 14, 30, 0, 0, time.UTC)

	start, end := weekBounds(mon)

	wantStart := time.Date(2026, 4, 20, 0, 0, 0, 0, time.UTC)
	wantEnd := time.Date(2026, 4, 27, 0, 0, 0, 0, time.UTC)
	if !start.Equal(wantStart) {
		t.Errorf("start: want %v, got %v", wantStart, start)
	}
	if !end.Equal(wantEnd) {
		t.Errorf("end: want %v, got %v", wantEnd, end)
	}
	if end.Sub(start) != 7*24*time.Hour {
		t.Errorf("window should be exactly 7 days, got %v", end.Sub(start))
	}
}

func TestWeekBounds_WednesdayRollsBackToMonday(t *testing.T) {
	// 2026-04-22 is a Wednesday. Start should be 2026-04-20 (Monday).
	wed := time.Date(2026, 4, 22, 12, 0, 0, 0, time.UTC)

	start, _ := weekBounds(wed)

	wantStart := time.Date(2026, 4, 20, 0, 0, 0, 0, time.UTC)
	if !start.Equal(wantStart) {
		t.Errorf("wednesday should roll back to monday 2026-04-20, got %v", start)
	}
}

func TestWeekBounds_SundayRollsBackSixDays(t *testing.T) {
	// 2026-04-26 is a Sunday. Start should be 2026-04-20 (previous Monday).
	// This is the subtle case: time.Weekday returns Sunday=0, but our
	// Monday-as-start calendar must treat Sunday as the LAST day of its week.
	sun := time.Date(2026, 4, 26, 23, 59, 0, 0, time.UTC)

	start, end := weekBounds(sun)

	wantStart := time.Date(2026, 4, 20, 0, 0, 0, 0, time.UTC)
	wantEnd := time.Date(2026, 4, 27, 0, 0, 0, 0, time.UTC)
	if !start.Equal(wantStart) {
		t.Errorf("sunday 2026-04-26: start should be monday 2026-04-20, got %v", start)
	}
	if !end.Equal(wantEnd) {
		t.Errorf("sunday 2026-04-26: end should be monday 2026-04-27, got %v", end)
	}
}

func TestWeekBounds_NonUTCInputIsNormalized(t *testing.T) {
	// Recomputer is built with a UTC-producing clock, but just in case a
	// caller passes a non-UTC time (e.g. server clock drift), weekBounds
	// must still anchor on UTC Monday.
	la, err := time.LoadLocation("America/Los_Angeles")
	if err != nil {
		t.Skip("timezone data not available:", err)
	}
	// 2026-04-20 01:00 LA == 2026-04-20 08:00 UTC (Monday in UTC).
	tLA := time.Date(2026, 4, 20, 1, 0, 0, 0, la)

	start, _ := weekBounds(tLA)

	wantStart := time.Date(2026, 4, 20, 0, 0, 0, 0, time.UTC)
	if !start.Equal(wantStart) {
		t.Errorf("LA input should anchor to UTC monday: want %v got %v", wantStart, start)
	}
}

// ── tick ──────────────────────────────────────────────────────────────────

func TestRecomputerTick_FiresAllStaticRecomputes(t *testing.T) {
	repo := newFakePredictLBRepo()
	r := NewPredictRecomputer(repo, nil, time.Minute)
	r.now = func() time.Time { return time.Date(2026, 4, 22, 10, 0, 0, 0, time.UTC) }

	r.tick(context.Background())

	for _, want := range []string{"accuracy", "pnl_weekly", "sharpness"} {
		if repo.recomputeCalls[want] != 1 {
			t.Errorf("expected %s recompute to fire once, got %d", want, repo.recomputeCalls[want])
		}
	}
}

func TestRecomputerTick_TolerantOfNilCategoryLister(t *testing.T) {
	repo := newFakePredictLBRepo()
	r := NewPredictRecomputer(repo, nil, time.Minute)
	r.now = func() time.Time { return time.Date(2026, 4, 22, 10, 0, 0, 0, time.UTC) }

	// Must not panic with a nil category lister.
	r.tick(context.Background())

	// No category recomputes should have fired.
	for k := range repo.recomputeCalls {
		if len(k) > len("category:") && k[:len("category:")] == "category:" {
			t.Errorf("unexpected category recompute with nil lister: %s", k)
		}
	}
}

func TestRecomputerTick_FiresOneRecomputePerCategory(t *testing.T) {
	repo := newFakePredictLBRepo()
	catFn := func(_ context.Context) ([]CategoryInfo, error) {
		return []CategoryInfo{
			{Slug: "politics", Name: "Politics"},
			{Slug: "crypto", Name: "Crypto"},
			{Slug: "", Name: "Skip-me"}, // empty slug must be skipped
		}, nil
	}
	r := NewPredictRecomputer(repo, catFn, time.Minute)
	r.now = func() time.Time { return time.Date(2026, 4, 22, 10, 0, 0, 0, time.UTC) }

	r.tick(context.Background())

	if repo.recomputeCalls["category:politics"] != 1 {
		t.Errorf("politics recompute: expected 1, got %d", repo.recomputeCalls["category:politics"])
	}
	if repo.recomputeCalls["category:crypto"] != 1 {
		t.Errorf("crypto recompute: expected 1, got %d", repo.recomputeCalls["category:crypto"])
	}
	if _, fired := repo.recomputeCalls["category:"]; fired {
		t.Errorf("empty-slug category should not fire a recompute")
	}
}

func TestRecomputerTick_CategoryListerErrorDoesNotPanicOrLeakToStatic(t *testing.T) {
	repo := newFakePredictLBRepo()
	catFn := func(_ context.Context) ([]CategoryInfo, error) {
		return nil, errors.New("catalog timeout")
	}
	r := NewPredictRecomputer(repo, catFn, time.Minute)
	r.now = func() time.Time { return time.Date(2026, 4, 22, 10, 0, 0, 0, time.UTC) }

	// Must not panic.
	r.tick(context.Background())

	// Static recomputes must still have fired even though category fetch failed.
	if repo.recomputeCalls["accuracy"] != 1 || repo.recomputeCalls["pnl_weekly"] != 1 || repo.recomputeCalls["sharpness"] != 1 {
		t.Errorf("static recomputes must fire even when category lister errors: %+v", repo.recomputeCalls)
	}
}

func TestNewPredictRecomputer_ClampsNonPositiveIntervalToDefault(t *testing.T) {
	r := NewPredictRecomputer(newFakePredictLBRepo(), nil, 0)
	if r.interval != 5*time.Minute {
		t.Errorf("expected default 5m interval when input <= 0, got %v", r.interval)
	}
	r2 := NewPredictRecomputer(newFakePredictLBRepo(), nil, -1*time.Hour)
	if r2.interval != 5*time.Minute {
		t.Errorf("negative interval must clamp to default, got %v", r2.interval)
	}
}

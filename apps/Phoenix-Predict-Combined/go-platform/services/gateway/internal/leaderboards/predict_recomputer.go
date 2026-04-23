package leaderboards

import (
	"context"
	"log/slog"
	"time"
)

// PredictRecomputer runs the board-snapshot refresh on a ticker. Pattern
// matches internal/prediction/workers (stdlib time.Ticker + context.Done
// shutdown). Tick cadence is 5 minutes per PLAN-loyalty-leaderboards.md §8;
// all four boards recompute on every tick (cheap — bounded by user count).
type PredictRecomputer struct {
	repo       PredictLBRepo
	categoryFn CategoryLister
	interval   time.Duration
	now        func() time.Time
}

func NewPredictRecomputer(repo PredictLBRepo, categoryFn CategoryLister, interval time.Duration) *PredictRecomputer {
	if interval <= 0 {
		interval = 5 * time.Minute
	}
	return &PredictRecomputer{
		repo:       repo,
		categoryFn: categoryFn,
		interval:   interval,
		now:        func() time.Time { return time.Now().UTC() },
	}
}

// Run blocks until ctx is cancelled. First tick fires immediately so the
// boards populate at startup without waiting a full interval.
func (r *PredictRecomputer) Run(ctx context.Context) {
	slog.Info("leaderboards recomputer started", "interval", r.interval)
	r.tick(ctx)

	ticker := time.NewTicker(r.interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			slog.Info("leaderboards recomputer stopped")
			return
		case <-ticker.C:
			r.tick(ctx)
		}
	}
}

func (r *PredictRecomputer) tick(ctx context.Context) {
	now := r.now()
	rolling30Start := now.Add(-30 * 24 * time.Hour)
	weekStart, weekEnd := weekBounds(now)

	if n, err := r.repo.RecomputeAccuracy(ctx, rolling30Start, now); err != nil {
		slog.Warn("leaderboards: accuracy recompute failed", "error", err)
	} else {
		slog.Info("leaderboards: accuracy recomputed", "rows", n)
	}

	if n, err := r.repo.RecomputeWeeklyPnL(ctx, weekStart, weekEnd); err != nil {
		slog.Warn("leaderboards: weekly pnl recompute failed", "error", err)
	} else {
		slog.Info("leaderboards: weekly pnl recomputed", "rows", n)
	}

	if n, err := r.repo.RecomputeSharpness(ctx, rolling30Start, now, 50_000); err != nil {
		slog.Warn("leaderboards: sharpness recompute failed", "error", err)
	} else {
		slog.Info("leaderboards: sharpness recomputed", "rows", n)
	}

	if r.categoryFn != nil {
		cats, err := r.categoryFn(ctx)
		if err != nil {
			slog.Warn("leaderboards: category lookup failed", "error", err)
			return
		}
		for _, c := range cats {
			if c.Slug == "" {
				continue
			}
			if n, err := r.repo.RecomputeCategoryChampions(ctx, c.Slug, weekStart, weekEnd); err != nil {
				slog.Warn("leaderboards: category recompute failed", "slug", c.Slug, "error", err)
			} else {
				slog.Info("leaderboards: category recomputed", "slug", c.Slug, "rows", n)
			}
		}
	}
}

// weekBounds returns [Mon 00:00 UTC of the week containing now, next Mon
// 00:00 UTC). Matches the frontend's calendar-week rollover.
func weekBounds(now time.Time) (time.Time, time.Time) {
	utc := now.UTC()
	// time.Weekday returns Sunday=0..Saturday=6. Convert so Monday=0.
	weekday := (int(utc.Weekday()) + 6) % 7
	start := time.Date(utc.Year(), utc.Month(), utc.Day()-weekday, 0, 0, 0, 0, time.UTC)
	end := start.Add(7 * 24 * time.Hour)
	return start, end
}

package main

import (
	"context"
	"database/sql"
	"time"

	"phoenix-revival/gateway/internal/leaderboards"
	"phoenix-revival/gateway/internal/prediction"
)

// RunPhase5Leaderboards refreshes Predict leaderboard snapshots after demo
// settlements. The gateway background worker also does this on startup/tick,
// but the seed command is one-shot; recomputing here leaves demo-data with
// immediately populated leaderboard_snapshots.
func RunPhase5Leaderboards(ctx context.Context, db *sql.DB) {
	predRepo := prediction.NewSQLRepository(db)
	lbRepo := leaderboards.NewPredictSQLRepo(db)
	recomputer := leaderboards.NewPredictRecomputer(lbRepo, seedPredictionCategoryLister(predRepo), time.Hour)
	recomputer.RecomputeNow(ctx)
}

func seedPredictionCategoryLister(repo prediction.Repository) leaderboards.CategoryLister {
	if repo == nil {
		return nil
	}
	return func(ctx context.Context) ([]leaderboards.CategoryInfo, error) {
		cats, err := repo.ListCategories(ctx, true)
		if err != nil {
			return nil, err
		}
		out := make([]leaderboards.CategoryInfo, 0, len(cats))
		for _, c := range cats {
			out = append(out, leaderboards.CategoryInfo{Slug: c.Slug, Name: c.Name})
		}
		return out, nil
	}
}

package http

import (
	"context"

	"phoenix-revival/gateway/internal/leaderboards"
	"phoenix-revival/gateway/internal/prediction"
)

// predictionCategoryLister bridges prediction.Repository.ListCategories to
// leaderboards.CategoryLister, keeping the leaderboards package ignorant of
// the prediction domain. Active-only: disabled categories don't get a
// Category Champions board.
func predictionCategoryLister(repo prediction.Repository) leaderboards.CategoryLister {
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

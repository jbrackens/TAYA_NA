package leaderboards

import (
	"context"
	"strings"
)

// PredictService is the Predict-native leaderboards read-side service. HTTP
// handlers wrap this; the recomputer writes to the same repo out-of-band.
//
// Parallel to the sportsbook Service — the two coexist during the un-orphaning
// transition. HTTP layer swaps to this when a DB is available.
type PredictService struct {
	repo        PredictLBRepo
	categoryFn  CategoryLister
}

// CategoryLister decouples the leaderboards service from the prediction
// package. The handler wires in a function that returns (slug, displayName)
// pairs from prediction_categories, scoped to Predict's category set.
type CategoryLister func(ctx context.Context) ([]CategoryInfo, error)

// CategoryInfo is the minimal shape PredictService needs to build Category
// Champions board definitions.
type CategoryInfo struct {
	Slug string
	Name string
}

// NewPredictService wires the service. categoryFn may be nil — Category
// Champions boards will simply not appear in ListBoards until it is set.
func NewPredictService(repo PredictLBRepo, categoryFn CategoryLister) *PredictService {
	return &PredictService{repo: repo, categoryFn: categoryFn}
}

// ListBoards returns the full catalog: three static boards + one Category
// Champions board per active category. Order: static boards first (accuracy,
// pnl_weekly, sharpness), then category boards in the order returned by the
// category lister.
func (s *PredictService) ListBoards(ctx context.Context) ([]PredictBoardDef, error) {
	static := PredictBoards()
	if s.categoryFn == nil {
		return static, nil
	}
	cats, err := s.categoryFn(ctx)
	if err != nil {
		// Category lookup is optional — surface static boards even if the
		// category catalog is temporarily unavailable.
		return static, nil
	}
	out := make([]PredictBoardDef, 0, len(static)+len(cats))
	out = append(out, static...)
	for _, c := range cats {
		if strings.TrimSpace(c.Slug) == "" {
			continue
		}
		out = append(out, PredictCategoryBoardDef(c.Slug, c.Name))
	}
	return out, nil
}

// Entries returns the top rows for the board. Limit is clamped by the repo.
func (s *PredictService) Entries(ctx context.Context, boardID string, limit int) ([]PredictEntry, error) {
	return s.repo.ListEntries(ctx, boardID, limit)
}

// UserEntry returns the user's current rank on a single board, nil if not
// qualified.
func (s *PredictService) UserEntry(ctx context.Context, boardID, userID string) (*PredictEntry, error) {
	return s.repo.GetEntry(ctx, boardID, userID)
}

// UserStanding returns the user's rank on every board they qualify for,
// ordered by rank ascending (best rank first). Used by the portfolio rank
// chip + /leaderboards "my standings" summary.
func (s *PredictService) UserStanding(ctx context.Context, userID string) ([]PredictEntry, error) {
	return s.repo.ListUserRanks(ctx, userID)
}

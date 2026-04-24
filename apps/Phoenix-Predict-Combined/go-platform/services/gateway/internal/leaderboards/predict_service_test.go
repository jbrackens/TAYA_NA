package leaderboards

import (
	"context"
	"errors"
	"testing"
	"time"
)

// fakePredictLBRepo is a minimal PredictLBRepo for service-level unit tests.
// It records inputs to each method and returns whatever the test configures.
type fakePredictLBRepo struct {
	listEntriesResult    []PredictEntry
	listEntriesErr       error
	lastListBoardID      string
	lastListLimit        int
	getEntryResult       *PredictEntry
	listUserRanksResult  []PredictEntry
	recomputeCalls       map[string]int
	recomputeCategoryArg string
}

func newFakePredictLBRepo() *fakePredictLBRepo {
	return &fakePredictLBRepo{recomputeCalls: map[string]int{}}
}

func (f *fakePredictLBRepo) ListEntries(_ context.Context, boardID string, limit int) ([]PredictEntry, error) {
	f.lastListBoardID = boardID
	f.lastListLimit = limit
	return f.listEntriesResult, f.listEntriesErr
}

func (f *fakePredictLBRepo) GetEntry(_ context.Context, _, _ string) (*PredictEntry, error) {
	return f.getEntryResult, nil
}

func (f *fakePredictLBRepo) ListUserRanks(_ context.Context, _ string) ([]PredictEntry, error) {
	return f.listUserRanksResult, nil
}

func (f *fakePredictLBRepo) RecomputeAccuracy(_ context.Context, _, _ time.Time) (int, error) {
	f.recomputeCalls["accuracy"]++
	return 0, nil
}

func (f *fakePredictLBRepo) RecomputeWeeklyPnL(_ context.Context, _, _ time.Time) (int, error) {
	f.recomputeCalls["pnl_weekly"]++
	return 0, nil
}

func (f *fakePredictLBRepo) RecomputeSharpness(_ context.Context, _, _ time.Time, _ int64) (int, error) {
	f.recomputeCalls["sharpness"]++
	return 0, nil
}

func (f *fakePredictLBRepo) RecomputeCategoryChampions(_ context.Context, categorySlug string, _, _ time.Time) (int, error) {
	f.recomputeCalls["category:"+categorySlug]++
	f.recomputeCategoryArg = categorySlug
	return 0, nil
}

// ── ListBoards ────────────────────────────────────────────────────────────

func TestListBoards_NoCategoryListerReturnsStaticOnly(t *testing.T) {
	svc := NewPredictService(newFakePredictLBRepo(), nil)

	boards, err := svc.ListBoards(context.Background())
	if err != nil {
		t.Fatalf("ListBoards: %v", err)
	}
	// Three static boards: accuracy, pnl_weekly, sharpness.
	if len(boards) != 3 {
		t.Fatalf("expected 3 static boards, got %d", len(boards))
	}
	wantIDs := map[PredictBoardID]bool{
		PredictBoardAccuracy:  true,
		PredictBoardPnLWeekly: true,
		PredictBoardSharpness: true,
	}
	for _, b := range boards {
		if !wantIDs[b.ID] {
			t.Errorf("unexpected board in static list: %s", b.ID)
		}
	}
}

func TestListBoards_CategoryListerErrorFallsBackToStatic(t *testing.T) {
	catErr := errors.New("category catalog down")
	catFn := func(_ context.Context) ([]CategoryInfo, error) { return nil, catErr }
	svc := NewPredictService(newFakePredictLBRepo(), catFn)

	boards, err := svc.ListBoards(context.Background())
	if err != nil {
		t.Fatalf("ListBoards should not surface category lookup error, got: %v", err)
	}
	if len(boards) != 3 {
		t.Errorf("expected fallback to static-only on category error, got %d boards", len(boards))
	}
}

func TestListBoards_IncludesCategoryChampions(t *testing.T) {
	catFn := func(_ context.Context) ([]CategoryInfo, error) {
		return []CategoryInfo{
			{Slug: "politics", Name: "Politics"},
			{Slug: "crypto", Name: "Crypto"},
		}, nil
	}
	svc := NewPredictService(newFakePredictLBRepo(), catFn)

	boards, err := svc.ListBoards(context.Background())
	if err != nil {
		t.Fatalf("ListBoards: %v", err)
	}
	// 3 static + 2 category = 5.
	if len(boards) != 5 {
		t.Fatalf("expected 5 boards (3 static + 2 category), got %d", len(boards))
	}
	// Static boards come first.
	if boards[0].ID != PredictBoardAccuracy {
		t.Errorf("expected accuracy first, got %s", boards[0].ID)
	}
	// Category boards keep lister order.
	if boards[3].ID != PredictCategoryBoardID("politics") {
		t.Errorf("expected politics category board at [3], got %s", boards[3].ID)
	}
	if boards[4].ID != PredictCategoryBoardID("crypto") {
		t.Errorf("expected crypto category board at [4], got %s", boards[4].ID)
	}
}

func TestListBoards_EmptyCategorySlugIsSkipped(t *testing.T) {
	catFn := func(_ context.Context) ([]CategoryInfo, error) {
		return []CategoryInfo{
			{Slug: "politics", Name: "Politics"},
			{Slug: "   ", Name: "Whitespace"}, // whitespace slug: must be skipped
			{Slug: "", Name: "Empty"},         // empty slug: must be skipped
		}, nil
	}
	svc := NewPredictService(newFakePredictLBRepo(), catFn)

	boards, _ := svc.ListBoards(context.Background())
	// 3 static + 1 valid category = 4. Whitespace + empty slugs dropped.
	if len(boards) != 4 {
		t.Errorf("expected 4 boards (empty slugs skipped), got %d", len(boards))
	}
}

// ── Entries / UserEntry / UserStanding ────────────────────────────────────

func TestEntries_PassesThroughBoardIDAndLimit(t *testing.T) {
	repo := newFakePredictLBRepo()
	repo.listEntriesResult = []PredictEntry{
		{BoardID: PredictBoardPnLWeekly, Rank: 1, UserID: "u-1", MetricValue: 3550},
	}
	svc := NewPredictService(repo, nil)

	entries, err := svc.Entries(context.Background(), PredictBoardPnLWeekly, 50)
	if err != nil {
		t.Fatalf("Entries: %v", err)
	}
	if repo.lastListBoardID != PredictBoardPnLWeekly {
		t.Errorf("board id not forwarded: got %q", repo.lastListBoardID)
	}
	if repo.lastListLimit != 50 {
		t.Errorf("limit not forwarded: got %d", repo.lastListLimit)
	}
	if len(entries) != 1 || entries[0].UserID != "u-1" {
		t.Errorf("result not forwarded correctly: %+v", entries)
	}
}

func TestEntries_PropagatesRepoError(t *testing.T) {
	boom := errors.New("snapshot read failed")
	repo := newFakePredictLBRepo()
	repo.listEntriesErr = boom
	svc := NewPredictService(repo, nil)

	if _, err := svc.Entries(context.Background(), PredictBoardAccuracy, 10); !errors.Is(err, boom) {
		t.Fatalf("expected repo error to propagate, got %v", err)
	}
}

func TestUserEntry_ReturnsNilWhenRepoHasNone(t *testing.T) {
	repo := newFakePredictLBRepo() // getEntryResult = nil
	svc := NewPredictService(repo, nil)

	e, err := svc.UserEntry(context.Background(), PredictBoardSharpness, "u-unqualified")
	if err != nil {
		t.Fatalf("UserEntry: %v", err)
	}
	if e != nil {
		t.Errorf("expected nil for unqualified user, got %+v", e)
	}
}

func TestUserStanding_ReturnsRanksFromRepo(t *testing.T) {
	repo := newFakePredictLBRepo()
	repo.listUserRanksResult = []PredictEntry{
		{BoardID: PredictBoardPnLWeekly, Rank: 1, UserID: "u-ranked"},
		{BoardID: PredictBoardAccuracy, Rank: 7, UserID: "u-ranked"},
	}
	svc := NewPredictService(repo, nil)

	ranks, err := svc.UserStanding(context.Background(), "u-ranked")
	if err != nil {
		t.Fatalf("UserStanding: %v", err)
	}
	if len(ranks) != 2 {
		t.Fatalf("expected 2 rank rows, got %d", len(ranks))
	}
}

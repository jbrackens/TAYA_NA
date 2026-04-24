package http

import (
	"context"
	"encoding/json"
	stdhttp "net/http"
	"net/http/httptest"
	"testing"
	"time"

	"phoenix-revival/gateway/internal/leaderboards"
	"phoenix-revival/platform/transport/httpx"
)

// fakeLBRepo is a deterministic in-memory PredictLBRepo for HTTP tests.
type fakeLBRepo struct {
	entries  []leaderboards.PredictEntry
	userEntry *leaderboards.PredictEntry
	standing []leaderboards.PredictEntry
}

func (f *fakeLBRepo) ListEntries(_ context.Context, boardID string, _ int) ([]leaderboards.PredictEntry, error) {
	out := make([]leaderboards.PredictEntry, 0)
	for _, e := range f.entries {
		if e.BoardID == boardID {
			out = append(out, e)
		}
	}
	return out, nil
}

func (f *fakeLBRepo) GetEntry(_ context.Context, boardID, userID string) (*leaderboards.PredictEntry, error) {
	if f.userEntry != nil && f.userEntry.BoardID == boardID && f.userEntry.UserID == userID {
		e := *f.userEntry
		return &e, nil
	}
	return nil, nil
}

func (f *fakeLBRepo) ListUserRanks(_ context.Context, _ string) ([]leaderboards.PredictEntry, error) {
	return f.standing, nil
}

func (f *fakeLBRepo) RecomputeAccuracy(_ context.Context, _, _ time.Time) (int, error) { return 0, nil }
func (f *fakeLBRepo) RecomputeWeeklyPnL(_ context.Context, _, _ time.Time) (int, error) {
	return 0, nil
}
func (f *fakeLBRepo) RecomputeSharpness(_ context.Context, _, _ time.Time, _ int64) (int, error) {
	return 0, nil
}
func (f *fakeLBRepo) RecomputeCategoryChampions(_ context.Context, _ string, _, _ time.Time) (int, error) {
	return 0, nil
}

func buildPredictLBHandler(t *testing.T, repo *fakeLBRepo, catFn leaderboards.CategoryLister) stdhttp.Handler {
	t.Helper()
	svc := leaderboards.NewPredictService(repo, catFn)
	mux := stdhttp.NewServeMux()
	registerPredictLeaderboardRoutes(mux, svc)
	return httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))
}

// ── /api/v1/leaderboards (list) ───────────────────────────────────────────

func TestPredictLeaderboardsList_PublicReturnsAllBoards(t *testing.T) {
	catFn := func(_ context.Context) ([]leaderboards.CategoryInfo, error) {
		return []leaderboards.CategoryInfo{{Slug: "politics", Name: "Politics"}}, nil
	}
	h := buildPredictLBHandler(t, &fakeLBRepo{}, catFn)

	req := httptest.NewRequest(stdhttp.MethodGet, "/api/v1/leaderboards", nil)
	res := httptest.NewRecorder()
	h.ServeHTTP(res, req)

	if res.Code != stdhttp.StatusOK {
		t.Fatalf("public list: want 200, got %d", res.Code)
	}
	var p struct {
		Items      []map[string]any `json:"items"`
		TotalCount int              `json:"totalCount"`
	}
	_ = json.Unmarshal(res.Body.Bytes(), &p)
	// 3 static + 1 category = 4.
	if p.TotalCount != 4 || len(p.Items) != 4 {
		t.Errorf("boards: expected 4, got total=%d items=%d", p.TotalCount, len(p.Items))
	}
}

func TestPredictLeaderboardsList_RejectsNonGET(t *testing.T) {
	h := buildPredictLBHandler(t, &fakeLBRepo{}, nil)

	req := httptest.NewRequest(stdhttp.MethodPost, "/api/v1/leaderboards", nil)
	res := httptest.NewRecorder()
	h.ServeHTTP(res, req)

	if res.Code != stdhttp.StatusMethodNotAllowed {
		t.Errorf("POST /leaderboards: want 405, got %d", res.Code)
	}
}

// ── /api/v1/leaderboards/:id/entries ──────────────────────────────────────

func TestPredictLeaderboardEntries_ReturnsBoardRows(t *testing.T) {
	entries := []leaderboards.PredictEntry{
		{BoardID: "pnl_weekly", Rank: 1, UserID: "u-alice", DisplayName: "alice", MetricValue: 3550},
		{BoardID: "pnl_weekly", Rank: 2, UserID: "u-bob", DisplayName: "bob", MetricValue: 49},
	}
	h := buildPredictLBHandler(t, &fakeLBRepo{entries: entries}, nil)

	req := httptest.NewRequest(stdhttp.MethodGet, "/api/v1/leaderboards/pnl_weekly/entries?limit=10", nil)
	res := httptest.NewRecorder()
	h.ServeHTTP(res, req)

	if res.Code != stdhttp.StatusOK {
		t.Fatalf("entries: want 200, got %d body=%s", res.Code, res.Body.String())
	}
	var p struct {
		BoardID string           `json:"boardId"`
		Items   []map[string]any `json:"items"`
		Limit   int              `json:"limit"`
	}
	_ = json.Unmarshal(res.Body.Bytes(), &p)
	if p.BoardID != "pnl_weekly" {
		t.Errorf("boardId: want pnl_weekly, got %s", p.BoardID)
	}
	if p.Limit != 10 {
		t.Errorf("limit echo: want 10, got %d", p.Limit)
	}
	if len(p.Items) != 2 {
		t.Errorf("entries count: want 2, got %d", len(p.Items))
	}
}

func TestPredictLeaderboardEntries_IncludesViewerRankForSelf(t *testing.T) {
	entries := []leaderboards.PredictEntry{
		{BoardID: "accuracy", Rank: 1, UserID: "u-alice", MetricValue: 1.0},
	}
	repo := &fakeLBRepo{
		entries: entries,
		userEntry: &leaderboards.PredictEntry{
			BoardID: "accuracy", Rank: 3, UserID: "u-alice", DisplayName: "alice", MetricValue: 0.8,
		},
	}
	h := buildPredictLBHandler(t, repo, nil)

	req := httptest.NewRequest(stdhttp.MethodGet, "/api/v1/leaderboards/accuracy/entries", nil)
	req.Header.Set("X-User-ID", "u-alice")
	res := httptest.NewRecorder()
	h.ServeHTTP(res, req)

	if res.Code != stdhttp.StatusOK {
		t.Fatalf("viewer-rank entries: want 200, got %d", res.Code)
	}
	var p map[string]any
	_ = json.Unmarshal(res.Body.Bytes(), &p)
	viewer, ok := p["viewerEntry"].(map[string]any)
	if !ok {
		t.Fatalf("viewerEntry missing from response: %v", p)
	}
	if viewer["userId"] != "u-alice" {
		t.Errorf("viewer userId: want u-alice, got %v", viewer["userId"])
	}
}

func TestPredictLeaderboardEntries_BlocksForeignViewerLookup(t *testing.T) {
	h := buildPredictLBHandler(t, &fakeLBRepo{}, nil)

	// Session is u-alice, ?userId= asks for u-bob's row — must 403.
	req := httptest.NewRequest(stdhttp.MethodGet, "/api/v1/leaderboards/pnl_weekly/entries?userId=u-bob", nil)
	req.Header.Set("X-User-ID", "u-alice")
	res := httptest.NewRecorder()
	h.ServeHTTP(res, req)

	if res.Code != stdhttp.StatusForbidden {
		t.Fatalf("foreign viewer lookup: want 403, got %d body=%s", res.Code, res.Body.String())
	}
}

func TestPredictLeaderboardEntries_RejectsInvalidLimit(t *testing.T) {
	h := buildPredictLBHandler(t, &fakeLBRepo{}, nil)

	cases := []string{"0", "-1", "101", "abc"}
	for _, raw := range cases {
		t.Run("limit="+raw, func(t *testing.T) {
			req := httptest.NewRequest(stdhttp.MethodGet, "/api/v1/leaderboards/pnl_weekly/entries?limit="+raw, nil)
			res := httptest.NewRecorder()
			h.ServeHTTP(res, req)
			if res.Code != stdhttp.StatusBadRequest {
				t.Errorf("limit=%s must 400, got %d", raw, res.Code)
			}
		})
	}
}

func TestPredictLeaderboardEntries_RejectsTrailingEmpty(t *testing.T) {
	h := buildPredictLBHandler(t, &fakeLBRepo{}, nil)

	req := httptest.NewRequest(stdhttp.MethodGet, "/api/v1/leaderboards/", nil)
	res := httptest.NewRecorder()
	h.ServeHTTP(res, req)

	if res.Code != stdhttp.StatusNotFound {
		t.Errorf("empty board id: want 404, got %d", res.Code)
	}
}

// ── /api/v1/me/leaderboards ───────────────────────────────────────────────

func TestPredictMeLeaderboards_RequiresAuth(t *testing.T) {
	h := buildPredictLBHandler(t, &fakeLBRepo{}, nil)

	req := httptest.NewRequest(stdhttp.MethodGet, "/api/v1/me/leaderboards", nil)
	res := httptest.NewRecorder()
	h.ServeHTTP(res, req)

	if res.Code != stdhttp.StatusUnauthorized {
		t.Errorf("no session: want 401, got %d", res.Code)
	}
}

func TestPredictMeLeaderboards_ReturnsUserStanding(t *testing.T) {
	repo := &fakeLBRepo{standing: []leaderboards.PredictEntry{
		{BoardID: "pnl_weekly", Rank: 1, UserID: "u-alice", MetricValue: 3550},
		{BoardID: "accuracy", Rank: 7, UserID: "u-alice", MetricValue: 0.82},
	}}
	h := buildPredictLBHandler(t, repo, nil)

	req := httptest.NewRequest(stdhttp.MethodGet, "/api/v1/me/leaderboards", nil)
	req.Header.Set("X-User-ID", "u-alice")
	res := httptest.NewRecorder()
	h.ServeHTTP(res, req)

	if res.Code != stdhttp.StatusOK {
		t.Fatalf("want 200, got %d body=%s", res.Code, res.Body.String())
	}
	var p struct {
		UserID     string           `json:"userId"`
		Items      []map[string]any `json:"items"`
		TotalCount int              `json:"totalCount"`
	}
	_ = json.Unmarshal(res.Body.Bytes(), &p)
	if p.UserID != "u-alice" || p.TotalCount != 2 {
		t.Errorf("standing payload: userId=%q, total=%d", p.UserID, p.TotalCount)
	}
}

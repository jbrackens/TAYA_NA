package http

import (
	"context"
	"encoding/json"
	stdhttp "net/http"
	"net/http/httptest"
	"regexp"
	"strings"
	"testing"
	"time"

	"taptrade/gateway/internal/leaderboards"
	"taptrade/platform/transport/httpx"
)

// fakeLBRepo is a deterministic in-memory PredictLBRepo for HTTP tests.
type fakeLBRepo struct {
	entries        []leaderboards.PredictEntry
	userEntry      *leaderboards.PredictEntry
	standing       []leaderboards.PredictEntry
	recomputeCalls map[string]int
	recomputeRows  map[string]int
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

func (f *fakeLBRepo) RecomputeAccuracy(_ context.Context, _, _ time.Time) (int, error) {
	f.recordRecompute("accuracy")
	return f.recomputeRows["accuracy"], nil
}
func (f *fakeLBRepo) RecomputeWeeklyPnL(_ context.Context, _, _ time.Time) (int, error) {
	f.recordRecompute("pnl_weekly")
	return f.recomputeRows["pnl_weekly"], nil
}
func (f *fakeLBRepo) RecomputeSharpness(_ context.Context, _, _ time.Time, _ int64) (int, error) {
	f.recordRecompute("sharpness")
	return f.recomputeRows["sharpness"], nil
}
func (f *fakeLBRepo) RecomputeCategoryChampions(_ context.Context, categorySlug string, _, _ time.Time) (int, error) {
	boardID := "category:" + categorySlug
	f.recordRecompute(boardID)
	return f.recomputeRows[boardID], nil
}

func (f *fakeLBRepo) recordRecompute(boardID string) {
	if f.recomputeCalls == nil {
		f.recomputeCalls = map[string]int{}
	}
	f.recomputeCalls[boardID]++
}

func buildPredictLBHandler(t *testing.T, repo *fakeLBRepo, catFn leaderboards.CategoryLister) stdhttp.Handler {
	t.Helper()
	svc := leaderboards.NewPredictService(repo, catFn)
	mux := stdhttp.NewServeMux()
	registerPredictLeaderboardRoutes(mux, svc)
	return httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))
}

func buildPredictLBAdminHandler(t *testing.T, repo *fakeLBRepo, catFn leaderboards.CategoryLister) stdhttp.Handler {
	t.Helper()
	svc := leaderboards.NewPredictService(repo, catFn)
	mux := stdhttp.NewServeMux()
	registerPredictLeaderboardAdminRoutes(mux, svc)
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

func TestPredictLeaderboardsList_ExposesLaunchBoardAliases(t *testing.T) {
	h := buildPredictLBHandler(t, &fakeLBRepo{}, nil)

	req := httptest.NewRequest(stdhttp.MethodGet, "/api/v1/leaderboards", nil)
	res := httptest.NewRecorder()
	h.ServeHTTP(res, req)

	if res.Code != stdhttp.StatusOK {
		t.Fatalf("public list: want 200, got %d body=%s", res.Code, res.Body.String())
	}
	var p struct {
		Items []map[string]any `json:"items"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &p); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	for _, item := range p.Items {
		for _, retired := range []string{"metricLabel", "qualificationMsg", "minVolumeCents"} {
			if _, present := item[retired]; present {
				t.Fatalf("public board should not emit retired %s alias: %#v", retired, item)
			}
		}
		if item["unit"] != "PTS" {
			t.Fatalf("public board should expose PTS unit, got %#v", item)
		}
		metricKey, ok := item["metricKey"].(string)
		if !ok || metricKey == "" {
			t.Fatalf("public board should expose metricKey, got %#v", item)
		}
		if item["pointMetricKey"] != metricKey {
			t.Fatalf("public board should expose matching pointMetricKey, got %#v", item)
		}
		if _, ok := item["rewardSummary"].(string); !ok {
			t.Fatalf("public board should expose rewardSummary, got %#v", item)
		}
		if item["id"] != string(leaderboards.PredictBoardSharpness) {
			continue
		}
		raw, ok := item["minVolumePointsCents"].(float64)
		if !ok {
			t.Fatalf("sharpness board should expose minVolumePointsCents, got %#v", item)
		}
		if int64(raw) != 50_000 {
			t.Fatalf("sharpness minVolumePointsCents: want 50000, got %v", raw)
		}
		return
	}
	t.Fatalf("sharpness board not found in response: %#v", p.Items)
}

func TestPredictLeaderboardsListRedactsLegacyUnsafeCategoryCopy(t *testing.T) {
	catFn := func(_ context.Context) ([]leaderboards.CategoryInfo, error) {
		return []leaderboards.CategoryInfo{
			{Slug: "pageants", Name: "Cash prize"},
			{Slug: "crypto", Name: "Crypto"},
		}, nil
	}
	h := buildPredictLBHandler(t, &fakeLBRepo{}, catFn)

	req := httptest.NewRequest(stdhttp.MethodGet, "/api/v1/leaderboards", nil)
	res := httptest.NewRecorder()
	h.ServeHTTP(res, req)

	if res.Code != stdhttp.StatusOK {
		t.Fatalf("public list: want 200, got %d body=%s", res.Code, res.Body.String())
	}
	body := strings.ToLower(res.Body.String())
	for _, unsafe := range []string{"cash prize", "crypto", "category:crypto"} {
		if strings.Contains(body, unsafe) {
			t.Fatalf("public leaderboard list leaked unsafe legacy category copy %q: %s", unsafe, res.Body.String())
		}
	}
	var p struct {
		Items      []map[string]any `json:"items"`
		TotalCount int              `json:"totalCount"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &p); err != nil {
		t.Fatalf("unmarshal public list: %v", err)
	}
	if p.TotalCount != len(p.Items) {
		t.Fatalf("totalCount should match emitted safe public boards, got total=%d items=%d", p.TotalCount, len(p.Items))
	}
	foundRedactedSafeSlug := false
	for _, item := range p.Items {
		if item["categorySlug"] == "pageants" {
			foundRedactedSafeSlug = true
			if item["name"] != launchRedactedUserText || item["description"] != launchRedactedUserText || item["rewardSummary"] != launchRedactedUserText {
				t.Fatalf("expected unsafe category display copy to be redacted, got %#v", item)
			}
		}
		if item["categorySlug"] == "crypto" || item["id"] == "category:crypto" {
			t.Fatalf("unsafe category identifier should not be emitted publicly: %#v", item)
		}
	}
	if !foundRedactedSafeSlug {
		t.Fatalf("expected safe category slug with redacted display copy, got %#v", p.Items)
	}
}

func TestPredictLeaderboardBoardCopyIsPointsOnly(t *testing.T) {
	unsafe := regexp.MustCompile(`(?i)\b(cash|cashout|deposit|withdraw|withdrawal|crypto|fiat|redeem|redeemable|prize|payout|sportsbook|usdc|usd|dollars?|profit)\b|\$`)
	boards := append([]leaderboards.PredictBoardDef{}, leaderboards.PredictBoards()...)
	boards = append(boards, leaderboards.PredictCategoryBoardDef("esports", "Esports"))

	for _, board := range boards {
		fields := []string{board.Name, board.Description, board.MetricLabel, string(board.Window), board.QualificationMsg}
		for _, field := range fields {
			if matches := unsafe.FindAllString(field, -1); len(matches) > 0 {
				t.Fatalf("board %s contains launch-prohibited copy %q in %q", board.ID, strings.Join(matches, ", "), field)
			}
		}
	}
}

func TestPredictAdminBoardRowExposesPointAliases(t *testing.T) {
	row := boardRow(leaderboards.PredictBoardDef{
		ID:               "accuracy",
		Name:             "Accuracy",
		Description:      "Best prediction accuracy",
		MetricLabel:      "Accuracy %",
		QualificationMsg: "Minimum 5 settled predictions",
	})
	if row["unit"] != "PTS" {
		t.Fatalf("expected unit PTS, got %v", row["unit"])
	}
	if row["rewardSummary"] != "Minimum 5 settled predictions" {
		t.Fatalf("expected rewardSummary alias, got %v", row["rewardSummary"])
	}
	if _, ok := row["prizeSummary"]; ok {
		t.Fatalf("admin board row should not emit retired prizeSummary alias in %+v", row)
	}
	if row["pointMetricKey"] != "Accuracy %" {
		t.Fatalf("expected pointMetricKey alias, got %v", row["pointMetricKey"])
	}
}

func TestPredictAdminBoardRowRedactsLegacyUnsafeCopyWithoutMutatingBoard(t *testing.T) {
	board := leaderboards.PredictBoardDef{
		ID:               "category:crypto",
		Name:             "Crypto payout champions",
		Description:      "Cash prize board for legacy operators.",
		MetricLabel:      "Net points",
		QualificationMsg: "Top ranks receive USD payouts.",
	}

	row := boardRow(board)

	if row["leaderboardId"] != "category:crypto" || row["slug"] != "category:crypto" {
		t.Fatalf("expected stable admin identifiers to be preserved, got %#v", row)
	}
	if row["name"] != launchRedactedUserText ||
		row["description"] != launchRedactedUserText ||
		row["rewardSummary"] != launchRedactedUserText {
		t.Fatalf("expected unsafe admin display copy to be redacted, got %#v", row)
	}
	if row["metricKey"] != "Net points" || row["pointMetricKey"] != "Net points" {
		t.Fatalf("expected point metric aliases to be preserved, got %#v", row)
	}
	if board.Name != "Crypto payout champions" ||
		board.Description != "Cash prize board for legacy operators." ||
		board.QualificationMsg != "Top ranks receive USD payouts." {
		t.Fatalf("boardRow must not mutate inherited board definition, got %+v", board)
	}
}

func TestPredictAdminRecomputeRefreshesSnapshots(t *testing.T) {
	repo := &fakeLBRepo{recomputeRows: map[string]int{
		"accuracy":         1,
		"pnl_weekly":       2,
		"sharpness":        0,
		"category:esports": 3,
	}}
	catFn := func(_ context.Context) ([]leaderboards.CategoryInfo, error) {
		return []leaderboards.CategoryInfo{{Slug: "esports", Name: "Esports"}}, nil
	}
	h := buildPredictLBAdminHandler(t, repo, catFn)

	req := httptest.NewRequest(stdhttp.MethodPost, "/api/v1/admin/leaderboards/pnl_weekly/recompute", nil)
	req = req.WithContext(httpx.WithTestUser(req.Context(), "admin-1", "admin@taptrade.local", "admin"))
	res := httptest.NewRecorder()
	h.ServeHTTP(res, req)

	if res.Code != stdhttp.StatusOK {
		t.Fatalf("recompute: want 200, got %d body=%s", res.Code, res.Body.String())
	}
	var p struct {
		Status string `json:"status"`
		Items  []struct {
			BoardID string `json:"boardId"`
			Rows    int    `json:"rows"`
		} `json:"items"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &p); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if p.Status != "recomputed" {
		t.Fatalf("status: want recomputed, got %q", p.Status)
	}
	for _, boardID := range []string{"accuracy", "pnl_weekly", "sharpness", "category:esports"} {
		if repo.recomputeCalls[boardID] != 1 {
			t.Fatalf("expected one recompute for %s, got %#v", boardID, repo.recomputeCalls)
		}
	}
	if len(p.Items) != 4 || p.Items[1].BoardID != "pnl_weekly" || p.Items[1].Rows != 2 {
		t.Fatalf("unexpected recompute response: %#v", p.Items)
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

// Regression (UAT 2026-05-16 D-2): the accuracy board must expose a
// per-trader settled count so the UI SETTLED column shows a number, not
// "—". Entries without a count (other boards) must omit the field so the
// UI keeps its "—" fallback.
func TestPredictLeaderboardEntries_AccuracyExposesSettledCount(t *testing.T) {
	n := 12
	entries := []leaderboards.PredictEntry{
		{BoardID: "accuracy", Rank: 1, UserID: "u-alice", DisplayName: "alice", MetricValue: 70.0, SettledCount: &n},
		{BoardID: "accuracy", Rank: 2, UserID: "u-bob", DisplayName: "bob", MetricValue: 50.0},
	}
	h := buildPredictLBHandler(t, &fakeLBRepo{entries: entries}, nil)

	req := httptest.NewRequest(stdhttp.MethodGet, "/api/v1/leaderboards/accuracy/entries", nil)
	res := httptest.NewRecorder()
	h.ServeHTTP(res, req)

	if res.Code != stdhttp.StatusOK {
		t.Fatalf("entries: want 200, got %d body=%s", res.Code, res.Body.String())
	}
	var p struct {
		Items []map[string]any `json:"items"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &p); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if len(p.Items) != 2 {
		t.Fatalf("want 2 items, got %d", len(p.Items))
	}
	sc, ok := p.Items[0]["settledCount"]
	if !ok {
		t.Fatalf("entry 0 must include settledCount")
	}
	if int(sc.(float64)) != 12 {
		t.Errorf("settledCount: want 12, got %v", sc)
	}
	if _, present := p.Items[1]["settledCount"]; present {
		t.Errorf("entry 1 (no count) must omit settledCount, got %v", p.Items[1]["settledCount"])
	}
}

func TestPredictLeaderboardEntryPayloadRedactsUnsafeDisplayNameWithoutMutatingEntry(t *testing.T) {
	entry := leaderboards.PredictEntry{
		BoardID:     "accuracy",
		Rank:        1,
		UserID:      "u-cash",
		DisplayName: "Cash payout champ",
		MetricValue: 0.75,
	}

	payload := predictEntryPayload(entry)

	if payload["displayName"] != launchRedactedUserText {
		t.Fatalf("expected unsafe public leaderboard displayName redacted, got %#v", payload)
	}
	if entry.DisplayName != "Cash payout champ" {
		t.Fatalf("predictEntryPayload must not mutate raw leaderboard entry, got %+v", entry)
	}
}

func TestPredictAdminEntryRowsRedactsUnsafeDisplayNameWithoutMutatingEntry(t *testing.T) {
	entry := leaderboards.PredictEntry{
		BoardID:     "pnl_weekly",
		Rank:        2,
		UserID:      "u-crypto",
		DisplayName: "Crypto prize winner",
		MetricValue: 500,
	}

	rows := entryRows([]leaderboards.PredictEntry{entry})

	if len(rows) != 1 || rows[0]["displayName"] != launchRedactedUserText {
		t.Fatalf("expected unsafe admin leaderboard displayName redacted, got %#v", rows)
	}
	if entry.DisplayName != "Crypto prize winner" {
		t.Fatalf("entryRows must not mutate raw leaderboard entry, got %+v", entry)
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

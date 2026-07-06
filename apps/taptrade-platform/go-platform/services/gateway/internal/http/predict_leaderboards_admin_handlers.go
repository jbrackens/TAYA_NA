package http

import (
	stdhttp "net/http"
	"strconv"
	"strings"

	"taptrade/gateway/internal/leaderboards"
	"taptrade/platform/transport/httpx"
)

// registerPredictLeaderboardAdminRoutes wires the office /leaderboards admin
// pages to the Predict-native leaderboard service.
//
//	GET  /api/v1/admin/leaderboards               (list)
//	GET  /api/v1/admin/leaderboards/{id}          (board + entries)
//	POST /api/v1/admin/leaderboards/{id}/recompute (refresh snapshots)
//
// Predict leaderboards are COMPUTED boards (Accuracy / Weekly Points / Sharpness
// + per-category Champions), not admin-CRUD rows like the sportsbook model the
// office page was originally written against. So this is read-mapped: the
// static board catalog renders as the list, entries come from the recomputed
// snapshot, and recompute triggers an immediate point-native refresh. Board
// create/edit/delete are intentionally unsupported (405); the boards are
// code-defined.
func registerPredictLeaderboardAdminRoutes(mux *stdhttp.ServeMux, svc *leaderboards.PredictService) {
	if svc == nil {
		return
	}
	for _, base := range []string{"/api/v1/admin/leaderboards", "/admin/leaderboards"} {
		registerLeaderboardAdminList(mux, base, svc)
		registerLeaderboardAdminDetail(mux, base+"/", svc)
	}
}

// boardRow maps a computed PredictBoardDef to the office's LeaderboardRow shape.
// status is always "active" (computed boards are always live); slug mirrors the
// id. rewardSummary/unit are the launch aliases.
func boardRow(b leaderboards.PredictBoardDef) map[string]any {
	return map[string]any{
		"leaderboardId":  b.ID,
		"slug":           b.ID,
		"name":           redactLaunchProhibitedUserText(b.Name),
		"description":    redactLaunchProhibitedUserText(b.Description),
		"metricKey":      b.MetricLabel,
		"pointMetricKey": b.MetricLabel,
		"rankingMode":    "metric",
		"order":          "desc",
		"status":         "active",
		"unit":           "PTS",
		"rewardSummary":  redactLaunchProhibitedUserText(b.QualificationMsg),
	}
}

// entryRows maps PredictEntry rows to the office's standings shape
// (rank/playerId/displayName/score/eventCount). Returns [] (never nil) so the
// office's .map / .slice + entry.score.toLocaleString() never hit undefined.
func entryRows(entries []leaderboards.PredictEntry) []map[string]any {
	out := make([]map[string]any, 0, len(entries))
	for _, e := range entries {
		eventCount := 0
		if e.SettledCount != nil {
			eventCount = *e.SettledCount
		}
		out = append(out, map[string]any{
			"rank":        e.Rank,
			"playerId":    e.UserID,
			"displayName": redactLaunchProhibitedUserText(e.DisplayName),
			"score":       e.MetricValue,
			"eventCount":  eventCount,
		})
	}
	return out
}

func registerLeaderboardAdminList(mux *stdhttp.ServeMux, path string, svc *leaderboards.PredictService) {
	mux.Handle(path, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			// Board create/edit isn't supported — boards are code-defined.
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		if err := requireAdminRole(r); err != nil {
			return err
		}
		boards, err := svc.ListBoards(r.Context())
		if err != nil {
			return httpx.Internal("failed to list leaderboards", err)
		}
		items := make([]map[string]any, 0, len(boards))
		for _, b := range boards {
			items = append(items, boardRow(b))
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"items": items})
	}))
}

func registerLeaderboardAdminDetail(mux *stdhttp.ServeMux, prefix string, svc *leaderboards.PredictService) {
	mux.Handle(prefix, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if err := requireAdminRole(r); err != nil {
			return err
		}
		rest := strings.Trim(strings.TrimPrefix(r.URL.Path, prefix), "/")
		if rest == "" {
			return httpx.NotFound("leaderboard not found")
		}

		// {id}/recompute → acknowledge (background recomputer owns the refresh).
		if strings.HasSuffix(rest, "/recompute") {
			if r.Method != stdhttp.MethodPost {
				return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
			}
			results, err := svc.RecomputeNow(r.Context())
			if err != nil {
				return httpx.Internal("failed to recompute leaderboard snapshots", err)
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
				"status":  "recomputed",
				"message": "Predict leaderboard snapshots refreshed.",
				"items":   results,
			})
		}

		// {id} → board detail + current entries.
		if strings.Contains(rest, "/") {
			return httpx.NotFound("leaderboard route not found")
		}
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		boards, err := svc.ListBoards(r.Context())
		if err != nil {
			return httpx.Internal("failed to load leaderboard", err)
		}
		var match *leaderboards.PredictBoardDef
		for i := range boards {
			if boards[i].ID == rest {
				match = &boards[i]
				break
			}
		}
		if match == nil {
			return httpx.NotFound("leaderboard not found")
		}
		limit := 50
		if v := strings.TrimSpace(r.URL.Query().Get("limit")); v != "" {
			if n, err := strconv.Atoi(v); err == nil && n > 0 {
				limit = n
			}
		}
		entries, err := svc.Entries(r.Context(), rest, limit)
		if err != nil {
			return httpx.Internal("failed to load leaderboard entries", err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"leaderboard": boardRow(*match),
			"items":       entryRows(entries),
		})
	}))
}

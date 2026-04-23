package http

import (
	stdhttp "net/http"
	"strconv"
	"strings"

	"phoenix-revival/gateway/internal/leaderboards"
	"phoenix-revival/platform/transport/httpx"
)

// registerPredictLeaderboardRoutes wires the Predict-native leaderboards HTTP
// surface. Replaces the sportsbook handlers when a DB is available.
//
// Routes:
//   GET /api/v1/leaderboards              — list boards (public)
//   GET /api/v1/leaderboards/:id/entries  — top entries + optional viewer rank (public)
//   GET /api/v1/me/leaderboards           — session user's rank across boards (auth)
//
// Note: the per-user endpoint lives under /api/v1/me/ rather than nested
// inside /api/v1/leaderboards/ because httpx.Auth matches public prefixes by
// HasPrefix. Keeping the list + entries public requires the whole
// /api/v1/leaderboards subtree to be public, which would also bypass auth
// on a nested /me/standing route.
func registerPredictLeaderboardRoutes(mux *stdhttp.ServeMux, service *leaderboards.PredictService) {
	if service == nil {
		return
	}

	const listPath = "/api/v1/leaderboards"
	mux.Handle(listPath, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.URL.Path != listPath {
			return httpx.NotFound("leaderboard not found")
		}
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		boards, err := service.ListBoards(r.Context())
		if err != nil {
			return httpx.Internal("leaderboard list failed", err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"items":      boards,
			"totalCount": len(boards),
		})
	}))

	// /api/v1/me/leaderboards — session user's rank on every qualified board
	mux.Handle("/api/v1/me/leaderboards", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		userID := strings.TrimSpace(userIDFromRequest(r))
		if userID == "" {
			return httpx.Unauthorized("authentication required")
		}
		entries, err := service.UserStanding(r.Context(), userID)
		if err != nil {
			return httpx.Internal("leaderboard standing failed", err)
		}
		items := make([]map[string]any, 0, len(entries))
		for _, e := range entries {
			items = append(items, predictEntryPayload(e))
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"userId":     userID,
			"items":      items,
			"totalCount": len(items),
		})
	}))

	const prefix = "/api/v1/leaderboards/"
	mux.Handle(prefix, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		tail := strings.TrimSpace(strings.TrimPrefix(r.URL.Path, prefix))
		if tail == "" {
			return httpx.NotFound("leaderboard not found")
		}

		// /leaderboards/:id/entries — top rows + optional self viewer rank
		if strings.HasSuffix(tail, "/entries") {
			boardID := strings.TrimSuffix(tail, "/entries")
			if boardID == "" {
				return httpx.NotFound("leaderboard not found")
			}

			limit := 25
			if raw := strings.TrimSpace(r.URL.Query().Get("limit")); raw != "" {
				parsed, err := strconv.Atoi(raw)
				if err != nil || parsed <= 0 || parsed > 100 {
					return httpx.BadRequest("limit must be 1..100", map[string]any{"field": "limit", "value": raw})
				}
				limit = parsed
			}

			entries, err := service.Entries(r.Context(), boardID, limit)
			if err != nil {
				return httpx.Internal("leaderboard entries failed", err)
			}
			viewer, err := leaderboardViewerRank(r, service, boardID)
			if err != nil {
				return err
			}

			items := make([]map[string]any, 0, len(entries))
			for _, e := range entries {
				items = append(items, predictEntryPayload(e))
			}
			response := map[string]any{
				"boardId":    boardID,
				"items":      items,
				"totalCount": len(items),
				"limit":      limit,
			}
			if viewer != nil {
				response["viewerEntry"] = predictEntryPayload(*viewer)
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, response)
		}

		return httpx.NotFound("leaderboard not found")
	}))
}

// leaderboardViewerRank returns the session user's row on the given board, or
// nil if unauthenticated / not qualified. The ?userId= query param must match
// the session user (same allow-only-self rule as loyalty endpoints).
func leaderboardViewerRank(r *stdhttp.Request, service *leaderboards.PredictService, boardID string) (*leaderboards.PredictEntry, error) {
	claimed := strings.TrimSpace(r.URL.Query().Get("userId"))
	sessionID := strings.TrimSpace(userIDFromRequest(r))
	if claimed == "" && sessionID == "" {
		return nil, nil
	}
	userID := sessionID
	if claimed != "" {
		if sessionID == "" {
			return nil, httpx.Unauthorized("authentication required to look up a viewer rank")
		}
		if claimed != sessionID {
			return nil, httpx.Forbidden("cannot look up another user's rank")
		}
		userID = claimed
	}
	if userID == "" {
		return nil, nil
	}
	return service.UserEntry(r.Context(), boardID, userID)
}

func predictEntryPayload(e leaderboards.PredictEntry) map[string]any {
	return map[string]any{
		"boardId":     e.BoardID,
		"rank":        e.Rank,
		"userId":      e.UserID,
		"displayName": e.DisplayName,
		"metricValue": e.MetricValue,
		"windowStart": e.WindowStart.UTC(),
		"windowEnd":   e.WindowEnd.UTC(),
	}
}

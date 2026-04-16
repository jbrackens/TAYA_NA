package http

import (
	"encoding/json"
	"fmt"
	stdhttp "net/http"
	"strconv"
	"strings"
	"time"

	"phoenix-revival/gateway/internal/riskintel"
	"phoenix-revival/platform/transport/httpx"
)

type riskOverrideRequest struct {
	SegmentID string `json:"segmentId"`
	Reason    string `json:"reason,omitempty"`
	Operator  string `json:"operator,omitempty"`
	ExpiresAt string `json:"expiresAt,omitempty"`
}

func registerPersonalizationRoutes(mux *stdhttp.ServeMux, service *riskintel.Service) {
	if service == nil {
		return
	}

	rankingPath := "/api/v1/personalization/ranking"
	comboSuggestionPath := "/api/v1/personalization/combo-suggestions"

	mux.Handle(rankingPath, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}

		items, err := service.RankMarkets(riskintel.RankingRequest{
			UserID:    strings.TrimSpace(r.URL.Query().Get("userId")),
			FixtureID: strings.TrimSpace(r.URL.Query().Get("fixtureId")),
			Limit:     parseRiskLimit(r.URL.Query().Get("limit"), 20),
		})
		if err != nil {
			return httpx.Internal("failed to build personalized market ranking", err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"items": items,
		})
	}))

	mux.Handle(comboSuggestionPath, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}

		items, err := service.SuggestCombos(riskintel.ComboSuggestionRequest{
			UserID: strings.TrimSpace(r.URL.Query().Get("userId")),
			Limit:  parseRiskLimit(r.URL.Query().Get("limit"), 12),
		})
		if err != nil {
			return httpx.Internal("failed to build personalized combo suggestions", err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"items": items,
		})
	}))
}

func registerAdminRiskRoutes(mux *stdhttp.ServeMux, basePath string, service *riskintel.Service) {
	if service == nil {
		return
	}

	playerScoresPath := fmt.Sprintf("%s/player-scores", basePath)
	segmentsPath := fmt.Sprintf("%s/segments", basePath)

	mux.Handle(playerScoresPath, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		if err := requireAdminRole(r); err != nil {
			return err
		}

		userID := strings.TrimSpace(r.URL.Query().Get("userId"))
		if userID == "" {
			return httpx.BadRequest("userId is required", map[string]any{"field": "userId"})
		}

		score, err := service.PlayerScore(userID)
		if err != nil {
			return httpx.BadRequest("failed to build player score", map[string]any{
				"field":  "userId",
				"reason": err.Error(),
			})
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, score)
	}))

	mux.Handle(segmentsPath, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		if err := requireAdminRole(r); err != nil {
			return err
		}

		items, err := service.RiskSegments(
			strings.TrimSpace(r.URL.Query().Get("userId")),
			parseRiskLimit(r.URL.Query().Get("limit"), 20),
		)
		if err != nil {
			return httpx.Internal("failed to build risk segments", err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"items": items,
			"total": len(items),
		})
	}))

	mux.Handle(segmentsPath+"/", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}
		if err := requireAdminRole(r); err != nil {
			return err
		}

		rawPath := strings.TrimPrefix(r.URL.Path, segmentsPath+"/")
		parts := strings.Split(rawPath, "/")
		if len(parts) != 2 || !strings.EqualFold(parts[1], "override") {
			return httpx.NotFound("risk segment resource not found")
		}
		userID := strings.TrimSpace(parts[0])
		if userID == "" {
			return httpx.BadRequest("userId is required", map[string]any{"field": "userId"})
		}

		var payload riskOverrideRequest
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			return httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
		}
		if strings.TrimSpace(payload.SegmentID) == "" {
			return httpx.BadRequest("segmentId is required", map[string]any{"field": "segmentId"})
		}

		var expiresAt *time.Time
		if raw := strings.TrimSpace(payload.ExpiresAt); raw != "" {
			parsed, err := parseAdminRFC3339(raw, "expiresAt")
			if err != nil {
				return err
			}
			expiresAt = &parsed
		}

		override, err := service.SetRiskSegmentOverride(userID, riskintel.SetOverrideRequest{
			SegmentID: payload.SegmentID,
			Reason:    strings.TrimSpace(payload.Reason),
			Operator:  firstNonEmpty(strings.TrimSpace(payload.Operator), adminActorFromRequest(r)),
			ExpiresAt: expiresAt,
		})
		if err != nil {
			return httpx.BadRequest("failed to set risk segment override", map[string]any{
				"reason": err.Error(),
			})
		}

		profile, err := service.RiskSegment(userID)
		if err != nil {
			return httpx.Internal("failed to rebuild risk segment profile", err)
		}

		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"override": override,
			"profile":  profile,
		})
	}))
}

func parseRiskLimit(raw string, fallback int) int {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(trimmed)
	if err != nil || parsed <= 0 {
		return fallback
	}
	return parsed
}

func firstNonEmpty(candidates ...string) string {
	for _, candidate := range candidates {
		trimmed := strings.TrimSpace(candidate)
		if trimmed != "" {
			return trimmed
		}
	}
	return ""
}

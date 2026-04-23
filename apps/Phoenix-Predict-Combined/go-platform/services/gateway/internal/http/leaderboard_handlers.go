package http

import (
	"encoding/json"
	"errors"
	stdhttp "net/http"
	"strconv"
	"strings"
	"time"

	"phoenix-revival/gateway/internal/leaderboards"
	canonicalv1 "phoenix-revival/platform/canonical/v1"
	"phoenix-revival/platform/transport/httpx"
)

type leaderboardDefinitionRequest struct {
	Slug           string `json:"slug"`
	Name           string `json:"name"`
	Description    string `json:"description"`
	MetricKey      string `json:"metricKey"`
	EventType      string `json:"eventType"`
	RankingMode    string `json:"rankingMode"`
	Order          string `json:"order"`
	Status         string `json:"status"`
	Currency       string `json:"currency"`
	PrizeSummary   string `json:"prizeSummary"`
	WindowStartsAt string `json:"windowStartsAt"`
	WindowEndsAt   string `json:"windowEndsAt"`
	CreatedBy      string `json:"createdBy"`
}

type leaderboardEventRequest struct {
	PlayerID       string            `json:"playerId"`
	Score          float64           `json:"score"`
	SourceType     string            `json:"sourceType"`
	SourceID       string            `json:"sourceId"`
	IdempotencyKey string            `json:"idempotencyKey"`
	Metadata       map[string]string `json:"metadata"`
	RecordedAt     string            `json:"recordedAt"`
}

func registerLeaderboardRoutes(mux *stdhttp.ServeMux, service *leaderboards.Service) {
	if service == nil {
		return
	}

	mux.Handle("/api/v1/leaderboards", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		items := service.ListDefinitions(leaderboards.DefinitionFilter{
			Status: strings.TrimSpace(r.URL.Query().Get("status")),
			Search: strings.TrimSpace(r.URL.Query().Get("search")),
		}, false)
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"items":      items,
			"totalCount": len(items),
		})
	}))

	publicPrefix := "/api/v1/leaderboards/"
	mux.Handle(publicPrefix, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}

		tail := strings.TrimSpace(strings.TrimPrefix(r.URL.Path, publicPrefix))
		if tail == "" {
			return httpx.NotFound("leaderboard not found")
		}

		if strings.HasSuffix(tail, "/entries") {
			id := strings.TrimSuffix(tail, "/entries")
			limit, offset, err := parseLeaderboardPagination(r)
			if err != nil {
				return err
			}
			items, definition, err := service.Standings(id, limit, offset)
			if err != nil {
				return mapLeaderboardError(err)
			}
			viewerEntry, err := leaderboardViewerEntry(service, id, r)
			if err != nil {
				return err
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
				"leaderboard": definition,
				"items":       items,
				"totalCount":  len(items),
				"limit":       limit,
				"offset":      offset,
				"viewerEntry": viewerEntry,
			})
		}

		definition, ok := service.GetDefinition(tail)
		if !ok || definition.Status != canonicalv1.LeaderboardStatusActive {
			return httpx.NotFound("leaderboard not found")
		}

		items, _, err := service.Standings(definition.LeaderboardID, 10, 0)
		if err != nil {
			return mapLeaderboardError(err)
		}
		viewerEntry, err := leaderboardViewerEntry(service, definition.LeaderboardID, r)
		if err != nil {
			return err
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"leaderboard": definition,
			"topEntries":  items,
			"viewerEntry": viewerEntry,
		})
	}))

	adminListPath := "/api/v1/admin/leaderboards"
	mux.Handle(adminListPath, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if err := requireAdminRole(r); err != nil {
			return err
		}

		switch r.Method {
		case stdhttp.MethodGet:
			items := service.ListDefinitions(leaderboards.DefinitionFilter{
				Status: strings.TrimSpace(r.URL.Query().Get("status")),
				Search: strings.TrimSpace(r.URL.Query().Get("search")),
			}, true)
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
				"items":      items,
				"totalCount": len(items),
			})
		case stdhttp.MethodPost:
			var request leaderboardDefinitionRequest
			if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
				return httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
			}
			created, err := service.CreateDefinition(toLeaderboardCreateRequest(request))
			if err != nil {
				return mapLeaderboardError(err)
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, created)
		default:
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet, stdhttp.MethodPost)
		}
	}))

	adminPrefix := "/api/v1/admin/leaderboards/"
	mux.Handle(adminPrefix, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if err := requireAdminRole(r); err != nil {
			return err
		}

		tail := strings.TrimSpace(strings.TrimPrefix(r.URL.Path, adminPrefix))
		if tail == "" {
			return httpx.NotFound("leaderboard not found")
		}

		switch {
		case strings.HasSuffix(tail, "/entries"):
			if r.Method != stdhttp.MethodPost {
				return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
			}
			id := strings.TrimSuffix(tail, "/entries")
			var request leaderboardEventRequest
			if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
				return httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
			}
			event, err := service.RecordEvent(toLeaderboardEventRequest(id, request))
			if err != nil {
				return mapLeaderboardError(err)
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, event)

		case strings.HasSuffix(tail, "/recompute"):
			if r.Method != stdhttp.MethodPost {
				return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
			}
			id := strings.TrimSuffix(tail, "/recompute")
			definition, items, err := service.Recompute(id)
			if err != nil {
				return mapLeaderboardError(err)
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
				"leaderboard": definition,
				"items":       items,
				"totalCount":  len(items),
			})

		default:
			id := tail
			switch r.Method {
			case stdhttp.MethodGet:
				definition, ok := service.GetDefinition(id)
				if !ok {
					return httpx.NotFound("leaderboard not found")
				}
				items, _, err := service.Standings(id, 25, 0)
				if err != nil {
					return mapLeaderboardError(err)
				}
				return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
					"leaderboard": definition,
					"items":       items,
				})
			case stdhttp.MethodPut:
				var request leaderboardDefinitionRequest
				if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
					return httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
				}
				updated, err := service.UpdateDefinition(id, toLeaderboardCreateRequest(request))
				if err != nil {
					return mapLeaderboardError(err)
				}
				return httpx.WriteJSON(w, stdhttp.StatusOK, updated)
			default:
				return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet, stdhttp.MethodPut)
			}
		}
	}))
}

func leaderboardViewerEntry(service *leaderboards.Service, id string, r *stdhttp.Request) (any, error) {
	userID := strings.TrimSpace(r.URL.Query().Get("userId"))
	if userID == "" {
		return nil, nil
	}
	// ?userId= on a public leaderboard endpoint is a "show me my rank"
	// lookup. It must be the session user's own id (or admin) — otherwise
	// it lets any caller enumerate any user's rank.
	if err := requireSelfOrAdmin(r, userID); err != nil {
		return nil, err
	}
	entry, _, err := service.StandingForPlayer(id, userID)
	if err != nil {
		return nil, mapLeaderboardError(err)
	}
	if entry == nil {
		return nil, nil
	}
	return entry, nil
}

func toLeaderboardCreateRequest(request leaderboardDefinitionRequest) leaderboards.CreateDefinitionRequest {
	return leaderboards.CreateDefinitionRequest{
		Slug:           strings.TrimSpace(request.Slug),
		Name:           strings.TrimSpace(request.Name),
		Description:    strings.TrimSpace(request.Description),
		MetricKey:      strings.TrimSpace(request.MetricKey),
		EventType:      strings.TrimSpace(request.EventType),
		RankingMode:    canonicalv1.LeaderboardRankingMode(strings.TrimSpace(request.RankingMode)),
		Order:          canonicalv1.LeaderboardOrder(strings.TrimSpace(request.Order)),
		Status:         canonicalv1.LeaderboardStatus(strings.TrimSpace(request.Status)),
		Currency:       strings.TrimSpace(request.Currency),
		PrizeSummary:   strings.TrimSpace(request.PrizeSummary),
		WindowStartsAt: parseOptionalRFC3339(request.WindowStartsAt),
		WindowEndsAt:   parseOptionalRFC3339(request.WindowEndsAt),
		CreatedBy:      strings.TrimSpace(request.CreatedBy),
	}
}

func toLeaderboardEventRequest(id string, request leaderboardEventRequest) leaderboards.RecordEventRequest {
	recordedAt := time.Time{}
	if parsed := parseOptionalRFC3339(request.RecordedAt); parsed != nil {
		recordedAt = *parsed
	}
	return leaderboards.RecordEventRequest{
		LeaderboardID:  strings.TrimSpace(id),
		PlayerID:       strings.TrimSpace(request.PlayerID),
		Score:          request.Score,
		SourceType:     strings.TrimSpace(request.SourceType),
		SourceID:       strings.TrimSpace(request.SourceID),
		IdempotencyKey: strings.TrimSpace(request.IdempotencyKey),
		Metadata:       request.Metadata,
		RecordedAt:     recordedAt,
	}
}

func parseLeaderboardPagination(r *stdhttp.Request) (limit int, offset int, err error) {
	limit = 50
	offset = 0
	if raw := strings.TrimSpace(r.URL.Query().Get("limit")); raw != "" {
		parsed, parseErr := strconv.Atoi(raw)
		if parseErr != nil || parsed <= 0 {
			return 0, 0, httpx.BadRequest("limit must be a positive integer", map[string]any{"field": "limit", "value": raw})
		}
		limit = parsed
	}
	if raw := strings.TrimSpace(r.URL.Query().Get("offset")); raw != "" {
		parsed, parseErr := strconv.Atoi(raw)
		if parseErr != nil || parsed < 0 {
			return 0, 0, httpx.BadRequest("offset must be zero or greater", map[string]any{"field": "offset", "value": raw})
		}
		offset = parsed
	}
	return limit, offset, nil
}

func parseOptionalRFC3339(raw string) *time.Time {
	value := strings.TrimSpace(raw)
	if value == "" {
		return nil
	}
	parsed, err := time.Parse(time.RFC3339, value)
	if err != nil {
		return nil
	}
	t := parsed.UTC().Truncate(time.Second)
	return &t
}

func mapLeaderboardError(err error) error {
	switch {
	case errors.Is(err, leaderboards.ErrInvalidRequest):
		return httpx.BadRequest("invalid leaderboard request", nil)
	case errors.Is(err, leaderboards.ErrLeaderboardNotFound):
		return httpx.NotFound("leaderboard not found")
	case errors.Is(err, leaderboards.ErrLeaderboardClosed):
		return httpx.Conflict("leaderboard is closed", nil)
	default:
		return err
	}
}

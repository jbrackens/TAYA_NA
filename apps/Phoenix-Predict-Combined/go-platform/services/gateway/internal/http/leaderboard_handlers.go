package http

import (
	"encoding/json"
	"errors"
	stdhttp "net/http"
	"regexp"
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
	Unit           string `json:"unit"`
	PrizeSummary   string `json:"prizeSummary"`
	RewardSummary  string `json:"rewardSummary"`
	WindowStartsAt string `json:"windowStartsAt"`
	WindowEndsAt   string `json:"windowEndsAt"`
	CreatedBy      string `json:"createdBy"`
}

type leaderboardEventRequest struct {
	PlayerID           string            `json:"playerId"`
	Score              float64           `json:"score"`
	SourceType         string            `json:"sourceType"`
	SourceID           string            `json:"sourceId"`
	ActivitySourceType string            `json:"activitySourceType"`
	ActivitySourceID   string            `json:"activitySourceId"`
	IdempotencyKey     string            `json:"idempotencyKey"`
	Metadata           map[string]string `json:"metadata"`
	RecordedAt         string            `json:"recordedAt"`
}

var leaderboardLaunchCopyProhibited = regexp.MustCompile(`(?i)(\$|\b(cash|cashout|deposit|withdraw|withdrawal|crypto|fiat|prize|payout|sportsbook|usdc|usd|dollars?|redeem)\b)`)
var leaderboardRedeemableCopyProhibited = regexp.MustCompile(`(?i)\bredeemable\b`)
var leaderboardNonRedeemableCopyAllowed = regexp.MustCompile(`(?i)\bnon-redeemable\b`)

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
			"items":      leaderboardDefinitionPayloads(items),
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
				"leaderboard": leaderboardDefinitionPayload(definition),
				"items":       leaderboardStandingPayloads(items),
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
			"leaderboard": leaderboardDefinitionPayload(definition),
			"topEntries":  leaderboardStandingPayloads(items),
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
				"items":      leaderboardDefinitionPayloads(items),
				"totalCount": len(items),
			})
		case stdhttp.MethodPost:
			request, err := decodeLeaderboardDefinitionRequest(r)
			if err != nil {
				return err
			}
			if err := validateLeaderboardLaunchCopy(request); err != nil {
				return err
			}
			created, err := service.CreateDefinition(toLeaderboardCreateRequest(request))
			if err != nil {
				return mapLeaderboardError(err)
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, leaderboardDefinitionPayload(created))
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
			request, err := decodeLeaderboardEventRequest(r)
			if err != nil {
				return err
			}
			event, err := service.RecordEvent(toLeaderboardEventRequest(id, request))
			if err != nil {
				return mapLeaderboardError(err)
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, leaderboardEventPayload(event))

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
				"leaderboard": leaderboardDefinitionPayload(definition),
				"items":       leaderboardStandingPayloads(items),
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
					"leaderboard": leaderboardDefinitionPayload(definition),
					"items":       leaderboardStandingPayloads(items),
				})
			case stdhttp.MethodPut:
				request, err := decodeLeaderboardDefinitionRequest(r)
				if err != nil {
					return err
				}
				if err := validateLeaderboardLaunchCopy(request); err != nil {
					return err
				}
				updated, err := service.UpdateDefinition(id, toLeaderboardCreateRequest(request))
				if err != nil {
					return mapLeaderboardError(err)
				}
				return httpx.WriteJSON(w, stdhttp.StatusOK, leaderboardDefinitionPayload(updated))
			default:
				return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet, stdhttp.MethodPut)
			}
		}
	}))
}

func decodeLeaderboardDefinitionRequest(r *stdhttp.Request) (leaderboardDefinitionRequest, error) {
	var fields map[string]json.RawMessage
	if err := json.NewDecoder(r.Body).Decode(&fields); err != nil {
		return leaderboardDefinitionRequest{}, httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
	}
	if _, ok := fields["currency"]; ok {
		return leaderboardDefinitionRequest{}, httpx.BadRequest("leaderboard unit must use PTS", map[string]any{"field": "unit"})
	}
	if _, ok := fields["prizeSummary"]; ok {
		return leaderboardDefinitionRequest{}, httpx.BadRequest("leaderboard rewardSummary must use launch rewardSummary", map[string]any{"field": "rewardSummary"})
	}
	raw, err := json.Marshal(fields)
	if err != nil {
		return leaderboardDefinitionRequest{}, httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
	}
	var request leaderboardDefinitionRequest
	if err := json.Unmarshal(raw, &request); err != nil {
		return leaderboardDefinitionRequest{}, httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
	}
	if err := validateLeaderboardLaunchContract(request); err != nil {
		return leaderboardDefinitionRequest{}, err
	}
	return request, nil
}

func decodeLeaderboardEventRequest(r *stdhttp.Request) (leaderboardEventRequest, error) {
	var fields map[string]json.RawMessage
	if err := json.NewDecoder(r.Body).Decode(&fields); err != nil {
		return leaderboardEventRequest{}, httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
	}
	if _, ok := fields["sourceType"]; ok {
		return leaderboardEventRequest{}, httpx.BadRequest("leaderboard event source must use activitySourceType", map[string]any{"field": "activitySourceType"})
	}
	if _, ok := fields["sourceId"]; ok {
		return leaderboardEventRequest{}, httpx.BadRequest("leaderboard event source must use activitySourceId", map[string]any{"field": "activitySourceId"})
	}
	raw, err := json.Marshal(fields)
	if err != nil {
		return leaderboardEventRequest{}, httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
	}
	var request leaderboardEventRequest
	if err := json.Unmarshal(raw, &request); err != nil {
		return leaderboardEventRequest{}, httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
	}
	if err := validateLeaderboardEventMetadata(request.Metadata); err != nil {
		return leaderboardEventRequest{}, err
	}
	return request, nil
}

func validateLeaderboardEventMetadata(metadata map[string]string) error {
	for key := range metadata {
		switch strings.TrimSpace(key) {
		case "betId":
			return httpx.BadRequest("leaderboard event metadata must use predictionId", map[string]any{"field": "metadata.predictionId"})
		case "stakeCents":
			return httpx.BadRequest("leaderboard event metadata must use pointVolumeCents", map[string]any{"field": "metadata.pointVolumeCents"})
		case "payoutCents":
			return httpx.BadRequest("leaderboard event metadata must use settlementPointsCents", map[string]any{"field": "metadata.settlementPointsCents"})
		case "sourceType":
			return httpx.BadRequest("leaderboard event metadata must use activitySourceType", map[string]any{"field": "metadata.activitySourceType"})
		case "sourceId":
			return httpx.BadRequest("leaderboard event metadata must use activitySourceId", map[string]any{"field": "metadata.activitySourceId"})
		}
	}
	return nil
}

func validateLeaderboardLaunchContract(request leaderboardDefinitionRequest) error {
	switch strings.TrimSpace(request.MetricKey) {
	case "net_profit_cents", "stake_cents":
		return httpx.BadRequest("leaderboard metricKey must use point-native metric aliases", map[string]any{"field": "metricKey"})
	}
	if unit := strings.TrimSpace(request.Unit); unit != "" && !strings.EqualFold(unit, "PTS") {
		return httpx.BadRequest("leaderboard unit must use PTS", map[string]any{"field": "unit"})
	}
	return nil
}

func validateLeaderboardLaunchCopy(request leaderboardDefinitionRequest) error {
	fields := []struct {
		name  string
		value string
	}{
		{name: "slug", value: request.Slug},
		{name: "name", value: request.Name},
		{name: "description", value: request.Description},
		{name: "rewardSummary", value: request.RewardSummary},
	}
	for _, field := range fields {
		if leaderboardLaunchCopyHasProhibitedTerm(field.value) {
			return httpx.BadRequest("leaderboard "+field.name+" must use non-redeemable point status wording", map[string]any{"field": field.name})
		}
	}
	return nil
}

func leaderboardLaunchCopyHasProhibitedTerm(value string) bool {
	if leaderboardLaunchCopyProhibited.MatchString(value) {
		return true
	}
	redeemableCandidate := leaderboardNonRedeemableCopyAllowed.ReplaceAllString(value, "")
	return leaderboardRedeemableCopyProhibited.MatchString(redeemableCandidate)
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
	return leaderboardStandingPayload(*entry), nil
}

func leaderboardDefinitionPayloads(definitions []canonicalv1.LeaderboardDefinition) []map[string]any {
	out := make([]map[string]any, 0, len(definitions))
	for _, definition := range definitions {
		out = append(out, leaderboardDefinitionPayload(definition))
	}
	return out
}

func leaderboardDefinitionPayload(definition canonicalv1.LeaderboardDefinition) map[string]any {
	unit := normalizeLeaderboardUnit(definition.Currency)
	rewardSummary := normalizeLeaderboardRewardSummary(definition.PrizeSummary)
	pointMetricKey := pointLeaderboardMetricKey(definition.MetricKey)
	return map[string]any{
		"leaderboardId":  definition.LeaderboardID,
		"slug":           redactLeaderboardLaunchCopy(definition.Slug),
		"name":           redactLeaderboardLaunchCopy(definition.Name),
		"description":    redactLeaderboardLaunchCopy(definition.Description),
		"metricKey":      pointMetricKey,
		"pointMetricKey": pointMetricKey,
		"eventType":      definition.EventType,
		"rankingMode":    definition.RankingMode,
		"order":          definition.Order,
		"status":         definition.Status,
		"unit":           unit,
		"rewardSummary":  redactLeaderboardLaunchCopy(rewardSummary),
		"windowStartsAt": definition.WindowStartsAt,
		"windowEndsAt":   definition.WindowEndsAt,
		"lastComputedAt": definition.LastComputedAt,
		"createdBy":      definition.CreatedBy,
		"createdAt":      definition.CreatedAt,
		"updatedAt":      definition.UpdatedAt,
	}
}

func redactLeaderboardLaunchCopy(value string) string {
	if leaderboardLaunchCopyHasProhibitedTerm(value) {
		return launchRedactedUserText
	}
	return value
}

func leaderboardEventPayload(event canonicalv1.LeaderboardEvent) map[string]any {
	return map[string]any{
		"eventId":            event.EventID,
		"leaderboardId":      event.LeaderboardID,
		"playerId":           event.PlayerID,
		"score":              event.Score,
		"activitySourceType": leaderboardActivitySourceType(event.SourceType),
		"activitySourceId":   leaderboardActivitySourceID(event.SourceID),
		"idempotencyKey":     event.IdempotencyKey,
		"metadata":           leaderboardMetadataPayload(event.Metadata),
		"recordedAt":         event.RecordedAt,
		"unit":               "PTS",
	}
}

func leaderboardStandingPayloads(standings []canonicalv1.LeaderboardStanding) []map[string]any {
	out := make([]map[string]any, 0, len(standings))
	for _, standing := range standings {
		out = append(out, leaderboardStandingPayload(standing))
	}
	return out
}

func leaderboardStandingPayload(standing canonicalv1.LeaderboardStanding) map[string]any {
	payload := map[string]any{
		"leaderboardId": standing.LeaderboardID,
		"playerId":      standing.PlayerID,
		"rank":          standing.Rank,
		"score":         standing.Score,
		"eventCount":    standing.EventCount,
		"unit":          "PTS",
	}
	if standing.LastEventAt != nil {
		payload["lastEventAt"] = standing.LastEventAt.UTC().Truncate(time.Second)
	}
	if metadata := leaderboardMetadataPayload(standing.Metadata); metadata != nil {
		payload["metadata"] = metadata
	}
	return payload
}

func leaderboardMetadataPayload(in map[string]string) map[string]string {
	if len(in) == 0 {
		return nil
	}
	out := make(map[string]string, len(in))
	for key, value := range in {
		switch strings.TrimSpace(key) {
		case "betId":
			out["predictionId"] = leaderboardActivitySourceID(value)
		case "stakeCents":
			out["pointVolumeCents"] = value
		case "payoutCents":
			out["settlementPointsCents"] = value
		case "sourceType":
			out["activitySourceType"] = leaderboardActivitySourceType(value)
		case "sourceId":
			out["activitySourceId"] = leaderboardActivitySourceID(value)
		default:
			out[key] = leaderboardLaunchMetadataValue(value)
		}
	}
	return out
}

func leaderboardLaunchMetadataValue(value string) string {
	value = strings.TrimSpace(value)
	value = strings.ReplaceAll(value, "bet_settlement", "prediction_settlement")
	value = strings.ReplaceAll(value, "settled_bet", "prediction_settlement")
	value = strings.ReplaceAll(value, "settled bet", "prediction settlement")
	if strings.HasPrefix(value, "bet:") {
		return leaderboardActivitySourceID(value)
	}
	return redactLaunchProhibitedUserText(value)
}

func leaderboardActivitySourceType(sourceType string) string {
	switch strings.TrimSpace(sourceType) {
	case "bet_settlement":
		return "prediction_settlement"
	default:
		return strings.TrimSpace(sourceType)
	}
}

func leaderboardActivitySourceID(sourceID string) string {
	value := strings.TrimSpace(sourceID)
	if strings.HasPrefix(value, "bet:") {
		return "prediction:" + strings.TrimPrefix(value, "bet:")
	}
	return value
}

func pointLeaderboardMetricKey(metricKey string) string {
	switch strings.TrimSpace(metricKey) {
	case "net_profit_cents":
		return "net_points"
	case "stake_cents":
		return "point_volume"
	default:
		return strings.TrimSpace(metricKey)
	}
}

func serviceLeaderboardMetricKey(metricKey string) string {
	switch strings.TrimSpace(metricKey) {
	case "net_points":
		return "net_profit_cents"
	case "point_volume":
		return "stake_cents"
	default:
		return strings.TrimSpace(metricKey)
	}
}

func normalizeLeaderboardUnit(unit string) string {
	value := strings.ToUpper(strings.TrimSpace(unit))
	if value == "" || value == "USD" {
		return "PTS"
	}
	return value
}

func normalizeLeaderboardRewardSummary(summary string) string {
	value := strings.TrimSpace(summary)
	switch value {
	case "Top 10 share a cash bonus.":
		return "Top 10 earn leaderboard status and XP boosts."
	case "Top 10 shared a cash bonus.":
		return "Top 10 earned leaderboard status and XP boosts."
	case "Luxury prizes for the top 5.":
		return "Top 5 earn non-redeemable VIP status boosts."
	default:
		return value
	}
}

func toLeaderboardCreateRequest(request leaderboardDefinitionRequest) leaderboards.CreateDefinitionRequest {
	unit := normalizeLeaderboardUnit(request.Unit)
	rewardSummary := normalizeLeaderboardRewardSummary(request.RewardSummary)
	return leaderboards.CreateDefinitionRequest{
		Slug:           strings.TrimSpace(request.Slug),
		Name:           strings.TrimSpace(request.Name),
		Description:    strings.TrimSpace(request.Description),
		MetricKey:      serviceLeaderboardMetricKey(request.MetricKey),
		EventType:      strings.TrimSpace(request.EventType),
		RankingMode:    canonicalv1.LeaderboardRankingMode(strings.TrimSpace(request.RankingMode)),
		Order:          canonicalv1.LeaderboardOrder(strings.TrimSpace(request.Order)),
		Status:         canonicalv1.LeaderboardStatus(strings.TrimSpace(request.Status)),
		Currency:       unit,
		PrizeSummary:   rewardSummary,
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
		SourceType:     strings.TrimSpace(request.ActivitySourceType),
		SourceID:       strings.TrimSpace(request.ActivitySourceID),
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
	if limit > 200 {
		// Clamp the public, unauthenticated leaderboard page size (SECURITY-REVIEW
		// #16: ?limit=100000000 → full-table sort/DoS).
		limit = 200
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

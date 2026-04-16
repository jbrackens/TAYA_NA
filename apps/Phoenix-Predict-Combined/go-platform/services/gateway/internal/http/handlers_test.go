package http

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"phoenix-revival/gateway/internal/domain"
	"phoenix-revival/gateway/internal/matchtracker"
	canonicalv1 "phoenix-revival/platform/canonical/v1"
	"phoenix-revival/platform/transport/httpx"
)

type marketListResponse struct {
	Data         []legacyMarketNavigation `json:"data"`
	CurrentPage  int                      `json:"currentPage"`
	ItemsPerPage int                      `json:"itemsPerPage"`
	TotalCount   int                      `json:"totalCount"`
	HasNextPage  bool                     `json:"hasNextPage"`
}

type adminMarketListResponse struct {
	Items      []domain.Market `json:"items"`
	Pagination domain.PageMeta `json:"pagination"`
}

type sportCatalogListResponse struct {
	Items []sportCatalogItem `json:"items"`
}

type sportLeagueListResponse struct {
	SportKey string            `json:"sportKey"`
	Items    []sportLeagueItem `json:"items"`
}

type sportEventListResponse struct {
	SportKey   string           `json:"sportKey"`
	Items      []sportEventItem `json:"items"`
	Pagination domain.PageMeta  `json:"pagination"`
}

type sportEventMarketsListResponse struct {
	SportKey   string          `json:"sportKey"`
	EventKey   string          `json:"eventKey"`
	FixtureID  string          `json:"fixtureId"`
	Items      []domain.Market `json:"items"`
	Pagination domain.PageMeta `json:"pagination"`
}

type reconciliationLifecycleFixture struct {
	Cases []reconciliationLifecycleCase `json:"cases"`
}

type reconciliationLifecycleCase struct {
	Name               string                    `json:"name"`
	UserID             string                    `json:"userId"`
	SeedCents          int64                     `json:"seedCents"`
	StakeCents         int64                     `json:"stakeCents"`
	Odds               float64                   `json:"odds"`
	PlacedSelectionID  string                    `json:"placedSelectionId"`
	WinningSelectionID string                    `json:"winningSelectionId,omitempty"`
	PostLifecycle      string                    `json:"postLifecycle,omitempty"`
	Expected           reconciliationExpectation `json:"expected"`
}

type reconciliationExpectation struct {
	TotalCreditsCents int64 `json:"totalCreditsCents"`
	TotalDebitsCents  int64 `json:"totalDebitsCents"`
	NetMovementCents  int64 `json:"netMovementCents"`
	EntryCount        int64 `json:"entryCount"`
	DistinctUserCount int64 `json:"distinctUserCount"`
}

func TestMarketsListSupportsFiltersPaginationAndSorting(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/markets?fixtureId=f:local:001&status=open&page=1&pageSize=1&sortBy=name&sortDir=asc", nil)
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d, body=%s", res.Code, res.Body.String())
	}

	var payload marketListResponse
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if payload.TotalCount != 2 {
		t.Fatalf("expected total=2, got %d", payload.TotalCount)
	}
	if payload.CurrentPage != 1 || payload.ItemsPerPage != 1 {
		t.Fatalf("unexpected pagination: currentPage=%d itemsPerPage=%d", payload.CurrentPage, payload.ItemsPerPage)
	}
	if !payload.HasNextPage {
		t.Fatalf("expected hasNextPage=true")
	}
	if len(payload.Data) != 1 {
		t.Fatalf("expected one market item, got %d", len(payload.Data))
	}
	if payload.Data[0].Market.MarketName != "Match Winner" {
		t.Fatalf("unexpected first market: %s", payload.Data[0].Market.MarketName)
	}
	if payload.Data[0].Market.CurrentLifecycle.Type != "BETTABLE" {
		t.Fatalf("expected BETTABLE lifecycle, got %s", payload.Data[0].Market.CurrentLifecycle.Type)
	}
}

func TestMarketsListRejectsInvalidSortField(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/markets?sortBy=badField", nil)
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d, body=%s", res.Code, res.Body.String())
	}

	var envelope httpx.ErrorEnvelope
	if err := json.Unmarshal(res.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("decode error response: %v", err)
	}
	if envelope.Error.Code != httpx.CodeBadRequest {
		t.Fatalf("expected error code %q, got %q", httpx.CodeBadRequest, envelope.Error.Code)
	}
}

func TestFixtureByIDNotFoundReturnsStructuredError(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/fixtures/f:local:999", nil)
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusNotFound {
		t.Fatalf("expected status 404, got %d, body=%s", res.Code, res.Body.String())
	}

	var envelope httpx.ErrorEnvelope
	if err := json.Unmarshal(res.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("decode error payload: %v", err)
	}
	if envelope.Error.Code != httpx.CodeNotFound {
		t.Fatalf("expected error code %q, got %q", httpx.CodeNotFound, envelope.Error.Code)
	}
}

func TestSportsCatalogReturnsAggregatedSports(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/sports", nil)
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d, body=%s", res.Code, res.Body.String())
	}

	var payload sportCatalogListResponse
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if len(payload.Items) == 0 {
		t.Fatalf("expected at least one sport item")
	}
	if payload.Items[0].SportKey != "esports" {
		t.Fatalf("expected first sport key esports, got %s", payload.Items[0].SportKey)
	}
	if payload.Items[0].EventCount == 0 {
		t.Fatalf("expected events for esports catalog item")
	}
}

func TestSportLeaguesBySportKeyReturnsLeagues(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/sports/esports/leagues", nil)
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d, body=%s", res.Code, res.Body.String())
	}

	var payload sportLeagueListResponse
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if payload.SportKey != "esports" {
		t.Fatalf("expected sport key esports, got %s", payload.SportKey)
	}
	if len(payload.Items) < 2 {
		t.Fatalf("expected at least 2 leagues, got %d", len(payload.Items))
	}
}

func TestSportEventsFiltersByLeagueAndPaginates(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/sports/esports/events?leagueKey=premier-league&page=1&pageSize=10", nil)
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d, body=%s", res.Code, res.Body.String())
	}

	var payload sportEventListResponse
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if payload.SportKey != "esports" {
		t.Fatalf("expected sport key esports, got %s", payload.SportKey)
	}
	if payload.Pagination.Total != 1 || len(payload.Items) != 1 {
		t.Fatalf("expected one filtered event, got total=%d len=%d", payload.Pagination.Total, len(payload.Items))
	}
	if payload.Items[0].LeagueKey != "premier-league" {
		t.Fatalf("expected premier-league key, got %s", payload.Items[0].LeagueKey)
	}
}

func TestSportEventByKeyAndMarketsEndpoints(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	eventReq := httptest.NewRequest(http.MethodGet, "/api/v1/sports/esports/events/f:local:001", nil)
	eventRes := httptest.NewRecorder()
	handler.ServeHTTP(eventRes, eventReq)

	if eventRes.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d, body=%s", eventRes.Code, eventRes.Body.String())
	}

	var eventPayload sportEventItem
	if err := json.Unmarshal(eventRes.Body.Bytes(), &eventPayload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if eventPayload.EventKey != "f:local:001" {
		t.Fatalf("expected event key f:local:001, got %s", eventPayload.EventKey)
	}
	if eventPayload.MarketsTotalCount != 2 {
		t.Fatalf("expected markets count 2, got %d", eventPayload.MarketsTotalCount)
	}

	marketsReq := httptest.NewRequest(http.MethodGet, "/api/v1/sports/esports/events/f:local:001/markets?status=open&page=1&pageSize=10", nil)
	marketsRes := httptest.NewRecorder()
	handler.ServeHTTP(marketsRes, marketsReq)

	if marketsRes.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d, body=%s", marketsRes.Code, marketsRes.Body.String())
	}

	var marketsPayload sportEventMarketsListResponse
	if err := json.Unmarshal(marketsRes.Body.Bytes(), &marketsPayload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if marketsPayload.SportKey != "esports" || marketsPayload.EventKey != "f:local:001" {
		t.Fatalf("unexpected sport/event keys: sport=%s event=%s", marketsPayload.SportKey, marketsPayload.EventKey)
	}
	if marketsPayload.Pagination.Total != 2 || len(marketsPayload.Items) != 2 {
		t.Fatalf("expected 2 open markets, got total=%d len=%d", marketsPayload.Pagination.Total, len(marketsPayload.Items))
	}
}

func TestEsportsCompatibilityEventMarketsRoute(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/esports/events/f:local:001/markets?status=open&page=1&pageSize=10", nil)
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d, body=%s", res.Code, res.Body.String())
	}

	var payload sportEventMarketsListResponse
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if payload.EventKey != "f:local:001" {
		t.Fatalf("expected compatibility event key f:local:001, got %s", payload.EventKey)
	}
}

func TestSportRouteUnknownSportReturnsNotFound(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/sports/cricket/leagues", nil)
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusNotFound {
		t.Fatalf("expected status 404, got %d, body=%s", res.Code, res.Body.String())
	}
}

func TestMatchTrackerByFixtureIDReturnsTimelineSkeleton(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/match-tracker/fixtures/f:local:001", nil)
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d, body=%s", res.Code, res.Body.String())
	}

	var payload struct {
		FixtureID string `json:"fixtureId"`
		Status    string `json:"status"`
		Period    string `json:"period"`
		Score     struct {
			Home int `json:"home"`
			Away int `json:"away"`
		} `json:"score"`
		Incidents []struct {
			IncidentID string            `json:"incidentId"`
			FixtureID  string            `json:"fixtureId"`
			Type       string            `json:"type"`
			Details    map[string]string `json:"details"`
		} `json:"incidents"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if payload.FixtureID != "f:local:001" {
		t.Fatalf("expected fixtureId f:local:001, got %s", payload.FixtureID)
	}
	if payload.Status == "" {
		t.Fatalf("expected non-empty status")
	}
	if payload.Period == "" {
		t.Fatalf("expected non-empty period")
	}
	if len(payload.Incidents) == 0 {
		t.Fatalf("expected at least one incident")
	}
	if payload.Incidents[0].FixtureID != payload.FixtureID {
		t.Fatalf("expected incident fixture id %s, got %s", payload.FixtureID, payload.Incidents[0].FixtureID)
	}
}

func TestMatchTrackerByFixtureIDPrefersProviderTimelineService(t *testing.T) {
	mux := http.NewServeMux()
	repository := domain.NewInMemoryReadRepository()
	timelineService := matchtracker.NewService()
	updatedAt := time.Date(2026, 3, 4, 15, 0, 0, 0, time.UTC)
	timelineService.UpsertTimeline(canonicalv1.MatchTimeline{
		FixtureID:    "f:local:001",
		Status:       canonicalv1.FixtureStatusInPlay,
		Period:       "2H",
		ClockSeconds: 3720,
		Score: canonicalv1.MatchScore{
			Home: 2,
			Away: 1,
		},
		UpdatedAt: updatedAt,
		Incidents: []canonicalv1.MatchIncident{
			{
				IncidentID:   "inc:f-local-001:goal:3",
				FixtureID:    "f:local:001",
				Type:         canonicalv1.MatchIncidentGoal,
				Period:       "2H",
				ClockSeconds: 3600,
				Score: canonicalv1.MatchScore{
					Home: 2,
					Away: 1,
				},
				OccurredAt: updatedAt,
			},
		},
	})

	registerMatchTrackerRoutes(mux, repository, timelineService)
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/match-tracker/fixtures/f:local:001", nil)
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d, body=%s", res.Code, res.Body.String())
	}

	var payload struct {
		FixtureID string `json:"fixtureId"`
		Status    string `json:"status"`
		Period    string `json:"period"`
		Score     struct {
			Home int `json:"home"`
			Away int `json:"away"`
		} `json:"score"`
		Incidents []struct {
			IncidentID string `json:"incidentId"`
		} `json:"incidents"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if payload.FixtureID != "f:local:001" {
		t.Fatalf("expected fixtureId f:local:001, got %s", payload.FixtureID)
	}
	if payload.Status != string(canonicalv1.FixtureStatusInPlay) {
		t.Fatalf("expected status in_play, got %s", payload.Status)
	}
	if payload.Period != "2H" {
		t.Fatalf("expected period 2H, got %s", payload.Period)
	}
	if payload.Score.Home != 2 || payload.Score.Away != 1 {
		t.Fatalf("expected score 2-1, got %d-%d", payload.Score.Home, payload.Score.Away)
	}
	if len(payload.Incidents) != 1 || payload.Incidents[0].IncidentID != "inc:f-local-001:goal:3" {
		t.Fatalf("unexpected incidents payload: %+v", payload.Incidents)
	}
}

func TestMatchTrackerByFixtureIDNotFoundReturnsStructuredError(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/match-tracker/fixtures/f:local:999", nil)
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusNotFound {
		t.Fatalf("expected status 404, got %d, body=%s", res.Code, res.Body.String())
	}

	var envelope httpx.ErrorEnvelope
	if err := json.Unmarshal(res.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("decode error payload: %v", err)
	}
	if envelope.Error.Code != httpx.CodeNotFound {
		t.Fatalf("expected error code %q, got %q", httpx.CodeNotFound, envelope.Error.Code)
	}
}

func TestFixtureStatsByFixtureIDReturnsStatsSkeleton(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/stats/fixtures/f:local:001", nil)
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d, body=%s", res.Code, res.Body.String())
	}

	var payload struct {
		FixtureID string `json:"fixtureId"`
		Status    string `json:"status"`
		Period    string `json:"period"`
		Metrics   map[string]struct {
			Home float64 `json:"home"`
			Away float64 `json:"away"`
			Unit string  `json:"unit"`
		} `json:"metrics"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if payload.FixtureID != "f:local:001" {
		t.Fatalf("expected fixtureId f:local:001, got %s", payload.FixtureID)
	}
	if payload.Status == "" || payload.Period == "" {
		t.Fatalf("expected non-empty status/period")
	}
	if len(payload.Metrics) == 0 {
		t.Fatalf("expected non-empty stats metrics")
	}
	if _, exists := payload.Metrics["shots_on_target"]; !exists {
		t.Fatalf("expected shots_on_target metric, got %+v", payload.Metrics)
	}
}

func TestFixtureStatsByFixtureIDNotFoundReturnsStructuredError(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/stats/fixtures/f:local:999", nil)
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusNotFound {
		t.Fatalf("expected status 404, got %d, body=%s", res.Code, res.Body.String())
	}

	var envelope httpx.ErrorEnvelope
	if err := json.Unmarshal(res.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("decode error payload: %v", err)
	}
	if envelope.Error.Code != httpx.CodeNotFound {
		t.Fatalf("expected error code %q, got %q", httpx.CodeNotFound, envelope.Error.Code)
	}
}

func TestFreebetsListByUserReturnsItems(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/freebets?userId=u-1", nil)
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d, body=%s", res.Code, res.Body.String())
	}

	var payload struct {
		Items []struct {
			FreebetID string `json:"freebetId"`
			Status    string `json:"status"`
		} `json:"items"`
		TotalCount int `json:"totalCount"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if payload.TotalCount == 0 || len(payload.Items) == 0 {
		t.Fatalf("expected non-empty freebets payload: %+v", payload)
	}
	if payload.Items[0].FreebetID == "" {
		t.Fatalf("expected non-empty freebet id")
	}
}

func TestFreebetByIDNotFoundReturnsStructuredError(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/freebets/fb:missing", nil)
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusNotFound {
		t.Fatalf("expected status 404, got %d, body=%s", res.Code, res.Body.String())
	}

	var envelope httpx.ErrorEnvelope
	if err := json.Unmarshal(res.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("decode error payload: %v", err)
	}
	if envelope.Error.Code != httpx.CodeNotFound {
		t.Fatalf("expected error code %q, got %q", httpx.CodeNotFound, envelope.Error.Code)
	}
}

func TestOddsBoostsListByUserReturnsItems(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/odds-boosts?userId=u-1", nil)
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d, body=%s", res.Code, res.Body.String())
	}

	var payload struct {
		Items []struct {
			OddsBoostID string `json:"oddsBoostId"`
			Status      string `json:"status"`
		} `json:"items"`
		TotalCount int `json:"totalCount"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if payload.TotalCount == 0 || len(payload.Items) == 0 {
		t.Fatalf("expected non-empty odds boosts payload: %+v", payload)
	}
	if payload.Items[0].OddsBoostID == "" {
		t.Fatalf("expected non-empty odds boost id")
	}
}

func TestOddsBoostAcceptLifecycleAndIdempotency(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	acceptBody := `{"userId":"u-1","requestId":"odds-boost-accept-1","reason":"use in betslip"}`
	acceptReq := httptest.NewRequest(http.MethodPost, "/api/v1/odds-boosts/ob:local:001/accept", strings.NewReader(acceptBody))
	acceptRes := httptest.NewRecorder()
	handler.ServeHTTP(acceptRes, acceptReq)

	if acceptRes.Code != http.StatusOK {
		t.Fatalf("expected first accept status 200, got %d, body=%s", acceptRes.Code, acceptRes.Body.String())
	}

	var firstPayload struct {
		OddsBoostID     string `json:"oddsBoostId"`
		Status          string `json:"status"`
		AcceptRequestID string `json:"acceptRequestId"`
	}
	if err := json.Unmarshal(acceptRes.Body.Bytes(), &firstPayload); err != nil {
		t.Fatalf("decode first accept response: %v", err)
	}
	if firstPayload.OddsBoostID != "ob:local:001" {
		t.Fatalf("expected ob:local:001, got %s", firstPayload.OddsBoostID)
	}
	if firstPayload.Status != "accepted" {
		t.Fatalf("expected accepted status, got %s", firstPayload.Status)
	}
	if firstPayload.AcceptRequestID != "odds-boost-accept-1" {
		t.Fatalf("expected acceptRequestId odds-boost-accept-1, got %s", firstPayload.AcceptRequestID)
	}

	replayReq := httptest.NewRequest(http.MethodPost, "/api/v1/odds-boosts/ob:local:001/accept", strings.NewReader(acceptBody))
	replayRes := httptest.NewRecorder()
	handler.ServeHTTP(replayRes, replayReq)

	if replayRes.Code != http.StatusOK {
		t.Fatalf("expected replay accept status 200, got %d, body=%s", replayRes.Code, replayRes.Body.String())
	}
}

func TestOddsBoostAcceptWrongUserReturnsForbidden(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	req := httptest.NewRequest(
		http.MethodPost,
		"/api/v1/odds-boosts/ob:local:001/accept",
		strings.NewReader(`{"userId":"u-2","requestId":"odds-boost-accept-forbidden"}`),
	)
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusForbidden {
		t.Fatalf("expected status 403, got %d, body=%s", res.Code, res.Body.String())
	}
}

func TestOddsBoostByIDNotFoundReturnsStructuredError(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/odds-boosts/ob:missing", nil)
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusNotFound {
		t.Fatalf("expected status 404, got %d, body=%s", res.Code, res.Body.String())
	}

	var envelope httpx.ErrorEnvelope
	if err := json.Unmarshal(res.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("decode error payload: %v", err)
	}
	if envelope.Error.Code != httpx.CodeNotFound {
		t.Fatalf("expected error code %q, got %q", httpx.CodeNotFound, envelope.Error.Code)
	}
}

func TestBetPlaceWithPromoFieldsAppliesAcceptedPromotions(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	creditReq := httptest.NewRequest(http.MethodPost, "/api/v1/wallet/credit", strings.NewReader(`{"userId":"u-1","amountCents":1000,"idempotencyKey":"seed-promo-http"}`))
	creditRes := httptest.NewRecorder()
	handler.ServeHTTP(creditRes, creditReq)
	if creditRes.Code != http.StatusOK {
		t.Fatalf("seed credit failed: status=%d body=%s", creditRes.Code, creditRes.Body.String())
	}

	acceptReq := httptest.NewRequest(http.MethodPost, "/api/v1/odds-boosts/ob:local:001/accept", strings.NewReader(`{"userId":"u-1","requestId":"promo-http-accept-1"}`))
	acceptRes := httptest.NewRecorder()
	handler.ServeHTTP(acceptRes, acceptReq)
	if acceptRes.Code != http.StatusOK {
		t.Fatalf("odds boost accept failed: status=%d body=%s", acceptRes.Code, acceptRes.Body.String())
	}

	placeBody := `{"userId":"u-1","requestId":"promo-http-place-1","marketId":"m:local:001","selectionId":"home","stakeCents":1000,"odds":2.05,"freebetId":"fb:local:001","oddsBoostId":"ob:local:001","idempotencyKey":"promo-http-place-1"}`
	placeReq := httptest.NewRequest(http.MethodPost, "/api/v1/bets/place", strings.NewReader(placeBody))
	placeRes := httptest.NewRecorder()
	handler.ServeHTTP(placeRes, placeReq)

	if placeRes.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d, body=%s", placeRes.Code, placeRes.Body.String())
	}

	var payload struct {
		FreebetID           string `json:"freebetId"`
		FreebetAppliedCents int64  `json:"freebetAppliedCents"`
		OddsBoostID         string `json:"oddsBoostId"`
	}
	if err := json.Unmarshal(placeRes.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode place response: %v", err)
	}
	if payload.FreebetID != "fb:local:001" {
		t.Fatalf("expected freebetId fb:local:001, got %s", payload.FreebetID)
	}
	if payload.FreebetAppliedCents != 1000 {
		t.Fatalf("expected freebetAppliedCents=1000, got %d", payload.FreebetAppliedCents)
	}
	if payload.OddsBoostID != "ob:local:001" {
		t.Fatalf("expected oddsBoostId ob:local:001, got %s", payload.OddsBoostID)
	}
}

func TestBetPlaceWithUnacceptedOddsBoostReturnsReasonCode(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	creditReq := httptest.NewRequest(http.MethodPost, "/api/v1/wallet/credit", strings.NewReader(`{"userId":"u-1","amountCents":1000,"idempotencyKey":"seed-promo-http-2"}`))
	creditRes := httptest.NewRecorder()
	handler.ServeHTTP(creditRes, creditReq)
	if creditRes.Code != http.StatusOK {
		t.Fatalf("seed credit failed: status=%d body=%s", creditRes.Code, creditRes.Body.String())
	}

	placeBody := `{"userId":"u-1","requestId":"promo-http-place-2","marketId":"m:local:001","selectionId":"home","stakeCents":300,"odds":2.05,"oddsBoostId":"ob:local:001","idempotencyKey":"promo-http-place-2"}`
	placeReq := httptest.NewRequest(http.MethodPost, "/api/v1/bets/place", strings.NewReader(placeBody))
	placeRes := httptest.NewRecorder()
	handler.ServeHTTP(placeRes, placeReq)

	if placeRes.Code != http.StatusConflict {
		t.Fatalf("expected status 409, got %d, body=%s", placeRes.Code, placeRes.Body.String())
	}

	var envelope httpx.ErrorEnvelope
	if err := json.Unmarshal(placeRes.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("decode error payload: %v", err)
	}
	details, _ := envelope.Error.Details.(map[string]any)
	reasonCode, _ := details["reasonCode"].(string)
	if reasonCode != "odds_boost_not_eligible" {
		t.Fatalf("expected reasonCode odds_boost_not_eligible, got %s", reasonCode)
	}
}

func TestBetPrecheckWithUnacceptedOddsBoostReturnsReasonCode(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	precheckBody := `{"userId":"u-1","requestId":"promo-http-precheck-1","marketId":"m:local:001","selectionId":"home","stakeCents":300,"odds":2.05,"oddsBoostId":"ob:local:001"}`
	precheckReq := httptest.NewRequest(http.MethodPost, "/api/v1/bets/precheck", strings.NewReader(precheckBody))
	precheckRes := httptest.NewRecorder()
	handler.ServeHTTP(precheckRes, precheckReq)

	if precheckRes.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d, body=%s", precheckRes.Code, precheckRes.Body.String())
	}

	var payload struct {
		Allowed    bool   `json:"allowed"`
		ReasonCode string `json:"reasonCode"`
	}
	if err := json.Unmarshal(precheckRes.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode precheck response: %v", err)
	}
	if payload.Allowed {
		t.Fatal("expected precheck to be rejected for unaccepted odds boost")
	}
	if payload.ReasonCode != "odds_boost_not_eligible" {
		t.Fatalf("expected reasonCode odds_boost_not_eligible, got %s", payload.ReasonCode)
	}
}

func TestAdminTradingMarketsListRequiresAdminRole(t *testing.T) {
	t.Setenv("GATEWAY_ALLOW_ADMIN_ANON", "")
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	req := httptest.NewRequest(http.MethodGet, "/admin/trading/markets?status=open&page=1&pageSize=5", nil)
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusForbidden {
		t.Fatalf("expected status 403, got %d, body=%s", res.Code, res.Body.String())
	}
}

func TestAdminTradingMarketsListLegacyPathWithAdminRole(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	req := httptest.NewRequest(http.MethodGet, "/admin/trading/markets?status=open&page=1&pageSize=5", nil)
	req.Header.Set("X-Admin-Role", "admin")
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d, body=%s", res.Code, res.Body.String())
	}

	var payload adminMarketListResponse
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if payload.Pagination.Total != 2 {
		t.Fatalf("expected 2 open markets, got %d", payload.Pagination.Total)
	}
}

func TestAdminTradingFixturesListApiV1Path(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/trading/fixtures?tournament=Premier&page=1&pageSize=10", nil)
	req.Header.Set("X-Admin-Role", "admin")
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d, body=%s", res.Code, res.Body.String())
	}

	var payload struct {
		Items      []domain.Fixture `json:"items"`
		Pagination domain.PageMeta  `json:"pagination"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if payload.Pagination.Total != 1 {
		t.Fatalf("expected one fixture for tournament filter, got %d", payload.Pagination.Total)
	}
	if len(payload.Items) != 1 || payload.Items[0].ID != "f:local:001" {
		t.Fatalf("unexpected fixtures payload: %+v", payload.Items)
	}
}

func TestAdminPuntersListApiV1PathWithAdminRole(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/punters?status=active&search=alice&page=1&pageSize=10&sortBy=email&sortDir=asc", nil)
	req.Header.Set("X-Admin-Role", "admin")
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d, body=%s", res.Code, res.Body.String())
	}

	var payload struct {
		Items      []domain.Punter `json:"items"`
		Pagination domain.PageMeta `json:"pagination"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if payload.Pagination.Total != 1 || len(payload.Items) != 1 {
		t.Fatalf("expected one active punter, got total=%d len=%d", payload.Pagination.Total, len(payload.Items))
	}
	if payload.Items[0].ID != "p:local:001" {
		t.Fatalf("unexpected punter id: %s", payload.Items[0].ID)
	}
}

func TestAdminPunterByIDNotFoundReturnsStructuredError(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	req := httptest.NewRequest(http.MethodGet, "/admin/punters/p:local:999", nil)
	req.Header.Set("X-Admin-Role", "admin")
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusNotFound {
		t.Fatalf("expected status 404, got %d, body=%s", res.Code, res.Body.String())
	}

	var envelope httpx.ErrorEnvelope
	if err := json.Unmarshal(res.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("decode error payload: %v", err)
	}
	if envelope.Error.Code != httpx.CodeNotFound {
		t.Fatalf("expected error code %q, got %q", httpx.CodeNotFound, envelope.Error.Code)
	}
}

func TestAdminPunterStatusUpdateApiV1Path(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	req := httptest.NewRequest(
		http.MethodPut,
		"/api/v1/admin/punters/p:local:001/status",
		strings.NewReader(`{"status":"suspended"}`),
	)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Admin-Role", "admin")
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d, body=%s", res.Code, res.Body.String())
	}

	var payload domain.Punter
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if payload.Status != "suspended" {
		t.Fatalf("expected updated status suspended, got %s", payload.Status)
	}

	verifyReq := httptest.NewRequest(http.MethodGet, "/api/v1/admin/punters/p:local:001", nil)
	verifyReq.Header.Set("X-Admin-Role", "admin")
	verifyRes := httptest.NewRecorder()
	handler.ServeHTTP(verifyRes, verifyReq)

	if verifyRes.Code != http.StatusOK {
		t.Fatalf("expected verify status 200, got %d, body=%s", verifyRes.Code, verifyRes.Body.String())
	}

	var verifyPayload domain.Punter
	if err := json.Unmarshal(verifyRes.Body.Bytes(), &verifyPayload); err != nil {
		t.Fatalf("decode verify response: %v", err)
	}
	if verifyPayload.Status != "suspended" {
		t.Fatalf("expected persisted status suspended, got %s", verifyPayload.Status)
	}
}

func TestAdminAuditLogsListApiV1PathWithAdminRole(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/audit-logs?action=market.updated&page=1&pageSize=10&sortBy=occurredAt&sortDir=asc", nil)
	req.Header.Set("X-Admin-Role", "admin")
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d, body=%s", res.Code, res.Body.String())
	}

	var payload struct {
		Items      []map[string]any `json:"items"`
		Pagination domain.PageMeta  `json:"pagination"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if payload.Pagination.Total != 1 || len(payload.Items) != 1 {
		t.Fatalf("expected one filtered audit entry, got total=%d len=%d", payload.Pagination.Total, len(payload.Items))
	}
}

func TestAdminAuditLogsIncludesBetLifecycleEvents(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	creditReq := httptest.NewRequest(http.MethodPost, "/api/v1/wallet/credit", strings.NewReader(`{"userId":"u-audit-bet-1","amountCents":5000,"idempotencyKey":"seed-audit"}`))
	creditRes := httptest.NewRecorder()
	handler.ServeHTTP(creditRes, creditReq)
	if creditRes.Code != http.StatusOK {
		t.Fatalf("seed credit failed: status=%d body=%s", creditRes.Code, creditRes.Body.String())
	}

	placeReq := httptest.NewRequest(http.MethodPost, "/api/v1/bets/place", strings.NewReader(`{"userId":"u-audit-bet-1","marketId":"m:local:001","selectionId":"home","stakeCents":1000,"odds":2.0,"idempotencyKey":"audit-bet-place"}`))
	placeRes := httptest.NewRecorder()
	handler.ServeHTTP(placeRes, placeReq)
	if placeRes.Code != http.StatusOK {
		t.Fatalf("place bet failed: status=%d body=%s", placeRes.Code, placeRes.Body.String())
	}

	var placed map[string]any
	if err := json.Unmarshal(placeRes.Body.Bytes(), &placed); err != nil {
		t.Fatalf("decode placed response: %v", err)
	}
	betID, _ := placed["betId"].(string)
	if betID == "" {
		t.Fatalf("expected betId in place response")
	}

	settleReq := httptest.NewRequest(http.MethodPost, "/api/v1/admin/bets/"+betID+"/lifecycle/settle", strings.NewReader(`{"winningSelectionId":"away","winningSelectionName":"Away Team","resultSource":"supplier_feed","reason":"Result Confirmed"}`))
	settleReq.Header.Set("X-Admin-Role", "admin")
	settleReq.Header.Set("X-Admin-Actor", "admin-risk-1")
	settleRes := httptest.NewRecorder()
	handler.ServeHTTP(settleRes, settleReq)
	if settleRes.Code != http.StatusOK {
		t.Fatalf("settle bet failed: status=%d body=%s", settleRes.Code, settleRes.Body.String())
	}

	auditReq := httptest.NewRequest(http.MethodGet, "/api/v1/admin/audit-logs?action=bet.settled&actorId=admin-risk-1&page=1&pageSize=10&sortBy=occurredAt&sortDir=asc", nil)
	auditReq.Header.Set("X-Admin-Role", "admin")
	auditRes := httptest.NewRecorder()
	handler.ServeHTTP(auditRes, auditReq)
	if auditRes.Code != http.StatusOK {
		t.Fatalf("audit logs failed: status=%d body=%s", auditRes.Code, auditRes.Body.String())
	}

	var payload struct {
		Items      []map[string]any `json:"items"`
		Pagination domain.PageMeta  `json:"pagination"`
	}
	if err := json.Unmarshal(auditRes.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode audit response: %v", err)
	}
	if payload.Pagination.Total != 1 || len(payload.Items) != 1 {
		t.Fatalf("expected one bet lifecycle audit entry, got total=%d len=%d", payload.Pagination.Total, len(payload.Items))
	}
	if payload.Items[0]["targetId"] != betID {
		t.Fatalf("expected targetId %s, got %v", betID, payload.Items[0]["targetId"])
	}
	details, _ := payload.Items[0]["details"].(string)
	if !strings.Contains(details, "resultSource=supplier_feed") {
		t.Fatalf("expected audit details to include resultSource, got %s", details)
	}
}

func TestAdminAuditLogsIncludePromoContextOnBetPlaced(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	creditReq := httptest.NewRequest(http.MethodPost, "/api/v1/wallet/credit", strings.NewReader(`{"userId":"u-1","amountCents":1000,"idempotencyKey":"seed-audit-promo"}`))
	creditRes := httptest.NewRecorder()
	handler.ServeHTTP(creditRes, creditReq)
	if creditRes.Code != http.StatusOK {
		t.Fatalf("seed credit failed: status=%d body=%s", creditRes.Code, creditRes.Body.String())
	}

	acceptReq := httptest.NewRequest(http.MethodPost, "/api/v1/odds-boosts/ob:local:001/accept", strings.NewReader(`{"userId":"u-1","requestId":"audit-promo-accept-1"}`))
	acceptRes := httptest.NewRecorder()
	handler.ServeHTTP(acceptRes, acceptReq)
	if acceptRes.Code != http.StatusOK {
		t.Fatalf("odds boost accept failed: status=%d body=%s", acceptRes.Code, acceptRes.Body.String())
	}

	placeBody := `{"userId":"u-1","requestId":"audit-promo-place-1","marketId":"m:local:001","selectionId":"home","stakeCents":1000,"odds":2.05,"freebetId":"fb:local:001","oddsBoostId":"ob:local:001","idempotencyKey":"audit-promo-place-1"}`
	placeReq := httptest.NewRequest(http.MethodPost, "/api/v1/bets/place", strings.NewReader(placeBody))
	placeRes := httptest.NewRecorder()
	handler.ServeHTTP(placeRes, placeReq)
	if placeRes.Code != http.StatusOK {
		t.Fatalf("place bet failed: status=%d body=%s", placeRes.Code, placeRes.Body.String())
	}

	auditReq := httptest.NewRequest(http.MethodGet, "/api/v1/admin/audit-logs?action=bet.placed&page=1&pageSize=10&sortBy=occurredAt&sortDir=desc", nil)
	auditReq.Header.Set("X-Admin-Role", "admin")
	auditRes := httptest.NewRecorder()
	handler.ServeHTTP(auditRes, auditReq)
	if auditRes.Code != http.StatusOK {
		t.Fatalf("audit logs failed: status=%d body=%s", auditRes.Code, auditRes.Body.String())
	}

	var payload struct {
		Items []struct {
			Details string `json:"details"`
		} `json:"items"`
	}
	if err := json.Unmarshal(auditRes.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode audit response: %v", err)
	}
	if len(payload.Items) == 0 {
		t.Fatalf("expected at least one bet.placed audit row")
	}
	details := payload.Items[0].Details
	if !strings.Contains(details, "freebetId=fb:local:001") {
		t.Fatalf("expected bet.placed details to include freebetId, got %s", details)
	}
	if !strings.Contains(details, "oddsBoostId=ob:local:001") {
		t.Fatalf("expected bet.placed details to include oddsBoostId, got %s", details)
	}
}

func TestAdminAuditLogsFilterByPromoDimensions(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	creditReq := httptest.NewRequest(http.MethodPost, "/api/v1/wallet/credit", strings.NewReader(`{"userId":"u-1","amountCents":1000,"idempotencyKey":"seed-audit-promo-filter"}`))
	creditRes := httptest.NewRecorder()
	handler.ServeHTTP(creditRes, creditReq)
	if creditRes.Code != http.StatusOK {
		t.Fatalf("seed credit failed: status=%d body=%s", creditRes.Code, creditRes.Body.String())
	}

	acceptReq := httptest.NewRequest(http.MethodPost, "/api/v1/odds-boosts/ob:local:001/accept", strings.NewReader(`{"userId":"u-1","requestId":"audit-promo-filter-accept-1"}`))
	acceptRes := httptest.NewRecorder()
	handler.ServeHTTP(acceptRes, acceptReq)
	if acceptRes.Code != http.StatusOK {
		t.Fatalf("odds boost accept failed: status=%d body=%s", acceptRes.Code, acceptRes.Body.String())
	}

	placeBody := `{"userId":"u-1","requestId":"audit-promo-filter-place-1","marketId":"m:local:001","selectionId":"home","stakeCents":1000,"odds":2.05,"freebetId":"fb:local:001","oddsBoostId":"ob:local:001","idempotencyKey":"audit-promo-filter-place-1"}`
	placeReq := httptest.NewRequest(http.MethodPost, "/api/v1/bets/place", strings.NewReader(placeBody))
	placeRes := httptest.NewRecorder()
	handler.ServeHTTP(placeRes, placeReq)
	if placeRes.Code != http.StatusOK {
		t.Fatalf("place bet failed: status=%d body=%s", placeRes.Code, placeRes.Body.String())
	}

	auditReq := httptest.NewRequest(http.MethodGet, "/api/v1/admin/audit-logs?action=bet.placed&userId=u-1&freebetId=fb:local:001&oddsBoostId=ob:local:001&page=1&pageSize=10&sortBy=occurredAt&sortDir=desc", nil)
	auditReq.Header.Set("X-Admin-Role", "admin")
	auditRes := httptest.NewRecorder()
	handler.ServeHTTP(auditRes, auditReq)
	if auditRes.Code != http.StatusOK {
		t.Fatalf("audit logs failed: status=%d body=%s", auditRes.Code, auditRes.Body.String())
	}

	var payload struct {
		Items []struct {
			Action              string `json:"action"`
			UserID              string `json:"userId"`
			FreebetID           string `json:"freebetId"`
			OddsBoostID         string `json:"oddsBoostId"`
			FreebetAppliedCents int64  `json:"freebetAppliedCents"`
		} `json:"items"`
	}
	if err := json.Unmarshal(auditRes.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode audit response: %v", err)
	}
	if len(payload.Items) != 1 {
		t.Fatalf("expected one promo-filtered audit row, got %d", len(payload.Items))
	}
	if payload.Items[0].Action != "bet.placed" {
		t.Fatalf("expected action bet.placed, got %s", payload.Items[0].Action)
	}
	if payload.Items[0].UserID != "u-1" {
		t.Fatalf("expected userId u-1, got %s", payload.Items[0].UserID)
	}
	if payload.Items[0].FreebetID != "fb:local:001" {
		t.Fatalf("expected freebetId fb:local:001, got %s", payload.Items[0].FreebetID)
	}
	if payload.Items[0].OddsBoostID != "ob:local:001" {
		t.Fatalf("expected oddsBoostId ob:local:001, got %s", payload.Items[0].OddsBoostID)
	}
	if payload.Items[0].FreebetAppliedCents != 1000 {
		t.Fatalf("expected freebetAppliedCents 1000, got %d", payload.Items[0].FreebetAppliedCents)
	}
}

func TestAdminPromotionsUsageEndpointAggregatesPromoCounters(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	creditReq := httptest.NewRequest(http.MethodPost, "/api/v1/wallet/credit", strings.NewReader(`{"userId":"u-1","amountCents":10000,"idempotencyKey":"seed-promo-usage"}`))
	creditRes := httptest.NewRecorder()
	handler.ServeHTTP(creditRes, creditReq)
	if creditRes.Code != http.StatusOK {
		t.Fatalf("seed credit failed: status=%d body=%s", creditRes.Code, creditRes.Body.String())
	}

	acceptReq := httptest.NewRequest(http.MethodPost, "/api/v1/odds-boosts/ob:local:001/accept", strings.NewReader(`{"userId":"u-1","requestId":"promo-usage-accept-1"}`))
	acceptRes := httptest.NewRecorder()
	handler.ServeHTTP(acceptRes, acceptReq)
	if acceptRes.Code != http.StatusOK {
		t.Fatalf("odds boost accept failed: status=%d body=%s", acceptRes.Code, acceptRes.Body.String())
	}

	placeRequests := []string{
		`{"userId":"u-1","requestId":"promo-usage-place-1","marketId":"m:local:001","selectionId":"home","stakeCents":1000,"odds":2.05,"freebetId":"fb:local:001","oddsBoostId":"ob:local:001","idempotencyKey":"promo-usage-place-1"}`,
		`{"userId":"u-1","requestId":"promo-usage-place-2","marketId":"m:local:001","selectionId":"home","stakeCents":500,"odds":1.8,"idempotencyKey":"promo-usage-place-2"}`,
		`{"userId":"u-1","requestId":"promo-usage-place-3","marketId":"m:local:001","selectionId":"home","stakeCents":300,"odds":2.05,"oddsBoostId":"ob:local:001","idempotencyKey":"promo-usage-place-3"}`,
	}
	for index, body := range placeRequests {
		placeReq := httptest.NewRequest(http.MethodPost, "/api/v1/bets/place", strings.NewReader(body))
		placeRes := httptest.NewRecorder()
		handler.ServeHTTP(placeRes, placeReq)
		if placeRes.Code != http.StatusOK {
			t.Fatalf("place request %d failed: status=%d body=%s", index, placeRes.Code, placeRes.Body.String())
		}
	}

	usageReq := httptest.NewRequest(http.MethodGet, "/api/v1/admin/promotions/usage?userId=u-1&breakdownLimit=5", nil)
	usageReq.Header.Set("X-Admin-Role", "admin")
	usageRes := httptest.NewRecorder()
	handler.ServeHTTP(usageRes, usageReq)
	if usageRes.Code != http.StatusOK {
		t.Fatalf("promo usage failed: status=%d body=%s", usageRes.Code, usageRes.Body.String())
	}

	var payload struct {
		Summary struct {
			TotalBets                int64 `json:"totalBets"`
			BetsWithFreebet          int64 `json:"betsWithFreebet"`
			BetsWithOddsBoost        int64 `json:"betsWithOddsBoost"`
			BetsWithBoth             int64 `json:"betsWithBoth"`
			TotalFreebetAppliedCents int64 `json:"totalFreebetAppliedCents"`
			Freebets                 []struct {
				ID       string `json:"id"`
				BetCount int64  `json:"betCount"`
			} `json:"freebets"`
			OddsBoosts []struct {
				ID       string `json:"id"`
				BetCount int64  `json:"betCount"`
			} `json:"oddsBoosts"`
		} `json:"summary"`
	}
	if err := json.Unmarshal(usageRes.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode promo usage payload: %v", err)
	}
	if payload.Summary.TotalBets != 3 {
		t.Fatalf("expected totalBets=3, got %d", payload.Summary.TotalBets)
	}
	if payload.Summary.BetsWithFreebet != 1 {
		t.Fatalf("expected betsWithFreebet=1, got %d", payload.Summary.BetsWithFreebet)
	}
	if payload.Summary.BetsWithOddsBoost != 2 {
		t.Fatalf("expected betsWithOddsBoost=2, got %d", payload.Summary.BetsWithOddsBoost)
	}
	if payload.Summary.BetsWithBoth != 1 {
		t.Fatalf("expected betsWithBoth=1, got %d", payload.Summary.BetsWithBoth)
	}
	if payload.Summary.TotalFreebetAppliedCents != 1000 {
		t.Fatalf("expected totalFreebetAppliedCents=1000, got %d", payload.Summary.TotalFreebetAppliedCents)
	}
	if len(payload.Summary.Freebets) != 1 || payload.Summary.Freebets[0].ID != "fb:local:001" {
		t.Fatalf("expected freebet breakdown for fb:local:001, got %+v", payload.Summary.Freebets)
	}
	if len(payload.Summary.OddsBoosts) != 1 || payload.Summary.OddsBoosts[0].ID != "ob:local:001" {
		t.Fatalf("expected odds boost breakdown for ob:local:001, got %+v", payload.Summary.OddsBoosts)
	}
}

func TestAdminConfigApiV1PathWithAdminRole(t *testing.T) {
	t.Setenv("GATEWAY_WALLET_PROVIDER", "mock-wallet")

	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/config", nil)
	req.Header.Set("X-Admin-Role", "admin")
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d, body=%s", res.Code, res.Body.String())
	}

	var payload map[string]any
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if payload["walletProvider"] != "mock-wallet" {
		t.Fatalf("expected walletProvider=mock-wallet, got %v", payload["walletProvider"])
	}
	schema, ok := payload["canonicalSchema"].(map[string]any)
	if !ok {
		t.Fatalf("expected canonicalSchema object, got %T", payload["canonicalSchema"])
	}
	if schema["name"] != "phoenix.canonical.sportsbook" {
		t.Fatalf("expected canonical schema name, got %v", schema["name"])
	}
	if schema["version"] != "1.0.0" {
		t.Fatalf("expected canonical schema version 1.0.0, got %v", schema["version"])
	}
	auditStore, ok := payload["providerOpsAudit"].(map[string]any)
	if !ok {
		t.Fatalf("expected providerOpsAudit object, got %T", payload["providerOpsAudit"])
	}
	mode, _ := auditStore["mode"].(string)
	if strings.TrimSpace(mode) == "" {
		t.Fatalf("expected providerOpsAudit.mode to be set, got %v", auditStore["mode"])
	}
}

func TestAdminConfigIncludesProviderRuntimeWhenEnabled(t *testing.T) {
	t.Setenv("GATEWAY_PROVIDER_RUNTIME_ENABLED", "true")

	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/config", nil)
	req.Header.Set("X-Admin-Role", "admin")
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d, body=%s", res.Code, res.Body.String())
	}

	var payload map[string]any
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	runtimeMeta, ok := payload["providerRuntime"].(map[string]any)
	if !ok {
		t.Fatalf("expected providerRuntime object, got %T", payload["providerRuntime"])
	}
	enabled, ok := runtimeMeta["enabled"].(bool)
	if !ok {
		t.Fatalf("expected providerRuntime.enabled bool, got %T", runtimeMeta["enabled"])
	}
	if !enabled {
		t.Fatal("expected provider runtime to be enabled")
	}

	adapters, ok := runtimeMeta["adapters"].([]any)
	if !ok {
		t.Fatalf("expected providerRuntime.adapters array, got %T", runtimeMeta["adapters"])
	}
	if len(adapters) == 0 {
		t.Fatal("expected at least one provider adapter")
	}
	partitions, ok := runtimeMeta["partitions"].([]any)
	if !ok {
		t.Fatalf("expected providerRuntime.partitions array, got %T", runtimeMeta["partitions"])
	}
	if len(partitions) == 0 {
		t.Fatal("expected at least one provider partition entry")
	}
}

func TestAdminFeedHealthWithProviderRuntimeEnabled(t *testing.T) {
	t.Setenv("GATEWAY_PROVIDER_RUNTIME_ENABLED", "true")
	t.Setenv("GATEWAY_PROVIDER_SLO_MAX_LAG_MS", "2500")
	t.Setenv("GATEWAY_PROVIDER_SLO_MAX_GAPS", "1")
	t.Setenv("GATEWAY_PROVIDER_SLO_MAX_DUPLICATES", "2")

	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/feed-health", nil)
	req.Header.Set("X-Admin-Role", "admin")
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d, body=%s", res.Code, res.Body.String())
	}

	var payload map[string]any
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	enabled, ok := payload["enabled"].(bool)
	if !ok || !enabled {
		t.Fatalf("expected enabled=true, got %v", payload["enabled"])
	}
	thresholds, ok := payload["thresholds"].(map[string]any)
	if !ok {
		t.Fatalf("expected thresholds object, got %T", payload["thresholds"])
	}
	if int(thresholds["maxLagMs"].(float64)) != 2500 {
		t.Fatalf("expected maxLagMs=2500, got %v", thresholds["maxLagMs"])
	}

	summary, ok := payload["summary"].(map[string]any)
	if !ok {
		t.Fatalf("expected summary object, got %T", payload["summary"])
	}
	if _, ok := summary["streamCount"]; !ok {
		t.Fatalf("expected streamCount in summary, got %v", summary)
	}
	if _, ok := summary["unhealthyStreams"]; !ok {
		t.Fatalf("expected unhealthyStreams in summary, got %v", summary)
	}
	if _, ok := summary["totalErrors"]; !ok {
		t.Fatalf("expected totalErrors in summary, got %v", summary)
	}
	if _, ok := summary["totalFiltered"]; !ok {
		t.Fatalf("expected totalFiltered in summary, got %v", summary)
	}
	if _, ok := summary["totalSnapshotApplied"]; !ok {
		t.Fatalf("expected totalSnapshotApplied in summary, got %v", summary)
	}
	if _, ok := summary["totalSnapshotSkipped"]; !ok {
		t.Fatalf("expected totalSnapshotSkipped in summary, got %v", summary)
	}
	if _, ok := summary["totalThrottleEvents"]; !ok {
		t.Fatalf("expected totalThrottleEvents in summary, got %v", summary)
	}
	if _, ok := summary["totalThrottleDelayMs"]; !ok {
		t.Fatalf("expected totalThrottleDelayMs in summary, got %v", summary)
	}
	if _, ok := summary["partitionCount"]; !ok {
		t.Fatalf("expected partitionCount in summary, got %v", summary)
	}
	if _, ok := summary["bySport"]; !ok {
		t.Fatalf("expected bySport in summary, got %v", summary)
	}

	streams, ok := payload["streams"].([]any)
	if !ok {
		t.Fatalf("expected streams array, got %T", payload["streams"])
	}
	partitions, ok := payload["partitions"].([]any)
	if !ok {
		t.Fatalf("expected partitions array, got %T", payload["partitions"])
	}
	streamCount, ok := summary["streamCount"].(float64)
	if !ok {
		t.Fatalf("expected numeric streamCount in summary, got %T", summary["streamCount"])
	}
	if int(streamCount) != len(streams) {
		t.Fatalf("expected streamCount=%d to match streams len=%d", int(streamCount), len(streams))
	}
	partitionCount, ok := summary["partitionCount"].(float64)
	if !ok {
		t.Fatalf("expected numeric partitionCount in summary, got %T", summary["partitionCount"])
	}
	if int(partitionCount) != len(partitions) {
		t.Fatalf("expected partitionCount=%d to match partitions len=%d", int(partitionCount), len(partitions))
	}
}

func TestAdminProviderAcknowledgementSLASettingsRoundTrip(t *testing.T) {
	storePath := filepath.Join(t.TempDir(), "provider_ops_ack_sla.json")
	t.Setenv("PROVIDER_OPS_AUDIT_FILE", storePath)
	t.Setenv("GATEWAY_PROVIDER_ACK_SLA_WARNING_MINUTES", "17")
	t.Setenv("GATEWAY_PROVIDER_ACK_SLA_CRITICAL_MINUTES", "31")
	defer func() {
		providerOpsAuditMu.Lock()
		providerOpsAuditEntries = nil
		providerOpsAuditMu.Unlock()
		providerOpsAuditStore = nil
		providerOpsAuditStoreMode = ""
		providerOpsAuditStorePath = ""
		providerOpsAuditStoreInit = sync.Once{}
	}()

	providerOpsAuditMu.Lock()
	providerOpsAuditEntries = nil
	providerOpsAuditMu.Unlock()
	providerOpsAuditStore = nil
	providerOpsAuditStoreMode = ""
	providerOpsAuditStorePath = ""
	providerOpsAuditStoreInit = sync.Once{}

	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	defaultReq := httptest.NewRequest(http.MethodGet, "/api/v1/admin/provider/acknowledgement-sla", nil)
	defaultReq.Header.Set("X-Admin-Role", "admin")
	defaultRes := httptest.NewRecorder()
	handler.ServeHTTP(defaultRes, defaultReq)
	if defaultRes.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d, body=%s", defaultRes.Code, defaultRes.Body.String())
	}

	var defaultPayload map[string]any
	if err := json.Unmarshal(defaultRes.Body.Bytes(), &defaultPayload); err != nil {
		t.Fatalf("decode default response: %v", err)
	}
	defaultSetting, ok := defaultPayload["default"].(map[string]any)
	if !ok {
		t.Fatalf("expected default setting object, got %T", defaultPayload["default"])
	}
	if int(defaultSetting["warningMinutes"].(float64)) != 17 {
		t.Fatalf("expected default warningMinutes=17, got %v", defaultSetting["warningMinutes"])
	}
	if int(defaultSetting["criticalMinutes"].(float64)) != 31 {
		t.Fatalf("expected default criticalMinutes=31, got %v", defaultSetting["criticalMinutes"])
	}

	updateDefaultReq := httptest.NewRequest(http.MethodPost, "/api/v1/admin/provider/acknowledgement-sla", strings.NewReader(`{
		"warningMinutes": 25,
		"criticalMinutes": 55
	}`))
	updateDefaultReq.Header.Set("X-Admin-Role", "admin")
	updateDefaultReq.Header.Set("X-Admin-Actor", "admin-sla-default")
	updateDefaultRes := httptest.NewRecorder()
	handler.ServeHTTP(updateDefaultRes, updateDefaultReq)
	if updateDefaultRes.Code != http.StatusOK {
		t.Fatalf("expected default update status 200, got %d, body=%s", updateDefaultRes.Code, updateDefaultRes.Body.String())
	}

	updateAdapterReq := httptest.NewRequest(http.MethodPost, "/api/v1/admin/provider/acknowledgement-sla", strings.NewReader(`{
		"adapter": "odds88-demo",
		"warningMinutes": 10,
		"criticalMinutes": 22
	}`))
	updateAdapterReq.Header.Set("X-Admin-Role", "admin")
	updateAdapterReq.Header.Set("X-Admin-Actor", "admin-sla-adapter")
	updateAdapterRes := httptest.NewRecorder()
	handler.ServeHTTP(updateAdapterRes, updateAdapterReq)
	if updateAdapterRes.Code != http.StatusOK {
		t.Fatalf("expected adapter update status 200, got %d, body=%s", updateAdapterRes.Code, updateAdapterRes.Body.String())
	}

	updateSecondAdapterReq := httptest.NewRequest(http.MethodPost, "/api/v1/admin/provider/acknowledgement-sla", strings.NewReader(`{
		"adapter": "betby-demo",
		"warningMinutes": 12,
		"criticalMinutes": 24
	}`))
	updateSecondAdapterReq.Header.Set("X-Admin-Role", "admin")
	updateSecondAdapterReq.Header.Set("X-Admin-Actor", "admin-sla-adapter")
	updateSecondAdapterRes := httptest.NewRecorder()
	handler.ServeHTTP(updateSecondAdapterRes, updateSecondAdapterReq)
	if updateSecondAdapterRes.Code != http.StatusOK {
		t.Fatalf("expected second adapter update status 200, got %d, body=%s", updateSecondAdapterRes.Code, updateSecondAdapterRes.Body.String())
	}

	finalReq := httptest.NewRequest(http.MethodGet, "/api/v1/admin/provider/acknowledgement-sla", nil)
	finalReq.Header.Set("X-Admin-Role", "admin")
	finalRes := httptest.NewRecorder()
	handler.ServeHTTP(finalRes, finalReq)
	if finalRes.Code != http.StatusOK {
		t.Fatalf("expected final status 200, got %d, body=%s", finalRes.Code, finalRes.Body.String())
	}

	var finalPayload map[string]any
	if err := json.Unmarshal(finalRes.Body.Bytes(), &finalPayload); err != nil {
		t.Fatalf("decode final response: %v", err)
	}
	finalDefault, ok := finalPayload["default"].(map[string]any)
	if !ok {
		t.Fatalf("expected final default setting object, got %T", finalPayload["default"])
	}
	if int(finalDefault["warningMinutes"].(float64)) != 25 {
		t.Fatalf("expected final default warningMinutes=25, got %v", finalDefault["warningMinutes"])
	}
	if int(finalDefault["criticalMinutes"].(float64)) != 55 {
		t.Fatalf("expected final default criticalMinutes=55, got %v", finalDefault["criticalMinutes"])
	}
	if finalDefault["updatedBy"] != "admin-sla-default" {
		t.Fatalf("expected final default updatedBy=admin-sla-default, got %v", finalDefault["updatedBy"])
	}

	overrides, ok := finalPayload["overrides"].([]any)
	if !ok || len(overrides) != 2 {
		t.Fatalf("expected two adapter overrides, got %v", finalPayload["overrides"])
	}

	var odds88Override map[string]any
	for _, item := range overrides {
		override, castOK := item.(map[string]any)
		if !castOK {
			continue
		}
		if override["adapter"] == "odds88-demo" {
			odds88Override = override
			break
		}
	}
	if odds88Override == nil {
		t.Fatalf("expected odds88-demo override, got %v", overrides)
	}
	if int(odds88Override["warningMinutes"].(float64)) != 10 {
		t.Fatalf("expected odds88 override warningMinutes=10, got %v", odds88Override["warningMinutes"])
	}
	if int(odds88Override["criticalMinutes"].(float64)) != 22 {
		t.Fatalf("expected odds88 override criticalMinutes=22, got %v", odds88Override["criticalMinutes"])
	}

	effective, ok := finalPayload["effective"].([]any)
	if !ok || len(effective) == 0 {
		t.Fatalf("expected effective adapter settings, got %v", finalPayload["effective"])
	}
	effectiveFound := false
	for _, item := range effective {
		row, castOK := item.(map[string]any)
		if !castOK {
			continue
		}
		if row["adapter"] != "odds88-demo" {
			continue
		}
		effectiveFound = true
		if int(row["warningMinutes"].(float64)) != 10 {
			t.Fatalf("expected effective warningMinutes=10, got %v", row["warningMinutes"])
		}
		if int(row["criticalMinutes"].(float64)) != 22 {
			t.Fatalf("expected effective criticalMinutes=22, got %v", row["criticalMinutes"])
		}
		if row["source"] != "override" {
			t.Fatalf("expected effective source override, got %v", row["source"])
		}
	}
	if !effectiveFound {
		t.Fatalf("expected odds88-demo adapter in effective settings, got %v", effective)
	}

	auditReq := httptest.NewRequest(http.MethodGet, "/api/v1/admin/audit-logs?action=provider.stream.sla.adapter.updated&targetId=odds88-demo&page=1&pageSize=10", nil)
	auditReq.Header.Set("X-Admin-Role", "admin")
	auditRes := httptest.NewRecorder()
	handler.ServeHTTP(auditRes, auditReq)
	if auditRes.Code != http.StatusOK {
		t.Fatalf("expected audit status 200, got %d, body=%s", auditRes.Code, auditRes.Body.String())
	}
	var auditPayload map[string]any
	if err := json.Unmarshal(auditRes.Body.Bytes(), &auditPayload); err != nil {
		t.Fatalf("decode audit response: %v", err)
	}
	auditItems, ok := auditPayload["items"].([]any)
	if !ok || len(auditItems) == 0 {
		t.Fatalf("expected provider.stream.sla.adapter.updated audit entries, got %v", auditPayload["items"])
	}
	if len(auditItems) != 1 {
		t.Fatalf("expected targetId filter to return one item, got %d items", len(auditItems))
	}
	filteredAuditItem, ok := auditItems[0].(map[string]any)
	if !ok {
		t.Fatalf("expected audit item object, got %T", auditItems[0])
	}
	if filteredAuditItem["targetId"] != "odds88-demo" {
		t.Fatalf("expected filtered targetId=odds88-demo, got %v", filteredAuditItem["targetId"])
	}
}

func TestAdminProviderCancelRoute(t *testing.T) {
	t.Setenv("GATEWAY_PROVIDER_RUNTIME_ENABLED", "true")

	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/provider/cancel", strings.NewReader(`{
		"adapter":"odds88-demo",
		"playerId":"u-admin-provider-cancel",
		"betId":"b-admin-provider-cancel",
		"requestId":"req-admin-provider-cancel",
		"reason":"manual operator cancellation"
	}`))
	req.Header.Set("X-Admin-Role", "admin")
	req.Header.Set("X-Admin-Actor", "admin-ops-provider")
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d, body=%s", res.Code, res.Body.String())
	}

	var payload map[string]any
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if payload["state"] != "cancelled" {
		t.Fatalf("expected state=cancelled, got %v", payload["state"])
	}
	if payload["adapter"] != "odds88-demo" {
		t.Fatalf("expected adapter=odds88-demo, got %v", payload["adapter"])
	}

	auditReq := httptest.NewRequest(http.MethodGet, "/api/v1/admin/audit-logs?action=provider.cancel.succeeded&actorId=admin-ops-provider&page=1&pageSize=10&sortBy=occurredAt&sortDir=desc", nil)
	auditReq.Header.Set("X-Admin-Role", "admin")
	auditRes := httptest.NewRecorder()
	handler.ServeHTTP(auditRes, auditReq)
	if auditRes.Code != http.StatusOK {
		t.Fatalf("expected audit status 200, got %d, body=%s", auditRes.Code, auditRes.Body.String())
	}

	var auditPayload map[string]any
	if err := json.Unmarshal(auditRes.Body.Bytes(), &auditPayload); err != nil {
		t.Fatalf("decode audit response: %v", err)
	}
	items, ok := auditPayload["items"].([]any)
	if !ok || len(items) == 0 {
		t.Fatalf("expected provider cancel audit entries, got %v", auditPayload["items"])
	}
}

func TestAdminProviderAcknowledgementsRoundTrip(t *testing.T) {
	storePath := filepath.Join(t.TempDir(), "provider_ops_audit.json")
	t.Setenv("PROVIDER_OPS_AUDIT_FILE", storePath)
	defer func() {
		providerOpsAuditMu.Lock()
		providerOpsAuditEntries = nil
		providerOpsAuditMu.Unlock()
		providerOpsAuditStore = nil
		providerOpsAuditStoreMode = ""
		providerOpsAuditStorePath = ""
		providerOpsAuditStoreInit = sync.Once{}
	}()

	providerOpsAuditMu.Lock()
	providerOpsAuditEntries = nil
	providerOpsAuditMu.Unlock()
	providerOpsAuditStore = nil
	providerOpsAuditStoreMode = ""
	providerOpsAuditStorePath = ""
	providerOpsAuditStoreInit = sync.Once{}

	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	createReq := httptest.NewRequest(http.MethodPost, "/api/v1/admin/provider/acknowledgements", strings.NewReader(`{
		"adapter":"odds88-demo",
		"stream":"settlement",
		"operator":"ops.user.1",
		"note":"Investigating degraded settlement stream"
	}`))
	createReq.Header.Set("X-Admin-Role", "admin")
	createReq.Header.Set("X-Admin-Actor", "admin-ops-provider")
	createRes := httptest.NewRecorder()
	handler.ServeHTTP(createRes, createReq)
	if createRes.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d, body=%s", createRes.Code, createRes.Body.String())
	}

	listReq := httptest.NewRequest(http.MethodGet, "/api/v1/admin/provider/acknowledgements", nil)
	listReq.Header.Set("X-Admin-Role", "admin")
	listRes := httptest.NewRecorder()
	handler.ServeHTTP(listRes, listReq)
	if listRes.Code != http.StatusOK {
		t.Fatalf("expected list status 200, got %d, body=%s", listRes.Code, listRes.Body.String())
	}

	var listPayload map[string]any
	if err := json.Unmarshal(listRes.Body.Bytes(), &listPayload); err != nil {
		t.Fatalf("decode list response: %v", err)
	}
	items, ok := listPayload["items"].([]any)
	if !ok || len(items) != 1 {
		t.Fatalf("expected one acknowledgement item, got %v", listPayload["items"])
	}
	ack, ok := items[0].(map[string]any)
	if !ok {
		t.Fatalf("expected acknowledgement object, got %T", items[0])
	}
	if ack["streamKey"] != "odds88-demo:settlement" {
		t.Fatalf("expected streamKey odds88-demo:settlement, got %v", ack["streamKey"])
	}
	if ack["operator"] != "ops.user.1" {
		t.Fatalf("expected operator ops.user.1, got %v", ack["operator"])
	}
	if ack["status"] != "acknowledged" {
		t.Fatalf("expected status acknowledged, got %v", ack["status"])
	}
	if ack["lastAction"] != "acknowledged" {
		t.Fatalf("expected lastAction acknowledged, got %v", ack["lastAction"])
	}

	providerOpsAuditMu.Lock()
	providerOpsAuditEntries = nil
	providerOpsAuditMu.Unlock()
	providerOpsAuditStore = nil
	providerOpsAuditStoreMode = ""
	providerOpsAuditStorePath = ""
	providerOpsAuditStoreInit = sync.Once{}

	reloadReq := httptest.NewRequest(http.MethodGet, "/api/v1/admin/provider/acknowledgements", nil)
	reloadReq.Header.Set("X-Admin-Role", "admin")
	reloadRes := httptest.NewRecorder()
	handler.ServeHTTP(reloadRes, reloadReq)
	if reloadRes.Code != http.StatusOK {
		t.Fatalf("expected reload status 200, got %d, body=%s", reloadRes.Code, reloadRes.Body.String())
	}

	var reloadPayload map[string]any
	if err := json.Unmarshal(reloadRes.Body.Bytes(), &reloadPayload); err != nil {
		t.Fatalf("decode reload response: %v", err)
	}
	reloadItems, ok := reloadPayload["items"].([]any)
	if !ok || len(reloadItems) != 1 {
		t.Fatalf("expected one acknowledgement item after reload, got %v", reloadPayload["items"])
	}
}

func TestAdminProviderAcknowledgementsLifecycleControls(t *testing.T) {
	storePath := filepath.Join(t.TempDir(), "provider_ops_audit_lifecycle.json")
	t.Setenv("PROVIDER_OPS_AUDIT_FILE", storePath)
	defer func() {
		providerOpsAuditMu.Lock()
		providerOpsAuditEntries = nil
		providerOpsAuditMu.Unlock()
		providerOpsAuditStore = nil
		providerOpsAuditStoreMode = ""
		providerOpsAuditStorePath = ""
		providerOpsAuditStoreInit = sync.Once{}
	}()

	providerOpsAuditMu.Lock()
	providerOpsAuditEntries = nil
	providerOpsAuditMu.Unlock()
	providerOpsAuditStore = nil
	providerOpsAuditStoreMode = ""
	providerOpsAuditStorePath = ""
	providerOpsAuditStoreInit = sync.Once{}

	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	post := func(body string) {
		req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/provider/acknowledgements", strings.NewReader(body))
		req.Header.Set("X-Admin-Role", "admin")
		req.Header.Set("X-Admin-Actor", "admin-ops-lifecycle")
		res := httptest.NewRecorder()
		handler.ServeHTTP(res, req)
		if res.Code != http.StatusOK {
			t.Fatalf("expected status 200, got %d, body=%s", res.Code, res.Body.String())
		}
	}

	post(`{
		"adapter":"odds88-demo",
		"stream":"settlement",
		"operator":"ops.user.1",
		"note":"Taking ownership"
	}`)
	post(`{
		"streamKey":"odds88-demo:settlement",
		"action":"resolve",
		"operator":"ops.user.1",
		"note":"Issue resolved"
	}`)

	listReq := httptest.NewRequest(http.MethodGet, "/api/v1/admin/provider/acknowledgements", nil)
	listReq.Header.Set("X-Admin-Role", "admin")
	listRes := httptest.NewRecorder()
	handler.ServeHTTP(listRes, listReq)
	if listRes.Code != http.StatusOK {
		t.Fatalf("expected list status 200, got %d, body=%s", listRes.Code, listRes.Body.String())
	}

	var listPayload map[string]any
	if err := json.Unmarshal(listRes.Body.Bytes(), &listPayload); err != nil {
		t.Fatalf("decode list response: %v", err)
	}
	items, ok := listPayload["items"].([]any)
	if !ok || len(items) != 1 {
		t.Fatalf("expected one acknowledgement item, got %v", listPayload["items"])
	}
	ack, ok := items[0].(map[string]any)
	if !ok {
		t.Fatalf("expected acknowledgement object, got %T", items[0])
	}
	if ack["status"] != "resolved" {
		t.Fatalf("expected status resolved, got %v", ack["status"])
	}
	if ack["lastAction"] != "resolved" {
		t.Fatalf("expected lastAction resolved, got %v", ack["lastAction"])
	}

	post(`{
		"streamKey":"odds88-demo:settlement",
		"action":"reopen",
		"operator":"ops.user.2",
		"note":"Reopening after regression"
	}`)
	post(`{
		"streamKey":"odds88-demo:settlement",
		"action":"reassign",
		"operator":"ops.user.3",
		"note":"Handing over to primary shift"
	}`)

	finalListReq := httptest.NewRequest(http.MethodGet, "/api/v1/admin/provider/acknowledgements", nil)
	finalListReq.Header.Set("X-Admin-Role", "admin")
	finalListRes := httptest.NewRecorder()
	handler.ServeHTTP(finalListRes, finalListReq)
	if finalListRes.Code != http.StatusOK {
		t.Fatalf("expected final list status 200, got %d, body=%s", finalListRes.Code, finalListRes.Body.String())
	}
	var finalPayload map[string]any
	if err := json.Unmarshal(finalListRes.Body.Bytes(), &finalPayload); err != nil {
		t.Fatalf("decode final list response: %v", err)
	}
	finalItems, ok := finalPayload["items"].([]any)
	if !ok || len(finalItems) != 1 {
		t.Fatalf("expected one acknowledgement item, got %v", finalPayload["items"])
	}
	finalAck, ok := finalItems[0].(map[string]any)
	if !ok {
		t.Fatalf("expected acknowledgement object, got %T", finalItems[0])
	}
	if finalAck["status"] != "acknowledged" {
		t.Fatalf("expected status acknowledged, got %v", finalAck["status"])
	}
	if finalAck["lastAction"] != "reassigned" {
		t.Fatalf("expected lastAction reassigned, got %v", finalAck["lastAction"])
	}
	if finalAck["operator"] != "ops.user.3" {
		t.Fatalf("expected operator ops.user.3, got %v", finalAck["operator"])
	}

	auditReq := httptest.NewRequest(http.MethodGet, "/api/v1/admin/audit-logs?action=provider.stream.reassigned&page=1&pageSize=10", nil)
	auditReq.Header.Set("X-Admin-Role", "admin")
	auditRes := httptest.NewRecorder()
	handler.ServeHTTP(auditRes, auditReq)
	if auditRes.Code != http.StatusOK {
		t.Fatalf("expected audit status 200, got %d, body=%s", auditRes.Code, auditRes.Body.String())
	}
	var auditPayload map[string]any
	if err := json.Unmarshal(auditRes.Body.Bytes(), &auditPayload); err != nil {
		t.Fatalf("decode audit response: %v", err)
	}
	auditItems, ok := auditPayload["items"].([]any)
	if !ok || len(auditItems) == 0 {
		t.Fatalf("expected reassigned audit entries, got %v", auditPayload["items"])
	}
}

func TestProviderOpsAuditPersistenceRoundTrip(t *testing.T) {
	storePath := filepath.Join(t.TempDir(), "provider_ops_audit.json")
	t.Setenv("PROVIDER_OPS_AUDIT_FILE", storePath)
	defer func() {
		providerOpsAuditMu.Lock()
		providerOpsAuditEntries = nil
		providerOpsAuditMu.Unlock()
		providerOpsAuditStore = nil
		providerOpsAuditStoreMode = ""
		providerOpsAuditStorePath = ""
		providerOpsAuditStoreInit = sync.Once{}
	}()

	providerOpsAuditMu.Lock()
	providerOpsAuditEntries = nil
	providerOpsAuditMu.Unlock()
	providerOpsAuditStore = nil
	providerOpsAuditStoreMode = ""
	providerOpsAuditStorePath = ""
	providerOpsAuditStoreInit = sync.Once{}

	recordProviderOpsAuditEntry(auditLogEntry{
		ID:         "al:provider:test:1",
		Action:     "provider.cancel.succeeded",
		ActorID:    "admin-ops-test",
		TargetID:   "b:test:1",
		OccurredAt: "2026-03-04T12:00:00Z",
		Details:    "adapter=odds88-demo requestId=req-1 attempts=1 retries=0 fallback=false state=cancelled",
	})

	raw, err := os.ReadFile(storePath)
	if err != nil {
		t.Fatalf("read provider ops audit store: %v", err)
	}
	if !strings.Contains(string(raw), "provider.cancel.succeeded") {
		t.Fatalf("expected persisted file to contain audit action, got %s", string(raw))
	}

	providerOpsAuditMu.Lock()
	providerOpsAuditEntries = nil
	providerOpsAuditMu.Unlock()
	providerOpsAuditStore = nil
	providerOpsAuditStoreMode = ""
	providerOpsAuditStorePath = ""
	providerOpsAuditStoreInit = sync.Once{}

	snapshot := providerOpsAuditSnapshot()
	if len(snapshot) != 1 {
		t.Fatalf("expected one provider ops audit entry after reload, got %d", len(snapshot))
	}
	if snapshot[0].ActorID != "admin-ops-test" {
		t.Fatalf("expected actor admin-ops-test after reload, got %s", snapshot[0].ActorID)
	}
}

func TestFeedMetricsEndpointWithProviderRuntimeEnabled(t *testing.T) {
	t.Setenv("GATEWAY_PROVIDER_RUNTIME_ENABLED", "true")

	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	req := httptest.NewRequest(http.MethodGet, "/metrics/feed", nil)
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d, body=%s", res.Code, res.Body.String())
	}

	body := res.Body.String()
	expected := []string{
		"phoenix_provider_runtime_enabled",
		"phoenix_provider_stream_applied_total",
		"phoenix_provider_stream_snapshot_applied_total",
		"phoenix_provider_stream_throttle_events_total",
		"phoenix_provider_cancel_attempts_total",
		"phoenix_provider_cancel_success_total",
		"phoenix_bet_offer_created_total",
		"phoenix_bet_offer_status_total",
		"phoenix_cashout_quote_stale_reject_total",
		"phoenix_provider_stream_slo_breach",
		"phoenix_provider_slo_threshold",
	}
	for _, pattern := range expected {
		if !strings.Contains(body, pattern) {
			t.Fatalf("expected metrics body to contain %q", pattern)
		}
	}
}

func TestAdminWalletReconciliationApiV1PathWithAdminRole(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	creditReq := httptest.NewRequest(http.MethodPost, "/api/v1/wallet/credit", strings.NewReader(`{"userId":"u-rec-1","amountCents":1000,"idempotencyKey":"k1"}`))
	creditRes := httptest.NewRecorder()
	handler.ServeHTTP(creditRes, creditReq)
	if creditRes.Code != http.StatusOK {
		t.Fatalf("expected credit status 200, got %d body=%s", creditRes.Code, creditRes.Body.String())
	}

	debitReq := httptest.NewRequest(http.MethodPost, "/api/v1/wallet/debit", strings.NewReader(`{"userId":"u-rec-1","amountCents":250,"idempotencyKey":"k2"}`))
	debitRes := httptest.NewRecorder()
	handler.ServeHTTP(debitRes, debitReq)
	if debitRes.Code != http.StatusOK {
		t.Fatalf("expected debit status 200, got %d body=%s", debitRes.Code, debitRes.Body.String())
	}

	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/wallet/reconciliation", nil)
	req.Header.Set("X-Admin-Role", "admin")
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d, body=%s", res.Code, res.Body.String())
	}

	var payload map[string]any
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if int(payload["totalCreditsCents"].(float64)) != 1000 {
		t.Fatalf("expected totalCreditsCents=1000, got %v", payload["totalCreditsCents"])
	}
	if int(payload["totalDebitsCents"].(float64)) != 250 {
		t.Fatalf("expected totalDebitsCents=250, got %v", payload["totalDebitsCents"])
	}
}

func TestAdminWalletReconciliationIncludesBetLifecycleMutations(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	seedReq := httptest.NewRequest(http.MethodPost, "/api/v1/wallet/credit", strings.NewReader(`{"userId":"u-rec-bet-1","amountCents":5000,"idempotencyKey":"seed-rec-bet-1"}`))
	seedRes := httptest.NewRecorder()
	handler.ServeHTTP(seedRes, seedReq)
	if seedRes.Code != http.StatusOK {
		t.Fatalf("seed credit failed: status=%d body=%s", seedRes.Code, seedRes.Body.String())
	}

	placeReq := httptest.NewRequest(http.MethodPost, "/api/v1/bets/place", strings.NewReader(`{"userId":"u-rec-bet-1","marketId":"m:local:001","selectionId":"home","stakeCents":1000,"odds":2.0,"idempotencyKey":"rec-bet-place-1"}`))
	placeRes := httptest.NewRecorder()
	handler.ServeHTTP(placeRes, placeReq)
	if placeRes.Code != http.StatusOK {
		t.Fatalf("place bet failed: status=%d body=%s", placeRes.Code, placeRes.Body.String())
	}

	var placed map[string]any
	if err := json.Unmarshal(placeRes.Body.Bytes(), &placed); err != nil {
		t.Fatalf("decode place response: %v", err)
	}
	betID, _ := placed["betId"].(string)
	if betID == "" {
		t.Fatalf("expected betId in place response")
	}

	settleReq := httptest.NewRequest(http.MethodPost, "/api/v1/admin/bets/"+betID+"/lifecycle/settle", strings.NewReader(`{"winningSelectionId":"home","reason":"result confirmed"}`))
	settleReq.Header.Set("X-Admin-Role", "admin")
	settleRes := httptest.NewRecorder()
	handler.ServeHTTP(settleRes, settleReq)
	if settleRes.Code != http.StatusOK {
		t.Fatalf("settle bet failed: status=%d body=%s", settleRes.Code, settleRes.Body.String())
	}

	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/wallet/reconciliation", nil)
	req.Header.Set("X-Admin-Role", "admin")
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d, body=%s", res.Code, res.Body.String())
	}

	var payload map[string]any
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if int(payload["totalCreditsCents"].(float64)) != 7000 {
		t.Fatalf("expected totalCreditsCents=7000, got %v", payload["totalCreditsCents"])
	}
	if int(payload["totalDebitsCents"].(float64)) != 1000 {
		t.Fatalf("expected totalDebitsCents=1000, got %v", payload["totalDebitsCents"])
	}
	if int(payload["entryCount"].(float64)) != 3 {
		t.Fatalf("expected entryCount=3, got %v", payload["entryCount"])
	}
}

func TestAdminWalletReconciliationIncludesRefundLifecycleMutations(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	seedReq := httptest.NewRequest(http.MethodPost, "/api/v1/wallet/credit", strings.NewReader(`{"userId":"u-rec-bet-2","amountCents":5000,"idempotencyKey":"seed-rec-bet-2"}`))
	seedRes := httptest.NewRecorder()
	handler.ServeHTTP(seedRes, seedReq)
	if seedRes.Code != http.StatusOK {
		t.Fatalf("seed credit failed: status=%d body=%s", seedRes.Code, seedRes.Body.String())
	}

	placeReq := httptest.NewRequest(http.MethodPost, "/api/v1/bets/place", strings.NewReader(`{"userId":"u-rec-bet-2","marketId":"m:local:001","selectionId":"home","stakeCents":1000,"odds":2.0,"idempotencyKey":"rec-bet-place-2"}`))
	placeRes := httptest.NewRecorder()
	handler.ServeHTTP(placeRes, placeReq)
	if placeRes.Code != http.StatusOK {
		t.Fatalf("place bet failed: status=%d body=%s", placeRes.Code, placeRes.Body.String())
	}

	var placed map[string]any
	if err := json.Unmarshal(placeRes.Body.Bytes(), &placed); err != nil {
		t.Fatalf("decode place response: %v", err)
	}
	betID, _ := placed["betId"].(string)
	if betID == "" {
		t.Fatalf("expected betId in place response")
	}

	settleReq := httptest.NewRequest(http.MethodPost, "/api/v1/admin/bets/"+betID+"/lifecycle/settle", strings.NewReader(`{"winningSelectionId":"away","reason":"result confirmed"}`))
	settleReq.Header.Set("X-Admin-Role", "admin")
	settleRes := httptest.NewRecorder()
	handler.ServeHTTP(settleRes, settleReq)
	if settleRes.Code != http.StatusOK {
		t.Fatalf("settle bet failed: status=%d body=%s", settleRes.Code, settleRes.Body.String())
	}

	refundReq := httptest.NewRequest(http.MethodPost, "/api/v1/admin/bets/"+betID+"/lifecycle/refund", strings.NewReader(`{"reason":"operator goodwill"}`))
	refundReq.Header.Set("X-Admin-Role", "admin")
	refundRes := httptest.NewRecorder()
	handler.ServeHTTP(refundRes, refundReq)
	if refundRes.Code != http.StatusOK {
		t.Fatalf("refund bet failed: status=%d body=%s", refundRes.Code, refundRes.Body.String())
	}

	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/wallet/reconciliation", nil)
	req.Header.Set("X-Admin-Role", "admin")
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d, body=%s", res.Code, res.Body.String())
	}

	var payload map[string]any
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if int(payload["totalCreditsCents"].(float64)) != 6000 {
		t.Fatalf("expected totalCreditsCents=6000, got %v", payload["totalCreditsCents"])
	}
	if int(payload["totalDebitsCents"].(float64)) != 1000 {
		t.Fatalf("expected totalDebitsCents=1000, got %v", payload["totalDebitsCents"])
	}
	if int(payload["entryCount"].(float64)) != 3 {
		t.Fatalf("expected entryCount=3, got %v", payload["entryCount"])
	}
}

func TestAdminWalletReconciliationLifecycleFixtureParity(t *testing.T) {
	raw, err := os.ReadFile(filepath.Join("testdata", "reconciliation", "lifecycle_cases.json"))
	if err != nil {
		t.Fatalf("read reconciliation fixture: %v", err)
	}

	var fixture reconciliationLifecycleFixture
	if err := json.Unmarshal(raw, &fixture); err != nil {
		t.Fatalf("decode reconciliation fixture: %v", err)
	}
	if len(fixture.Cases) == 0 {
		t.Fatalf("expected at least one lifecycle reconciliation case")
	}

	for _, tc := range fixture.Cases {
		tc := tc
		t.Run(tc.Name, func(t *testing.T) {
			mux := http.NewServeMux()
			RegisterRoutes(mux, "gateway")
			handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

			seedBody := fmt.Sprintf(`{"userId":"%s","amountCents":%d,"idempotencyKey":"seed-%s"}`, tc.UserID, tc.SeedCents, tc.Name)
			seedReq := httptest.NewRequest(http.MethodPost, "/api/v1/wallet/credit", strings.NewReader(seedBody))
			seedRes := httptest.NewRecorder()
			handler.ServeHTTP(seedRes, seedReq)
			if seedRes.Code != http.StatusOK {
				t.Fatalf("seed credit failed: status=%d body=%s", seedRes.Code, seedRes.Body.String())
			}

			placeBody := fmt.Sprintf(`{"userId":"%s","marketId":"m:local:001","selectionId":"%s","stakeCents":%d,"odds":%.3f,"idempotencyKey":"place-%s"}`,
				tc.UserID,
				tc.PlacedSelectionID,
				tc.StakeCents,
				tc.Odds,
				tc.Name,
			)
			placeReq := httptest.NewRequest(http.MethodPost, "/api/v1/bets/place", strings.NewReader(placeBody))
			placeRes := httptest.NewRecorder()
			handler.ServeHTTP(placeRes, placeReq)
			if placeRes.Code != http.StatusOK {
				t.Fatalf("place bet failed: status=%d body=%s", placeRes.Code, placeRes.Body.String())
			}

			var placed map[string]any
			if err := json.Unmarshal(placeRes.Body.Bytes(), &placed); err != nil {
				t.Fatalf("decode place response: %v", err)
			}
			betID, _ := placed["betId"].(string)
			if betID == "" {
				t.Fatalf("expected betId in place response")
			}

			switch strings.ToLower(strings.TrimSpace(tc.PostLifecycle)) {
			case "cancel":
				cancelReq := httptest.NewRequest(http.MethodPost, "/api/v1/admin/bets/"+betID+"/lifecycle/cancel", strings.NewReader(`{"reason":"manual cancellation"}`))
				cancelReq.Header.Set("X-Admin-Role", "admin")
				cancelRes := httptest.NewRecorder()
				handler.ServeHTTP(cancelRes, cancelReq)
				if cancelRes.Code != http.StatusOK {
					t.Fatalf("cancel bet failed: status=%d body=%s", cancelRes.Code, cancelRes.Body.String())
				}
			default:
				settleBody := fmt.Sprintf(`{"winningSelectionId":"%s","reason":"result confirmed"}`, tc.WinningSelectionID)
				settleReq := httptest.NewRequest(http.MethodPost, "/api/v1/admin/bets/"+betID+"/lifecycle/settle", strings.NewReader(settleBody))
				settleReq.Header.Set("X-Admin-Role", "admin")
				settleRes := httptest.NewRecorder()
				handler.ServeHTTP(settleRes, settleReq)
				if settleRes.Code != http.StatusOK {
					t.Fatalf("settle bet failed: status=%d body=%s", settleRes.Code, settleRes.Body.String())
				}

				if strings.EqualFold(strings.TrimSpace(tc.PostLifecycle), "refund") {
					refundReq := httptest.NewRequest(http.MethodPost, "/api/v1/admin/bets/"+betID+"/lifecycle/refund", strings.NewReader(`{"reason":"operator goodwill"}`))
					refundReq.Header.Set("X-Admin-Role", "admin")
					refundRes := httptest.NewRecorder()
					handler.ServeHTTP(refundRes, refundReq)
					if refundRes.Code != http.StatusOK {
						t.Fatalf("refund bet failed: status=%d body=%s", refundRes.Code, refundRes.Body.String())
					}
				}
			}

			req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/wallet/reconciliation", nil)
			req.Header.Set("X-Admin-Role", "admin")
			res := httptest.NewRecorder()
			handler.ServeHTTP(res, req)
			if res.Code != http.StatusOK {
				t.Fatalf("reconciliation failed: status=%d body=%s", res.Code, res.Body.String())
			}

			var payload map[string]any
			if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
				t.Fatalf("decode reconciliation response: %v", err)
			}
			if int64(payload["totalCreditsCents"].(float64)) != tc.Expected.TotalCreditsCents {
				t.Fatalf("expected totalCreditsCents=%d, got %v", tc.Expected.TotalCreditsCents, payload["totalCreditsCents"])
			}
			if int64(payload["totalDebitsCents"].(float64)) != tc.Expected.TotalDebitsCents {
				t.Fatalf("expected totalDebitsCents=%d, got %v", tc.Expected.TotalDebitsCents, payload["totalDebitsCents"])
			}
			if int64(payload["netMovementCents"].(float64)) != tc.Expected.NetMovementCents {
				t.Fatalf("expected netMovementCents=%d, got %v", tc.Expected.NetMovementCents, payload["netMovementCents"])
			}
			if int64(payload["entryCount"].(float64)) != tc.Expected.EntryCount {
				t.Fatalf("expected entryCount=%d, got %v", tc.Expected.EntryCount, payload["entryCount"])
			}
			if int64(payload["distinctUserCount"].(float64)) != tc.Expected.DistinctUserCount {
				t.Fatalf("expected distinctUserCount=%d, got %v", tc.Expected.DistinctUserCount, payload["distinctUserCount"])
			}
		})
	}
}

func TestAdminWalletReconciliationRejectsInvalidTimestamp(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/wallet/reconciliation?from=not-a-time", nil)
	req.Header.Set("X-Admin-Role", "admin")
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d, body=%s", res.Code, res.Body.String())
	}
}

func TestAdminWalletCreditRequiresAdminRole(t *testing.T) {
	t.Setenv("GATEWAY_ALLOW_ADMIN_ANON", "")
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/wallet/credit", strings.NewReader(`{"userId":"u-admin-1","amountCents":1000,"idempotencyKey":"admin-credit-1"}`))
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusForbidden {
		t.Fatalf("expected status 403, got %d, body=%s", res.Code, res.Body.String())
	}
}

func TestAdminWalletCreditAndDebitWithAdminRole(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	creditReq := httptest.NewRequest(http.MethodPost, "/api/v1/admin/wallet/credit", strings.NewReader(`{"userId":"u-admin-2","amountCents":1000,"idempotencyKey":"admin-credit-2"}`))
	creditReq.Header.Set("X-Admin-Role", "admin")
	creditRes := httptest.NewRecorder()
	handler.ServeHTTP(creditRes, creditReq)
	if creditRes.Code != http.StatusOK {
		t.Fatalf("expected admin credit status 200, got %d, body=%s", creditRes.Code, creditRes.Body.String())
	}

	debitReq := httptest.NewRequest(http.MethodPost, "/api/v1/admin/wallet/debit", strings.NewReader(`{"userId":"u-admin-2","amountCents":250,"idempotencyKey":"admin-debit-2"}`))
	debitReq.Header.Set("X-Admin-Role", "admin")
	debitRes := httptest.NewRecorder()
	handler.ServeHTTP(debitRes, debitReq)
	if debitRes.Code != http.StatusOK {
		t.Fatalf("expected admin debit status 200, got %d, body=%s", debitRes.Code, debitRes.Body.String())
	}

	balanceReq := httptest.NewRequest(http.MethodGet, "/api/v1/wallet/u-admin-2", nil)
	balanceRes := httptest.NewRecorder()
	handler.ServeHTTP(balanceRes, balanceReq)
	if balanceRes.Code != http.StatusOK {
		t.Fatalf("expected balance status 200, got %d, body=%s", balanceRes.Code, balanceRes.Body.String())
	}

	var payload map[string]any
	if err := json.Unmarshal(balanceRes.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode balance payload: %v", err)
	}
	if int(payload["balanceCents"].(float64)) != 750 {
		t.Fatalf("expected balance 750, got %v", payload["balanceCents"])
	}
}

func TestAdminWalletCorrectionTaskWorkflow(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	createReq := httptest.NewRequest(http.MethodPost, "/api/v1/admin/wallet/corrections/tasks", strings.NewReader(`{"userId":"u-corr-http-1","reason":"manual risk review","details":"check ledger drift","suggestedAdjustmentCents":300}`))
	createReq.Header.Set("X-Admin-Role", "admin")
	createRes := httptest.NewRecorder()
	handler.ServeHTTP(createRes, createReq)
	if createRes.Code != http.StatusCreated {
		t.Fatalf("expected task create status 201, got %d body=%s", createRes.Code, createRes.Body.String())
	}

	var createdPayload struct {
		Task struct {
			TaskID string `json:"taskId"`
			UserID string `json:"userId"`
			Status string `json:"status"`
		} `json:"task"`
	}
	if err := json.Unmarshal(createRes.Body.Bytes(), &createdPayload); err != nil {
		t.Fatalf("decode create response: %v", err)
	}
	if createdPayload.Task.TaskID == "" {
		t.Fatalf("expected created task id")
	}
	if createdPayload.Task.Status != "open" {
		t.Fatalf("expected open task status, got %s", createdPayload.Task.Status)
	}

	resolveReq := httptest.NewRequest(http.MethodPost, "/api/v1/admin/wallet/corrections/tasks/"+createdPayload.Task.TaskID+"/resolve", strings.NewReader(`{"resolutionNote":"resolved by operator","adjustmentType":"credit","adjustmentCents":300,"idempotencyKey":"corr-http-1"}`))
	resolveReq.Header.Set("X-Admin-Role", "admin")
	resolveReq.Header.Set("X-Admin-Actor", "admin-risk-http-1")
	resolveRes := httptest.NewRecorder()
	handler.ServeHTTP(resolveRes, resolveReq)
	if resolveRes.Code != http.StatusOK {
		t.Fatalf("expected resolve status 200, got %d body=%s", resolveRes.Code, resolveRes.Body.String())
	}

	var resolvedPayload struct {
		Task struct {
			Status     string `json:"status"`
			ResolvedBy string `json:"resolvedBy"`
		} `json:"task"`
		Entry struct {
			UserID string `json:"userId"`
			Type   string `json:"type"`
		} `json:"entry"`
	}
	if err := json.Unmarshal(resolveRes.Body.Bytes(), &resolvedPayload); err != nil {
		t.Fatalf("decode resolve response: %v", err)
	}
	if resolvedPayload.Task.Status != "resolved" {
		t.Fatalf("expected resolved status, got %s", resolvedPayload.Task.Status)
	}
	if resolvedPayload.Task.ResolvedBy != "admin-risk-http-1" {
		t.Fatalf("expected resolvedBy admin-risk-http-1, got %s", resolvedPayload.Task.ResolvedBy)
	}
	if resolvedPayload.Entry.Type != "credit" {
		t.Fatalf("expected correction credit entry, got %+v", resolvedPayload.Entry)
	}

	listReq := httptest.NewRequest(http.MethodGet, "/api/v1/admin/wallet/corrections/tasks?status=resolved&includeScan=false", nil)
	listReq.Header.Set("X-Admin-Role", "admin")
	listRes := httptest.NewRecorder()
	handler.ServeHTTP(listRes, listReq)
	if listRes.Code != http.StatusOK {
		t.Fatalf("expected task list status 200, got %d body=%s", listRes.Code, listRes.Body.String())
	}
	if !strings.Contains(listRes.Body.String(), "\"resolved\"") {
		t.Fatalf("expected resolved task in list response")
	}
}

func TestPersonalizationRankingAndComboSuggestionsEndpoints(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	rankingReq := httptest.NewRequest(http.MethodGet, "/api/v1/personalization/ranking?userId=u-1&limit=5", nil)
	rankingRes := httptest.NewRecorder()
	handler.ServeHTTP(rankingRes, rankingReq)
	if rankingRes.Code != http.StatusOK {
		t.Fatalf("expected ranking status 200, got %d body=%s", rankingRes.Code, rankingRes.Body.String())
	}
	var rankingPayload struct {
		Items []struct {
			MarketID string  `json:"marketId"`
			Rank     int     `json:"rank"`
			Score    float64 `json:"score"`
		} `json:"items"`
	}
	if err := json.Unmarshal(rankingRes.Body.Bytes(), &rankingPayload); err != nil {
		t.Fatalf("decode ranking payload: %v", err)
	}
	if len(rankingPayload.Items) == 0 {
		t.Fatalf("expected at least one ranked market")
	}
	if rankingPayload.Items[0].Rank != 1 {
		t.Fatalf("expected first ranked item rank=1, got %d", rankingPayload.Items[0].Rank)
	}

	comboReq := httptest.NewRequest(http.MethodGet, "/api/v1/personalization/combo-suggestions?userId=u-1&limit=3", nil)
	comboRes := httptest.NewRecorder()
	handler.ServeHTTP(comboRes, comboReq)
	if comboRes.Code != http.StatusOK {
		t.Fatalf("expected combo status 200, got %d body=%s", comboRes.Code, comboRes.Body.String())
	}
	var comboPayload struct {
		Items []struct {
			SuggestionID string `json:"suggestionId"`
			Eligible     bool   `json:"eligible"`
			Legs         []any  `json:"legs"`
		} `json:"items"`
	}
	if err := json.Unmarshal(comboRes.Body.Bytes(), &comboPayload); err != nil {
		t.Fatalf("decode combo payload: %v", err)
	}
	if len(comboPayload.Items) == 0 {
		t.Fatalf("expected combo suggestions")
	}
	if !comboPayload.Items[0].Eligible || len(comboPayload.Items[0].Legs) < 2 {
		t.Fatalf("expected eligible multi-leg combo suggestion, got %+v", comboPayload.Items[0])
	}
}

func TestAdminRiskScoresAndSegmentsEndpoints(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	seedWalletReq := httptest.NewRequest(http.MethodPost, "/api/v1/wallet/credit", strings.NewReader(`{"userId":"u-risk-http-1","amountCents":5000,"idempotencyKey":"seed-risk-http-1"}`))
	seedWalletRes := httptest.NewRecorder()
	handler.ServeHTTP(seedWalletRes, seedWalletReq)
	if seedWalletRes.Code != http.StatusOK {
		t.Fatalf("seed wallet credit failed: status=%d body=%s", seedWalletRes.Code, seedWalletRes.Body.String())
	}

	placeReq := httptest.NewRequest(http.MethodPost, "/api/v1/bets/place", strings.NewReader(`{"userId":"u-risk-http-1","marketId":"m:local:001","selectionId":"home","stakeCents":700,"odds":1.88,"idempotencyKey":"seed-risk-bet-http-1"}`))
	placeRes := httptest.NewRecorder()
	handler.ServeHTTP(placeRes, placeReq)
	if placeRes.Code != http.StatusOK {
		t.Fatalf("seed bet failed: status=%d body=%s", placeRes.Code, placeRes.Body.String())
	}

	scoreReq := httptest.NewRequest(http.MethodGet, "/api/v1/admin/risk/player-scores?userId=u-risk-http-1", nil)
	scoreReq.Header.Set("X-Admin-Role", "admin")
	scoreRes := httptest.NewRecorder()
	handler.ServeHTTP(scoreRes, scoreReq)
	if scoreRes.Code != http.StatusOK {
		t.Fatalf("expected risk score status 200, got %d body=%s", scoreRes.Code, scoreRes.Body.String())
	}
	if !strings.Contains(scoreRes.Body.String(), "\"modelVersion\"") {
		t.Fatalf("expected modelVersion in score response")
	}

	overrideReq := httptest.NewRequest(http.MethodPost, "/api/v1/admin/risk/segments/u-risk-http-1/override", strings.NewReader(`{"segmentId":"vip_manual","reason":"operator override"}`))
	overrideReq.Header.Set("X-Admin-Role", "admin")
	overrideReq.Header.Set("X-Admin-Actor", "admin-risk-http-2")
	overrideRes := httptest.NewRecorder()
	handler.ServeHTTP(overrideRes, overrideReq)
	if overrideRes.Code != http.StatusOK {
		t.Fatalf("expected segment override status 200, got %d body=%s", overrideRes.Code, overrideRes.Body.String())
	}

	segmentsReq := httptest.NewRequest(http.MethodGet, "/api/v1/admin/risk/segments?userId=u-risk-http-1", nil)
	segmentsReq.Header.Set("X-Admin-Role", "admin")
	segmentsRes := httptest.NewRecorder()
	handler.ServeHTTP(segmentsRes, segmentsReq)
	if segmentsRes.Code != http.StatusOK {
		t.Fatalf("expected segments status 200, got %d body=%s", segmentsRes.Code, segmentsRes.Body.String())
	}
	if !strings.Contains(segmentsRes.Body.String(), "\"vip_manual\"") {
		t.Fatalf("expected manual segment override in segments response")
	}
}

func TestAdminSettleSupportsWinningSelectionIDsArrayForBuilderBet(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	seedReq := httptest.NewRequest(http.MethodPost, "/api/v1/wallet/credit", strings.NewReader(`{"userId":"u-admin-settle-array-1","amountCents":5000,"idempotencyKey":"seed-admin-settle-array-1"}`))
	seedRes := httptest.NewRecorder()
	handler.ServeHTTP(seedRes, seedReq)
	if seedRes.Code != http.StatusOK {
		t.Fatalf("seed credit failed: status=%d body=%s", seedRes.Code, seedRes.Body.String())
	}

	quoteReq := httptest.NewRequest(http.MethodPost, "/api/v1/bets/builder/quote", strings.NewReader(`{"userId":"u-admin-settle-array-1","requestId":"builder-admin-array-quote-1","legs":[{"marketId":"m:local:001","selectionId":"home"},{"marketId":"m:local:002","selectionId":"over"}]}`))
	quoteRes := httptest.NewRecorder()
	handler.ServeHTTP(quoteRes, quoteReq)
	if quoteRes.Code != http.StatusOK {
		t.Fatalf("builder quote failed: status=%d body=%s", quoteRes.Code, quoteRes.Body.String())
	}

	var quoted map[string]any
	if err := json.Unmarshal(quoteRes.Body.Bytes(), &quoted); err != nil {
		t.Fatalf("decode quote response: %v", err)
	}
	quoteID, _ := quoted["quoteId"].(string)
	if quoteID == "" {
		t.Fatalf("expected quoteId in builder quote response")
	}

	acceptReq := httptest.NewRequest(http.MethodPost, "/api/v1/bets/builder/accept", strings.NewReader(fmt.Sprintf(`{"quoteId":"%s","userId":"u-admin-settle-array-1","requestId":"builder-admin-array-accept-1","stakeCents":500}`, quoteID)))
	acceptRes := httptest.NewRecorder()
	handler.ServeHTTP(acceptRes, acceptReq)
	if acceptRes.Code != http.StatusOK {
		t.Fatalf("builder accept failed: status=%d body=%s", acceptRes.Code, acceptRes.Body.String())
	}

	var accepted map[string]any
	if err := json.Unmarshal(acceptRes.Body.Bytes(), &accepted); err != nil {
		t.Fatalf("decode accept response: %v", err)
	}
	acceptedBet, ok := accepted["bet"].(map[string]any)
	if !ok {
		t.Fatalf("expected bet object in accept response")
	}
	betID, _ := acceptedBet["betId"].(string)
	if betID == "" {
		t.Fatalf("expected betId in accept response bet payload")
	}

	settleReq := httptest.NewRequest(http.MethodPost, "/api/v1/admin/bets/"+betID+"/lifecycle/settle", strings.NewReader(`{"winningSelectionIds":["over","home"],"reason":"result confirmed"}`))
	settleReq.Header.Set("X-Admin-Role", "admin")
	settleRes := httptest.NewRecorder()
	handler.ServeHTTP(settleRes, settleReq)
	if settleRes.Code != http.StatusOK {
		t.Fatalf("settle with winningSelectionIds failed: status=%d body=%s", settleRes.Code, settleRes.Body.String())
	}

	var settled map[string]any
	if err := json.Unmarshal(settleRes.Body.Bytes(), &settled); err != nil {
		t.Fatalf("decode settle response: %v", err)
	}
	if settled["status"] != "settled_won" {
		t.Fatalf("expected status settled_won, got %v", settled["status"])
	}
	if settled["settlementReference"] != "home,over" {
		t.Fatalf("expected normalized settlement reference home,over, got %v", settled["settlementReference"])
	}
}

func TestAdminSettleRejectsMissingWinningSelectionFields(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	seedReq := httptest.NewRequest(http.MethodPost, "/api/v1/wallet/credit", strings.NewReader(`{"userId":"u-admin-settle-array-2","amountCents":5000,"idempotencyKey":"seed-admin-settle-array-2"}`))
	seedRes := httptest.NewRecorder()
	handler.ServeHTTP(seedRes, seedReq)
	if seedRes.Code != http.StatusOK {
		t.Fatalf("seed credit failed: status=%d body=%s", seedRes.Code, seedRes.Body.String())
	}

	placeReq := httptest.NewRequest(http.MethodPost, "/api/v1/bets/place", strings.NewReader(`{"userId":"u-admin-settle-array-2","marketId":"m:local:001","selectionId":"home","stakeCents":500,"odds":1.95,"idempotencyKey":"admin-settle-array-place-1"}`))
	placeRes := httptest.NewRecorder()
	handler.ServeHTTP(placeRes, placeReq)
	if placeRes.Code != http.StatusOK {
		t.Fatalf("place bet failed: status=%d body=%s", placeRes.Code, placeRes.Body.String())
	}

	var placed map[string]any
	if err := json.Unmarshal(placeRes.Body.Bytes(), &placed); err != nil {
		t.Fatalf("decode place response: %v", err)
	}
	betID, _ := placed["betId"].(string)
	if betID == "" {
		t.Fatalf("expected betId in place response")
	}

	settleReq := httptest.NewRequest(http.MethodPost, "/api/v1/admin/bets/"+betID+"/lifecycle/settle", strings.NewReader(`{"winningSelectionIds":[],"reason":"result confirmed"}`))
	settleReq.Header.Set("X-Admin-Role", "admin")
	settleRes := httptest.NewRecorder()
	handler.ServeHTTP(settleRes, settleReq)
	if settleRes.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400 for missing winning selection payload, got %d body=%s", settleRes.Code, settleRes.Body.String())
	}
}

func TestNormalizeWinningSelectionInput(t *testing.T) {
	normalized := normalizeWinningSelectionInput("", []string{" home ", "away", "HOME", "", "Away"})
	if normalized != "home,away" {
		t.Fatalf("expected normalized unique input home,away, got %s", normalized)
	}

	legacy := normalizeWinningSelectionInput("  draw  ", nil)
	if legacy != "draw" {
		t.Fatalf("expected legacy fallback draw, got %s", legacy)
	}
}

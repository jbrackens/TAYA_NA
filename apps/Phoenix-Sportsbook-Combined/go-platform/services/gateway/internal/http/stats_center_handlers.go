package http

import (
	"errors"
	stdhttp "net/http"
	"strings"
	"time"

	"phoenix-revival/gateway/internal/domain"
	"phoenix-revival/platform/transport/httpx"
)

type fixtureStatPair struct {
	Home float64 `json:"home"`
	Away float64 `json:"away"`
	Unit string  `json:"unit,omitempty"`
}

type fixtureStatsResponse struct {
	FixtureID    string                     `json:"fixtureId"`
	Status       string                     `json:"status"`
	Period       string                     `json:"period,omitempty"`
	ClockSeconds int64                      `json:"clockSeconds,omitempty"`
	Metrics      map[string]fixtureStatPair `json:"metrics,omitempty"`
	UpdatedAt    string                     `json:"updatedAt"`
}

func registerStatsCenterRoutes(mux *stdhttp.ServeMux, repository domain.ReadRepository) {
	prefix := "/api/v1/stats/fixtures/"
	mux.Handle(prefix, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}

		fixtureID := strings.TrimSpace(strings.TrimPrefix(r.URL.Path, prefix))
		if fixtureID == "" {
			return httpx.NotFound("fixture not found")
		}

		fixture, err := repository.GetFixtureByID(fixtureID)
		if err != nil {
			if errors.Is(err, domain.ErrNotFound) {
				return httpx.NotFound("fixture not found")
			}
			return httpx.Internal("failed to fetch fixture stats", err)
		}

		markets, _, err := repository.ListMarkets(domain.MarketFilter{
			FixtureID: fixtureID,
		}, domain.PageRequest{
			Page:     1,
			PageSize: 500,
			SortBy:   "startsAt",
			SortDir:  "asc",
		})
		if err != nil {
			return httpx.Internal("failed to fetch fixture markets for stats", err)
		}

		return httpx.WriteJSON(w, stdhttp.StatusOK, buildFixtureStatsResponse(fixture, markets))
	}))
}

func buildFixtureStatsResponse(fixture domain.Fixture, markets []domain.Market) fixtureStatsResponse {
	now := time.Now().UTC()
	status := "scheduled"
	period := "PRE"
	clockSeconds := int64(0)
	openMarkets := 0
	for _, market := range markets {
		if strings.EqualFold(market.Status, "open") {
			openMarkets++
		}
	}
	if openMarkets > 0 {
		status = "in_play"
		period = "1H"
		clockSeconds = 22 * 60
	}

	totalMarkets := len(markets)
	homePossession := 50.0
	awayPossession := 50.0
	if openMarkets > 0 {
		homePossession = 55.0
		awayPossession = 45.0
	}

	return fixtureStatsResponse{
		FixtureID:    fixture.ID,
		Status:       status,
		Period:       period,
		ClockSeconds: clockSeconds,
		Metrics: map[string]fixtureStatPair{
			"shots_on_target": {
				Home: float64(openMarkets + 2),
				Away: float64((totalMarkets - openMarkets) + 1),
			},
			"corners": {
				Home: float64(openMarkets + 1),
				Away: float64(totalMarkets - openMarkets),
			},
			"possession_pct": {
				Home: homePossession,
				Away: awayPossession,
				Unit: "percent",
			},
			"open_markets": {
				Home: float64(openMarkets),
				Away: 0,
				Unit: "count",
			},
		},
		UpdatedAt: now.Format(time.RFC3339),
	}
}

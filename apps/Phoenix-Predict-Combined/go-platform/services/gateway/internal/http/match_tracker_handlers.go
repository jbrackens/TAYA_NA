package http

import (
	"errors"
	stdhttp "net/http"
	"strings"
	"time"

	"phoenix-revival/gateway/internal/domain"
	"phoenix-revival/gateway/internal/matchtracker"
	canonicalv1 "phoenix-revival/platform/canonical/v1"
	"phoenix-revival/platform/transport/httpx"
)

type matchTrackerScore struct {
	Home int `json:"home"`
	Away int `json:"away"`
}

type matchTrackerIncident struct {
	IncidentID   string            `json:"incidentId"`
	FixtureID    string            `json:"fixtureId"`
	Type         string            `json:"type"`
	Period       string            `json:"period,omitempty"`
	ClockSeconds int64             `json:"clockSeconds,omitempty"`
	Score        matchTrackerScore `json:"score,omitempty"`
	Details      map[string]string `json:"details,omitempty"`
	OccurredAt   string            `json:"occurredAt"`
}

type matchTrackerTimeline struct {
	FixtureID    string                 `json:"fixtureId"`
	Status       string                 `json:"status"`
	Period       string                 `json:"period,omitempty"`
	ClockSeconds int64                  `json:"clockSeconds,omitempty"`
	Score        matchTrackerScore      `json:"score"`
	Incidents    []matchTrackerIncident `json:"incidents,omitempty"`
	UpdatedAt    string                 `json:"updatedAt"`
}

func registerMatchTrackerRoutes(
	mux *stdhttp.ServeMux,
	repository domain.ReadRepository,
	matchTrackerService *matchtracker.Service,
) {
	prefix := "/api/v1/match-tracker/fixtures/"
	mux.Handle(prefix, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}

		fixtureID := strings.TrimSpace(strings.TrimPrefix(r.URL.Path, prefix))
		if fixtureID == "" {
			return httpx.NotFound("fixture not found")
		}

		if matchTrackerService != nil {
			if timeline, exists := matchTrackerService.GetTimeline(fixtureID); exists {
				return httpx.WriteJSON(w, stdhttp.StatusOK, toHTTPMatchTrackerTimeline(timeline))
			}
		}

		fixture, err := repository.GetFixtureByID(fixtureID)
		if err != nil {
			if errors.Is(err, domain.ErrNotFound) {
				return httpx.NotFound("fixture not found")
			}
			return httpx.Internal("failed to fetch fixture match tracker", err)
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
			return httpx.Internal("failed to fetch fixture markets for match tracker", err)
		}

		return httpx.WriteJSON(w, stdhttp.StatusOK, buildMatchTrackerTimeline(fixture, markets))
	}))
}

func toHTTPMatchTrackerTimeline(timeline canonicalv1.MatchTimeline) matchTrackerTimeline {
	incidents := make([]matchTrackerIncident, 0, len(timeline.Incidents))
	for _, incident := range timeline.Incidents {
		incidents = append(incidents, matchTrackerIncident{
			IncidentID:   incident.IncidentID,
			FixtureID:    incident.FixtureID,
			Type:         string(incident.Type),
			Period:       incident.Period,
			ClockSeconds: incident.ClockSeconds,
			Score: matchTrackerScore{
				Home: incident.Score.Home,
				Away: incident.Score.Away,
			},
			Details:    incident.Details,
			OccurredAt: incident.OccurredAt.UTC().Format(time.RFC3339),
		})
	}

	updatedAt := timeline.UpdatedAt.UTC()
	if updatedAt.IsZero() {
		updatedAt = time.Now().UTC()
	}

	return matchTrackerTimeline{
		FixtureID:    timeline.FixtureID,
		Status:       string(timeline.Status),
		Period:       timeline.Period,
		ClockSeconds: timeline.ClockSeconds,
		Score: matchTrackerScore{
			Home: timeline.Score.Home,
			Away: timeline.Score.Away,
		},
		Incidents: incidents,
		UpdatedAt: updatedAt.Format(time.RFC3339),
	}
}

func buildMatchTrackerTimeline(fixture domain.Fixture, markets []domain.Market) matchTrackerTimeline {
	score := matchTrackerScore{Home: 0, Away: 0}
	startedAt := parseMatchTrackerTime(fixture.StartsAt, time.Now().UTC())
	now := time.Now().UTC()
	clockSeconds := int64(0)
	period := "PRE"
	status := "scheduled"

	hasOpenMarkets := false
	for _, market := range markets {
		if strings.EqualFold(market.Status, "open") {
			hasOpenMarkets = true
			break
		}
	}
	if hasOpenMarkets {
		status = "in_play"
		period = "1H"
		clockSeconds = 22 * 60
	}

	incidents := []matchTrackerIncident{
		{
			IncidentID:   "inc:" + fixture.ID + ":kickoff",
			FixtureID:    fixture.ID,
			Type:         "kickoff",
			Period:       "1H",
			ClockSeconds: 0,
			Score:        score,
			OccurredAt:   startedAt.Format(time.RFC3339),
		},
	}

	if len(markets) > 0 {
		first := markets[0]
		incidents = append(incidents, matchTrackerIncident{
			IncidentID:   "inc:" + fixture.ID + ":market-shift",
			FixtureID:    fixture.ID,
			Type:         "market_shift",
			Period:       period,
			ClockSeconds: clockSeconds,
			Score:        score,
			Details: map[string]string{
				"marketId":     first.ID,
				"marketName":   first.Name,
				"marketStatus": first.Status,
			},
			OccurredAt: now.Format(time.RFC3339),
		})
	}

	return matchTrackerTimeline{
		FixtureID:    fixture.ID,
		Status:       status,
		Period:       period,
		ClockSeconds: clockSeconds,
		Score:        score,
		Incidents:    incidents,
		UpdatedAt:    now.Format(time.RFC3339),
	}
}

func parseMatchTrackerTime(raw string, fallback time.Time) time.Time {
	parsed, err := time.Parse(time.RFC3339, strings.TrimSpace(raw))
	if err != nil {
		return fallback
	}
	return parsed.UTC()
}

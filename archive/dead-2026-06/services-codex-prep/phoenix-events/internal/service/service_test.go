package service

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"testing"
	"time"

	"github.com/phoenixbot/phoenix-events/internal/models"
	"github.com/phoenixbot/phoenix-events/internal/repository"
)

type fakeRepository struct {
	createFn      func(ctx context.Context, req models.CreateEventRequest) (*models.Event, error)
	upsertFn      func(ctx context.Context, req models.CreateEventRequest) (*models.Event, bool, error)
	getFn         func(ctx context.Context, eventID string) (*models.Event, error)
	listFn        func(ctx context.Context, filters models.EventFilters) ([]*models.Event, int, error)
	statusFn      func(ctx context.Context, eventID string, status string) (*models.Event, error)
	liveScoreFn   func(ctx context.Context, eventID string, req models.UpdateLiveScoreRequest) (*models.Event, error)
	resultFn      func(ctx context.Context, eventID string, req models.UpdateResultRequest) (*models.Event, error)
	sportsFn      func(ctx context.Context) ([]models.SportSummary, error)
	leaguesFn     func(ctx context.Context, sport string) ([]models.LeagueSummary, error)
	tournamentsFn func(ctx context.Context, sport string) ([]models.TournamentSummary, error)
}

func (f *fakeRepository) CreateEvent(ctx context.Context, req models.CreateEventRequest) (*models.Event, error) {
	return f.createFn(ctx, req)
}
func (f *fakeRepository) UpsertEvent(ctx context.Context, req models.CreateEventRequest) (*models.Event, bool, error) {
	return f.upsertFn(ctx, req)
}
func (f *fakeRepository) GetEvent(ctx context.Context, eventID string) (*models.Event, error) {
	return f.getFn(ctx, eventID)
}
func (f *fakeRepository) ListEvents(ctx context.Context, filters models.EventFilters) ([]*models.Event, int, error) {
	return f.listFn(ctx, filters)
}
func (f *fakeRepository) UpdateFixtureStatus(ctx context.Context, eventID string, status string) (*models.Event, error) {
	return f.statusFn(ctx, eventID, status)
}
func (f *fakeRepository) UpdateLiveScore(ctx context.Context, eventID string, req models.UpdateLiveScoreRequest) (*models.Event, error) {
	return f.liveScoreFn(ctx, eventID, req)
}
func (f *fakeRepository) UpdateResult(ctx context.Context, eventID string, req models.UpdateResultRequest) (*models.Event, error) {
	return f.resultFn(ctx, eventID, req)
}
func (f *fakeRepository) ListSports(ctx context.Context) ([]models.SportSummary, error) {
	return f.sportsFn(ctx)
}
func (f *fakeRepository) ListLeagues(ctx context.Context, sport string) ([]models.LeagueSummary, error) {
	return f.leaguesFn(ctx, sport)
}
func (f *fakeRepository) ListTournaments(ctx context.Context, sport string) ([]models.TournamentSummary, error) {
	return f.tournamentsFn(ctx, sport)
}

func TestCreateEventValidationAndRoles(t *testing.T) {
	logger := slog.New(slog.NewJSONHandler(io.Discard, nil))
	now := time.Now().UTC()
	tests := []struct {
		name    string
		request *models.CreateEventRequest
		actor   models.AuthClaims
		wantErr bool
	}{
		{name: "reject missing external id", request: &models.CreateEventRequest{Sport: "soccer", HomeTeam: "A", AwayTeam: "B", ScheduledStart: now}, actor: models.AuthClaims{Role: "data-provider"}, wantErr: true},
		{name: "reject bad role", request: &models.CreateEventRequest{ExternalEventID: "espn_1", Sport: "soccer", HomeTeam: "A", AwayTeam: "B", ScheduledStart: now}, actor: models.AuthClaims{Role: "player"}, wantErr: true},
		{name: "accept provider", request: &models.CreateEventRequest{ExternalEventID: "espn_1", Sport: "soccer", HomeTeam: "A", AwayTeam: "B", ScheduledStart: now}, actor: models.AuthClaims{Role: "data-provider"}, wantErr: false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := &fakeRepository{createFn: func(ctx context.Context, req models.CreateEventRequest) (*models.Event, error) {
				return &models.Event{EventID: "evt_1", ExternalEventID: req.ExternalEventID, Sport: req.Sport, HomeTeam: req.HomeTeam, AwayTeam: req.AwayTeam, ScheduledStart: req.ScheduledStart, Status: "scheduled"}, nil
			}}
			svc := NewService(logger, repo)
			_, err := svc.CreateEvent(context.Background(), tt.request, tt.actor)
			if tt.wantErr && err == nil {
				t.Fatalf("expected error")
			}
			if !tt.wantErr && err != nil {
				t.Fatalf("did not expect error: %v", err)
			}
		})
	}
}

func TestUpdateLiveScoreValidation(t *testing.T) {
	logger := slog.New(slog.NewJSONHandler(io.Discard, nil))
	repo := &fakeRepository{liveScoreFn: func(ctx context.Context, eventID string, req models.UpdateLiveScoreRequest) (*models.Event, error) {
		return &models.Event{EventID: eventID, Status: req.Status, LiveScore: &models.LiveScore{HomeScore: req.HomeScore, AwayScore: req.AwayScore, ElapsedMinutes: req.ElapsedMinutes, LastUpdate: req.LastUpdate}}, nil
	}}
	svc := NewService(logger, repo)
	_, err := svc.UpdateLiveScore(context.Background(), "evt_1", &models.UpdateLiveScoreRequest{Status: "scheduled"}, models.AuthClaims{Role: "data-provider"})
	if err == nil {
		t.Fatalf("expected validation error")
	}
	updated, err := svc.UpdateLiveScore(context.Background(), "evt_1", &models.UpdateLiveScoreRequest{Status: "live", HomeScore: 1, AwayScore: 0, ElapsedMinutes: 45, LastUpdate: time.Now().UTC()}, models.AuthClaims{Role: "data-provider"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if updated.LiveScore == nil || updated.LiveScore.HomeScore != 1 {
		t.Fatalf("expected updated live score")
	}
}

func TestListLeaguesRequiresSport(t *testing.T) {
	logger := slog.New(slog.NewJSONHandler(io.Discard, nil))
	svc := NewService(logger, &fakeRepository{leaguesFn: func(ctx context.Context, sport string) ([]models.LeagueSummary, error) {
		return []models.LeagueSummary{}, nil
	}})
	_, err := svc.ListLeagues(context.Background(), "")
	if err == nil {
		t.Fatalf("expected error")
	}
}

func TestGetMatchTrackerUsesPersistedIncidentsWhenAvailable(t *testing.T) {
	logger := slog.New(slog.NewJSONHandler(io.Discard, nil))
	clock := 1320
	now := time.Date(2026, 3, 12, 10, 22, 0, 0, time.UTC)
	svc := NewService(logger, &fakeRepository{
		getFn: func(ctx context.Context, eventID string) (*models.Event, error) {
			return &models.Event{
				EventID:      eventID,
				Status:       "live",
				Period:       "1H",
				ClockSeconds: &clock,
				LiveScore: &models.LiveScore{
					HomeScore:  1,
					AwayScore:  0,
					LastUpdate: now,
				},
				Incidents: []models.MatchTrackerIncident{{
					IncidentID:   eventID + ":goal-1",
					FixtureID:    eventID,
					Type:         "goal",
					Period:       "1H",
					ClockSeconds: &clock,
					OccurredAt:   now.Format(time.RFC3339),
					Score:        &models.MatchTrackerScore{Home: 1, Away: 0},
				}},
				UpdatedAt: now,
			}, nil
		},
	})

	response, err := svc.GetMatchTracker(context.Background(), "evt_1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if response.FixtureID != "evt_1" || response.Status != "live" {
		t.Fatalf("unexpected response header: %+v", response)
	}
	if len(response.Incidents) != 1 || response.Incidents[0].Type != "goal" {
		t.Fatalf("expected persisted incidents, got %+v", response.Incidents)
	}
}

func TestGetMatchTrackerBuildsFallbackTimeline(t *testing.T) {
	logger := slog.New(slog.NewJSONHandler(io.Discard, nil))
	start := time.Date(2026, 3, 12, 10, 0, 0, 0, time.UTC)
	update := start.Add(22 * time.Minute)
	clock := 1320
	svc := NewService(logger, &fakeRepository{
		getFn: func(ctx context.Context, eventID string) (*models.Event, error) {
			return &models.Event{
				EventID:        eventID,
				Status:         "live",
				ScheduledStart: start,
				Period:         "1H",
				ClockSeconds:   &clock,
				LiveScore: &models.LiveScore{
					HomeScore:  1,
					AwayScore:  0,
					LastUpdate: update,
				},
				UpdatedAt: update,
			}, nil
		},
	})

	response, err := svc.GetMatchTracker(context.Background(), "evt_2")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(response.Incidents) != 2 {
		t.Fatalf("expected fallback incidents, got %+v", response.Incidents)
	}
	if response.Incidents[0].Type != "kickoff" || response.Incidents[1].Type != "score_update" {
		t.Fatalf("unexpected fallback incident types: %+v", response.Incidents)
	}
}

func TestRepositoryErrorsBubbleUp(t *testing.T) {
	logger := slog.New(slog.NewJSONHandler(io.Discard, nil))
	svc := NewService(logger, &fakeRepository{getFn: func(ctx context.Context, eventID string) (*models.Event, error) {
		return nil, repository.ErrNotFound
	}})
	_, err := svc.GetEvent(context.Background(), "evt_1")
	if !errors.Is(err, repository.ErrNotFound) {
		t.Fatalf("expected repository.ErrNotFound, got %v", err)
	}
}

func TestGetFixtureStatsDerivesResponse(t *testing.T) {
	logger := slog.New(slog.NewJSONHandler(io.Discard, nil))
	lastUpdate := time.Date(2026, 3, 12, 15, 4, 0, 0, time.UTC)
	svc := NewService(logger, &fakeRepository{getFn: func(ctx context.Context, eventID string) (*models.Event, error) {
		return &models.Event{
			EventID: eventID,
			Status:  "live",
			LiveScore: &models.LiveScore{
				HomeScore:      2,
				AwayScore:      1,
				ElapsedMinutes: 22,
				LastUpdate:     lastUpdate,
			},
		}, nil
	}})

	stats, err := svc.GetFixtureStats(context.Background(), "f:local:001")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if stats.FixtureID != "f:local:001" {
		t.Fatalf("fixtureId = %s", stats.FixtureID)
	}
	if stats.Status != "in_play" {
		t.Fatalf("status = %s", stats.Status)
	}
	if stats.Period != "1H" {
		t.Fatalf("period = %s", stats.Period)
	}
	if stats.ClockSeconds == nil || *stats.ClockSeconds != 1320 {
		t.Fatalf("clockSeconds = %+v", stats.ClockSeconds)
	}
	if stats.Metrics["score"].Home != 2 || stats.Metrics["score"].Away != 1 {
		t.Fatalf("score metric = %+v", stats.Metrics["score"])
	}
	if stats.UpdatedAt != lastUpdate.Format(time.RFC3339) {
		t.Fatalf("updatedAt = %s", stats.UpdatedAt)
	}
}

func TestUpsertProviderEventHonorsRoles(t *testing.T) {
	logger := slog.New(slog.NewJSONHandler(io.Discard, nil))
	now := time.Now().UTC()
	svc := NewService(logger, &fakeRepository{upsertFn: func(ctx context.Context, req models.CreateEventRequest) (*models.Event, bool, error) {
		return &models.Event{EventID: "evt_1", ExternalEventID: req.ExternalEventID, Sport: req.Sport}, true, nil
	}})

	if _, err := svc.UpsertProviderEvent(context.Background(), &models.CreateEventRequest{ExternalEventID: "feed_1", Sport: "soccer", HomeTeam: "A", AwayTeam: "B", ScheduledStart: now}, models.AuthClaims{Role: "player"}); err == nil {
		t.Fatalf("expected permission error")
	}
	resp, err := svc.UpsertProviderEvent(context.Background(), &models.CreateEventRequest{ExternalEventID: "feed_1", Sport: "soccer", HomeTeam: "A", AwayTeam: "B", ScheduledStart: now}, models.AuthClaims{Role: "data-provider"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !resp.Created || resp.Event.EventID != "evt_1" {
		t.Fatalf("unexpected upsert response: %+v", resp)
	}
}

func TestSyncMockDataEventsNormalizesAndUpdatesStatus(t *testing.T) {
	logger := slog.New(slog.NewJSONHandler(io.Discard, nil))
	now := time.Now().UTC()
	upsertCalls := 0
	svc := NewService(logger, &fakeRepository{
		upsertFn: func(ctx context.Context, req models.CreateEventRequest) (*models.Event, bool, error) {
			upsertCalls++
			if req.ExternalEventID != "mockdata:fixture_001" {
				t.Fatalf("unexpected external id %s", req.ExternalEventID)
			}
			return &models.Event{EventID: "evt_1", ExternalEventID: req.ExternalEventID, Sport: req.Sport, Status: "scheduled"}, true, nil
		},
		statusFn: func(ctx context.Context, eventID string, status string) (*models.Event, error) {
			if eventID != "evt_1" || status != "live" {
				t.Fatalf("unexpected status update: %s %s", eventID, status)
			}
			return &models.Event{EventID: "evt_1", ExternalEventID: "mockdata:fixture_001", Sport: "soccer", Status: status}, nil
		},
	})

	resp, err := svc.SyncMockDataEvents(context.Background(), &models.SyncMockDataEventsRequest{
		Events: []models.MockDataEventInput{{
			ProviderEventID: "fixture_001",
			Sport:           "Soccer",
			League:          "EPL",
			HomeTeam:        "A",
			AwayTeam:        "B",
			ScheduledStart:  now,
			Status:          "live",
		}},
	}, models.AuthClaims{Role: "data-provider"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if upsertCalls != 1 {
		t.Fatalf("expected one upsert call, got %d", upsertCalls)
	}
	if resp.Provider != "mockdata" || resp.Synced != 1 || resp.Created != 1 || resp.Updated != 0 {
		t.Fatalf("unexpected response counts: %+v", resp)
	}
	if len(resp.Items) != 1 || resp.Items[0].Status != "live" {
		t.Fatalf("unexpected sync items: %+v", resp.Items)
	}
}

func TestSyncOddinEventsNormalizesAndUpdatesStatus(t *testing.T) {
	logger := slog.New(slog.NewJSONHandler(io.Discard, nil))
	now := time.Now().UTC()
	upsertCalls := 0
	svc := NewService(logger, &fakeRepository{
		upsertFn: func(ctx context.Context, req models.CreateEventRequest) (*models.Event, bool, error) {
			upsertCalls++
			if req.ExternalEventID != "oddin:sr:match:42" {
				t.Fatalf("unexpected external id %s", req.ExternalEventID)
			}
			if req.HomeTeam != "Falcons" || req.AwayTeam != "Wolves" {
				t.Fatalf("unexpected competitors: %s vs %s", req.HomeTeam, req.AwayTeam)
			}
			return &models.Event{EventID: "evt_oddin_1", ExternalEventID: req.ExternalEventID, Sport: req.Sport, Status: "scheduled"}, false, nil
		},
		statusFn: func(ctx context.Context, eventID string, status string) (*models.Event, error) {
			if eventID != "evt_oddin_1" || status != "live" {
				t.Fatalf("unexpected status update: %s %s", eventID, status)
			}
			return &models.Event{EventID: "evt_oddin_1", ExternalEventID: "oddin:sr:match:42", Sport: "soccer", Status: status}, nil
		},
	})

	resp, err := svc.SyncOddinEvents(context.Background(), &models.SyncOddinEventsRequest{
		Events: []models.OddinEventInput{{
			SportEventID: "sr:match:42",
			Name:         "Falcons vs Wolves",
			StartTime:    now,
			Sport:        models.OddinSportInput{Name: "Soccer"},
			Tournament:   models.OddinTournamentInput{Name: "Premier League", Country: "UK"},
			Competitors: []models.OddinCompetitorInput{
				{ID: "sr:competitor:1", Name: "Falcons", Side: "home"},
				{ID: "sr:competitor:2", Name: "Wolves", Side: "away"},
			},
			SportEventState: "live",
		}},
	}, models.AuthClaims{Role: "data-provider"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if upsertCalls != 1 {
		t.Fatalf("expected one upsert call, got %d", upsertCalls)
	}
	if resp.Provider != "oddin" || resp.Synced != 1 || resp.Created != 0 || resp.Updated != 1 {
		t.Fatalf("unexpected response counts: %+v", resp)
	}
	if len(resp.Items) != 1 || resp.Items[0].Status != "live" {
		t.Fatalf("unexpected sync items: %+v", resp.Items)
	}
}

func TestSyncBetgeniusEventsNormalizesAndUpdatesStatus(t *testing.T) {
	logger := slog.New(slog.NewJSONHandler(io.Discard, nil))
	now := time.Now().UTC()
	upsertCalls := 0
	svc := NewService(logger, &fakeRepository{
		upsertFn: func(ctx context.Context, req models.CreateEventRequest) (*models.Event, bool, error) {
			upsertCalls++
			if req.ExternalEventID != "betgenius:fixture_42" {
				t.Fatalf("unexpected external id %s", req.ExternalEventID)
			}
			if req.HomeTeam != "Falcons" || req.AwayTeam != "Wolves" {
				t.Fatalf("unexpected competitors: %s vs %s", req.HomeTeam, req.AwayTeam)
			}
			if req.League != "Premier League 2026" {
				t.Fatalf("unexpected league %s", req.League)
			}
			return &models.Event{EventID: "evt_betgenius_1", ExternalEventID: req.ExternalEventID, Sport: req.Sport, Status: "scheduled"}, true, nil
		},
		statusFn: func(ctx context.Context, eventID string, status string) (*models.Event, error) {
			if eventID != "evt_betgenius_1" || status != "cancelled" {
				t.Fatalf("unexpected status update: %s %s", eventID, status)
			}
			return &models.Event{EventID: "evt_betgenius_1", ExternalEventID: "betgenius:fixture_42", Sport: "soccer", Status: status}, nil
		},
	})

	resp, err := svc.SyncBetgeniusEvents(context.Background(), &models.SyncBetgeniusEventsRequest{
		Events: []models.BetgeniusFixtureInput{{
			FixtureID:    "fixture_42",
			Name:         "Falcons vs Wolves",
			StartTimeUTC: now,
			Status:       "Cancelled",
			Sport:        models.OddinSportInput{Name: "Soccer"},
			Competition:  models.BetgeniusCompetitionInput{Name: "England"},
			Season:       models.BetgeniusSeasonInput{Name: "Premier League 2026"},
			Competitors: []models.BetgeniusCompetitorInput{
				{ID: "c1", Name: "Falcons", HomeAway: "Home"},
				{ID: "c2", Name: "Wolves", HomeAway: "Away"},
			},
		}},
	}, models.AuthClaims{Role: "data-provider"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if upsertCalls != 1 {
		t.Fatalf("expected one upsert call, got %d", upsertCalls)
	}
	if resp.Provider != "betgenius" || resp.Synced != 1 || resp.Created != 1 || resp.Updated != 0 {
		t.Fatalf("unexpected response counts: %+v", resp)
	}
	if len(resp.Items) != 1 || resp.Items[0].Status != "cancelled" {
		t.Fatalf("unexpected sync items: %+v", resp.Items)
	}
}

func TestListTournamentsRequiresTradingRole(t *testing.T) {
	logger := slog.New(slog.NewJSONHandler(io.Discard, nil))
	svc := NewService(logger, &fakeRepository{tournamentsFn: func(ctx context.Context, sport string) ([]models.TournamentSummary, error) {
		return []models.TournamentSummary{{Sport: "soccer", League: "EPL", Fixtures: 3}}, nil
	}})
	if _, err := svc.ListTournaments(context.Background(), "", models.AuthClaims{Role: "player"}); err == nil {
		t.Fatalf("expected permission error")
	}
	resp, err := svc.ListTournaments(context.Background(), "soccer", models.AuthClaims{Role: "operator"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(resp.Tournaments) != 1 || resp.Tournaments[0].League != "EPL" {
		t.Fatalf("unexpected tournaments response: %+v", resp)
	}
}

func TestUpdateFixtureStatusValidationAndRoles(t *testing.T) {
	logger := slog.New(slog.NewJSONHandler(io.Discard, nil))
	svc := NewService(logger, &fakeRepository{statusFn: func(ctx context.Context, eventID string, status string) (*models.Event, error) {
		return &models.Event{EventID: eventID, Status: status}, nil
	}})
	if _, err := svc.UpdateFixtureStatus(context.Background(), "evt_1", &models.UpdateFixtureStatusRequest{Status: "completed"}, models.AuthClaims{Role: "operator"}); err == nil {
		t.Fatalf("expected validation error")
	}
	if _, err := svc.UpdateFixtureStatus(context.Background(), "evt_1", &models.UpdateFixtureStatusRequest{Status: "cancelled"}, models.AuthClaims{Role: "player"}); err == nil {
		t.Fatalf("expected permission error")
	}
	event, err := svc.UpdateFixtureStatus(context.Background(), "evt_1", &models.UpdateFixtureStatusRequest{Status: "cancelled"}, models.AuthClaims{Role: "admin"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if event.Status != "cancelled" {
		t.Fatalf("status = %s", event.Status)
	}
}

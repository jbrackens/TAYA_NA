package service

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/phoenixbot/phoenix-events/internal/models"
	betgeniusprovider "github.com/phoenixbot/phoenix-events/internal/providers/betgenius"
	mockdataprovider "github.com/phoenixbot/phoenix-events/internal/providers/mockdata"
	oddinprovider "github.com/phoenixbot/phoenix-events/internal/providers/oddin"
	"github.com/phoenixbot/phoenix-events/internal/repository"
)

var ErrInvalidInput = errors.New("invalid input")

type EventService interface {
	CreateEvent(ctx context.Context, req *models.CreateEventRequest, actor models.AuthClaims) (*models.Event, error)
	UpsertProviderEvent(ctx context.Context, req *models.CreateEventRequest, actor models.AuthClaims) (*models.UpsertProviderEventResponse, error)
	SyncMockDataEvents(ctx context.Context, req *models.SyncMockDataEventsRequest, actor models.AuthClaims) (*models.ProviderSyncResponse, error)
	SyncOddinEvents(ctx context.Context, req *models.SyncOddinEventsRequest, actor models.AuthClaims) (*models.ProviderSyncResponse, error)
	SyncBetgeniusEvents(ctx context.Context, req *models.SyncBetgeniusEventsRequest, actor models.AuthClaims) (*models.ProviderSyncResponse, error)
	GetEvent(ctx context.Context, eventID string) (*models.Event, error)
	GetMatchTracker(ctx context.Context, fixtureID string) (*models.MatchTrackerTimelineResponse, error)
	GetFixtureStats(ctx context.Context, fixtureID string) (*models.FixtureStatsResponse, error)
	ListEvents(ctx context.Context, filters models.EventFilters) (*models.ListEventsResponse, error)
	ListTournaments(ctx context.Context, sport string, actor models.AuthClaims) (*models.TournamentsResponse, error)
	UpdateFixtureStatus(ctx context.Context, eventID string, req *models.UpdateFixtureStatusRequest, actor models.AuthClaims) (*models.Event, error)
	UpdateLiveScore(ctx context.Context, eventID string, req *models.UpdateLiveScoreRequest, actor models.AuthClaims) (*models.Event, error)
	UpdateResult(ctx context.Context, eventID string, req *models.UpdateResultRequest, actor models.AuthClaims) (*models.Event, error)
	ListSports(ctx context.Context) (*models.SportsResponse, error)
	ListLeagues(ctx context.Context, sport string) (*models.LeaguesResponse, error)
}

type eventService struct {
	logger *slog.Logger
	repo   repository.Repository
}

func NewService(logger *slog.Logger, repo repository.Repository) EventService {
	return &eventService{logger: logger, repo: repo}
}

func (s *eventService) CreateEvent(ctx context.Context, req *models.CreateEventRequest, actor models.AuthClaims) (*models.Event, error) {
	if err := validateCreateEvent(req); err != nil {
		return nil, err
	}
	if !canManageEvents(actor.Role) {
		return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput)
	}
	return s.repo.CreateEvent(ctx, *req)
}

func (s *eventService) UpsertProviderEvent(ctx context.Context, req *models.CreateEventRequest, actor models.AuthClaims) (*models.UpsertProviderEventResponse, error) {
	if err := validateCreateEvent(req); err != nil {
		return nil, err
	}
	if !canManageEvents(actor.Role) {
		return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput)
	}
	event, created, err := s.repo.UpsertEvent(ctx, *req)
	if err != nil {
		return nil, err
	}
	return &models.UpsertProviderEventResponse{Event: event, Created: created}, nil
}

func (s *eventService) SyncMockDataEvents(ctx context.Context, req *models.SyncMockDataEventsRequest, actor models.AuthClaims) (*models.ProviderSyncResponse, error) {
	if req == nil || len(req.Events) == 0 {
		return nil, fmt.Errorf("%w: events are required", ErrInvalidInput)
	}
	if !canManageEvents(actor.Role) {
		return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput)
	}

	response := &models.ProviderSyncResponse{
		Provider: "mockdata",
		Items:    make([]models.ProviderSyncItem, 0, len(req.Events)),
	}
	for _, item := range req.Events {
		normalized, targetStatus, err := mockdataprovider.NormalizeEvent(item)
		if err != nil {
			return nil, fmt.Errorf("%w: %v", ErrInvalidInput, err)
		}
		event, created, err := s.repo.UpsertEvent(ctx, normalized)
		if err != nil {
			return nil, err
		}
		if targetStatus != "" && targetStatus != "scheduled" {
			event, err = s.repo.UpdateFixtureStatus(ctx, event.EventID, targetStatus)
			if err != nil {
				return nil, err
			}
		}
		response.Synced++
		if created {
			response.Created++
		} else {
			response.Updated++
		}
		response.Items = append(response.Items, models.ProviderSyncItem{
			ExternalID: normalized.ExternalEventID,
			EventID:    event.EventID,
			Created:    created,
			Status:     event.Status,
		})
	}
	return response, nil
}

func (s *eventService) SyncOddinEvents(ctx context.Context, req *models.SyncOddinEventsRequest, actor models.AuthClaims) (*models.ProviderSyncResponse, error) {
	if req == nil || len(req.Events) == 0 {
		return nil, fmt.Errorf("%w: events are required", ErrInvalidInput)
	}
	if !canManageEvents(actor.Role) {
		return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput)
	}

	response := &models.ProviderSyncResponse{
		Provider: "oddin",
		Items:    make([]models.ProviderSyncItem, 0, len(req.Events)),
	}
	for _, item := range req.Events {
		normalized, targetStatus, err := oddinprovider.NormalizeEvent(item)
		if err != nil {
			return nil, fmt.Errorf("%w: %v", ErrInvalidInput, err)
		}
		event, created, err := s.repo.UpsertEvent(ctx, normalized)
		if err != nil {
			return nil, err
		}
		if targetStatus != "" && targetStatus != "scheduled" {
			event, err = s.repo.UpdateFixtureStatus(ctx, event.EventID, targetStatus)
			if err != nil {
				return nil, err
			}
		}
		response.Synced++
		if created {
			response.Created++
		} else {
			response.Updated++
		}
		response.Items = append(response.Items, models.ProviderSyncItem{
			ExternalID: normalized.ExternalEventID,
			EventID:    event.EventID,
			Created:    created,
			Status:     event.Status,
		})
	}
	return response, nil
}

func (s *eventService) SyncBetgeniusEvents(ctx context.Context, req *models.SyncBetgeniusEventsRequest, actor models.AuthClaims) (*models.ProviderSyncResponse, error) {
	if req == nil || len(req.Events) == 0 {
		return nil, fmt.Errorf("%w: events are required", ErrInvalidInput)
	}
	if !canManageEvents(actor.Role) {
		return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput)
	}

	response := &models.ProviderSyncResponse{
		Provider: "betgenius",
		Items:    make([]models.ProviderSyncItem, 0, len(req.Events)),
	}
	for _, item := range req.Events {
		normalized, targetStatus, err := betgeniusprovider.NormalizeEvent(item)
		if err != nil {
			return nil, fmt.Errorf("%w: %v", ErrInvalidInput, err)
		}
		event, created, err := s.repo.UpsertEvent(ctx, normalized)
		if err != nil {
			return nil, err
		}
		if targetStatus != "" && targetStatus != "scheduled" {
			event, err = s.repo.UpdateFixtureStatus(ctx, event.EventID, targetStatus)
			if err != nil {
				return nil, err
			}
		}
		response.Synced++
		if created {
			response.Created++
		} else {
			response.Updated++
		}
		response.Items = append(response.Items, models.ProviderSyncItem{
			ExternalID: normalized.ExternalEventID,
			EventID:    event.EventID,
			Created:    created,
			Status:     event.Status,
		})
	}
	return response, nil
}

func (s *eventService) GetEvent(ctx context.Context, eventID string) (*models.Event, error) {
	if strings.TrimSpace(eventID) == "" {
		return nil, fmt.Errorf("%w: event_id is required", ErrInvalidInput)
	}
	return s.repo.GetEvent(ctx, eventID)
}

func (s *eventService) GetMatchTracker(ctx context.Context, fixtureID string) (*models.MatchTrackerTimelineResponse, error) {
	event, err := s.GetEvent(ctx, fixtureID)
	if err != nil {
		return nil, err
	}

	status := mapFixtureStatus(event.Status)
	clockSeconds := event.ClockSeconds
	if clockSeconds == nil && event.LiveScore != nil && event.LiveScore.ElapsedMinutes > 0 {
		derived := event.LiveScore.ElapsedMinutes * 60
		clockSeconds = &derived
	}

	period := strings.TrimSpace(event.Period)
	if period == "" {
		period = deriveFixturePeriod(event.Status, event.LiveScore, event.Result)
	}

	score := models.MatchTrackerScore{}
	if event.LiveScore != nil {
		score.Home = event.LiveScore.HomeScore
		score.Away = event.LiveScore.AwayScore
	} else if event.Result != nil {
		score.Home = event.Result.HomeScore
		score.Away = event.Result.AwayScore
	}

	updatedAt := event.UpdatedAt.UTC()
	if event.LiveScore != nil && !event.LiveScore.LastUpdate.IsZero() {
		updatedAt = event.LiveScore.LastUpdate.UTC()
	} else if event.Result != nil && event.Result.CompletedAt != nil && !event.Result.CompletedAt.IsZero() {
		updatedAt = event.Result.CompletedAt.UTC()
	}

	incidents := make([]models.MatchTrackerIncident, 0, len(event.Incidents)+2)
	if len(event.Incidents) > 0 {
		incidents = append(incidents, event.Incidents...)
	} else {
		if !event.ScheduledStart.IsZero() {
			kickoffScore := &models.MatchTrackerScore{Home: 0, Away: 0}
			incidents = append(incidents, models.MatchTrackerIncident{
				IncidentID: event.EventID + ":kickoff",
				FixtureID:  event.EventID,
				Type:       "kickoff",
				Period:     firstNonEmpty(period, "PRE"),
				OccurredAt: event.ScheduledStart.UTC().Format(time.RFC3339),
				Score:      kickoffScore,
			})
		}

		if score.Home != 0 || score.Away != 0 || status == "POST_GAME" || status == "IN_PLAY" {
			incidentType := "score_update"
			if status == "POST_GAME" {
				incidentType = "result"
			}
			incidents = append(incidents, models.MatchTrackerIncident{
				IncidentID:   event.EventID + ":" + incidentType,
				FixtureID:    event.EventID,
				Type:         incidentType,
				Period:       period,
				ClockSeconds: clockSeconds,
				OccurredAt:   updatedAt.Format(time.RFC3339),
				Score:        &models.MatchTrackerScore{Home: score.Home, Away: score.Away},
			})
		}

		if len(incidents) == 0 {
			incidents = append(incidents, models.MatchTrackerIncident{
				IncidentID: event.EventID + ":status",
				FixtureID:  event.EventID,
				Type:       strings.ToLower(strings.TrimSpace(status)),
				Period:     period,
				OccurredAt: updatedAt.Format(time.RFC3339),
				Details: map[string]string{
					"status": status,
				},
			})
		}
	}

	return &models.MatchTrackerTimelineResponse{
		FixtureID:    event.EventID,
		Status:       strings.ToLower(strings.TrimSpace(event.Status)),
		Period:       period,
		ClockSeconds: clockSeconds,
		Score:        score,
		Incidents:    incidents,
		UpdatedAt:    updatedAt.Format(time.RFC3339),
	}, nil
}

func (s *eventService) GetFixtureStats(ctx context.Context, fixtureID string) (*models.FixtureStatsResponse, error) {
	event, err := s.GetEvent(ctx, fixtureID)
	if err != nil {
		return nil, err
	}

	status := mapFixtureStatus(event.Status)
	clockSeconds := event.ClockSeconds
	if clockSeconds == nil && event.LiveScore != nil && event.LiveScore.ElapsedMinutes > 0 {
		derived := event.LiveScore.ElapsedMinutes * 60
		clockSeconds = &derived
	}

	period := strings.TrimSpace(event.Period)
	if period == "" {
		period = deriveFixturePeriod(event.Status, event.LiveScore, event.Result)
	}

	metrics := make(models.EventStats, len(event.Stats)+1)
	for key, value := range event.Stats {
		metrics[key] = value
	}
	if len(metrics) == 0 {
		if event.LiveScore != nil {
			metrics["score"] = models.FixtureStatMetric{
				Home: float64(event.LiveScore.HomeScore),
				Away: float64(event.LiveScore.AwayScore),
			}
		} else if event.Result != nil {
			metrics["score"] = models.FixtureStatMetric{
				Home: float64(event.Result.HomeScore),
				Away: float64(event.Result.AwayScore),
			}
		}
	}

	updatedAt := event.UpdatedAt.UTC()
	if event.LiveScore != nil && !event.LiveScore.LastUpdate.IsZero() {
		updatedAt = event.LiveScore.LastUpdate.UTC()
	} else if event.Result != nil && event.Result.CompletedAt != nil && !event.Result.CompletedAt.IsZero() {
		updatedAt = event.Result.CompletedAt.UTC()
	}

	return &models.FixtureStatsResponse{
		FixtureID:    event.EventID,
		Status:       status,
		Period:       period,
		ClockSeconds: clockSeconds,
		Metrics:      metrics,
		UpdatedAt:    updatedAt.Format(time.RFC3339),
	}, nil
}

func (s *eventService) ListEvents(ctx context.Context, filters models.EventFilters) (*models.ListEventsResponse, error) {
	if filters.Page < 1 {
		filters.Page = 1
	}
	if filters.Limit < 1 || filters.Limit > 100 {
		filters.Limit = 100
	}
	items, total, err := s.repo.ListEvents(ctx, filters)
	if err != nil {
		return nil, err
	}
	return &models.ListEventsResponse{Data: items, Pagination: models.Pagination{Page: filters.Page, Limit: filters.Limit, Total: total}}, nil
}

func (s *eventService) ListTournaments(ctx context.Context, sport string, actor models.AuthClaims) (*models.TournamentsResponse, error) {
	if !canManageTrading(actor.Role) {
		return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput)
	}
	items, err := s.repo.ListTournaments(ctx, strings.TrimSpace(sport))
	if err != nil {
		return nil, err
	}
	return &models.TournamentsResponse{Tournaments: items}, nil
}

func (s *eventService) UpdateFixtureStatus(ctx context.Context, eventID string, req *models.UpdateFixtureStatusRequest, actor models.AuthClaims) (*models.Event, error) {
	if !canManageTrading(actor.Role) {
		return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput)
	}
	if strings.TrimSpace(eventID) == "" {
		return nil, fmt.Errorf("%w: event_id is required", ErrInvalidInput)
	}
	if err := validateFixtureStatus(req); err != nil {
		return nil, err
	}
	return s.repo.UpdateFixtureStatus(ctx, eventID, strings.TrimSpace(strings.ToLower(req.Status)))
}

func (s *eventService) UpdateLiveScore(ctx context.Context, eventID string, req *models.UpdateLiveScoreRequest, actor models.AuthClaims) (*models.Event, error) {
	if !canManageEvents(actor.Role) {
		return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput)
	}
	if err := validateLiveScore(req); err != nil {
		return nil, err
	}
	return s.repo.UpdateLiveScore(ctx, eventID, *req)
}

func (s *eventService) UpdateResult(ctx context.Context, eventID string, req *models.UpdateResultRequest, actor models.AuthClaims) (*models.Event, error) {
	if !canManageEvents(actor.Role) {
		return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput)
	}
	if err := validateResult(req); err != nil {
		return nil, err
	}
	return s.repo.UpdateResult(ctx, eventID, *req)
}

func (s *eventService) ListSports(ctx context.Context) (*models.SportsResponse, error) {
	items, err := s.repo.ListSports(ctx)
	if err != nil {
		return nil, err
	}
	return &models.SportsResponse{Sports: items}, nil
}

func (s *eventService) ListLeagues(ctx context.Context, sport string) (*models.LeaguesResponse, error) {
	sport = strings.TrimSpace(sport)
	if sport == "" {
		return nil, fmt.Errorf("%w: sport is required", ErrInvalidInput)
	}
	items, err := s.repo.ListLeagues(ctx, sport)
	if err != nil {
		return nil, err
	}
	return &models.LeaguesResponse{Sport: sport, Leagues: items}, nil
}

func validateCreateEvent(req *models.CreateEventRequest) error {
	if req == nil {
		return fmt.Errorf("%w: request is required", ErrInvalidInput)
	}
	if strings.TrimSpace(req.ExternalEventID) == "" {
		return fmt.Errorf("%w: external_event_id is required", ErrInvalidInput)
	}
	if strings.TrimSpace(req.Sport) == "" {
		return fmt.Errorf("%w: sport is required", ErrInvalidInput)
	}
	if strings.TrimSpace(req.HomeTeam) == "" || strings.TrimSpace(req.AwayTeam) == "" {
		return fmt.Errorf("%w: home_team and away_team are required", ErrInvalidInput)
	}
	if req.ScheduledStart.IsZero() {
		return fmt.Errorf("%w: scheduled_start is required", ErrInvalidInput)
	}
	return nil
}

func validateLiveScore(req *models.UpdateLiveScoreRequest) error {
	if req == nil {
		return fmt.Errorf("%w: request is required", ErrInvalidInput)
	}
	if strings.TrimSpace(req.Status) != "live" {
		return fmt.Errorf("%w: status must be live", ErrInvalidInput)
	}
	if req.HomeScore < 0 || req.AwayScore < 0 || req.ElapsedMinutes < 0 {
		return fmt.Errorf("%w: scores and elapsed_minutes must be non-negative", ErrInvalidInput)
	}
	if req.LastUpdate.IsZero() {
		req.LastUpdate = time.Now().UTC()
	}
	return nil
}

func validateResult(req *models.UpdateResultRequest) error {
	if req == nil {
		return fmt.Errorf("%w: request is required", ErrInvalidInput)
	}
	if strings.TrimSpace(req.Status) != "completed" {
		return fmt.Errorf("%w: status must be completed", ErrInvalidInput)
	}
	if strings.TrimSpace(req.Result) == "" {
		return fmt.Errorf("%w: result is required", ErrInvalidInput)
	}
	if req.HomeScore < 0 || req.AwayScore < 0 {
		return fmt.Errorf("%w: scores must be non-negative", ErrInvalidInput)
	}
	if req.CompletedAt.IsZero() {
		req.CompletedAt = time.Now().UTC()
	}
	return nil
}

func canManageEvents(role string) bool {
	normalized := strings.ReplaceAll(strings.ToLower(strings.TrimSpace(role)), "_", "-")
	switch normalized {
	case "data-provider", "admin":
		return true
	default:
		return false
	}
}

func canManageTrading(role string) bool {
	normalized := strings.ReplaceAll(strings.ToLower(strings.TrimSpace(role)), "_", "-")
	switch normalized {
	case "operator", "admin", "data-provider":
		return true
	default:
		return false
	}
}

func validateFixtureStatus(req *models.UpdateFixtureStatusRequest) error {
	if req == nil {
		return fmt.Errorf("%w: request is required", ErrInvalidInput)
	}
	switch strings.ToLower(strings.TrimSpace(req.Status)) {
	case "scheduled", "postponed", "cancelled":
		return nil
	default:
		return fmt.Errorf("%w: status must be scheduled, postponed, or cancelled", ErrInvalidInput)
	}
}

func mapFixtureStatus(status string) string {
	switch strings.ToLower(strings.TrimSpace(status)) {
	case "live":
		return "in_play"
	case "scheduled":
		return "not_started"
	case "completed":
		return "ended"
	case "cancelled":
		return "cancelled"
	case "postponed":
		return "postponed"
	default:
		return strings.ToLower(strings.TrimSpace(status))
	}
}

func deriveFixturePeriod(status string, liveScore *models.LiveScore, result *models.ResultInfo) string {
	if strings.EqualFold(strings.TrimSpace(status), "completed") || result != nil {
		return "FT"
	}
	if liveScore == nil {
		return ""
	}
	switch {
	case liveScore.ElapsedMinutes <= 0:
		return ""
	case liveScore.ElapsedMinutes <= 45:
		return "1H"
	case liveScore.ElapsedMinutes <= 90:
		return "2H"
	default:
		return "ET"
	}
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			return trimmed
		}
	}
	return ""
}

package models

import "time"

type AuthClaims struct {
	UserID string `json:"user_id"`
	Role   string `json:"role"`
}

type Event struct {
	EventID         string                 `json:"event_id"`
	ExternalEventID string                 `json:"external_event_id,omitempty"`
	Name            string                 `json:"name,omitempty"`
	Sport           string                 `json:"sport"`
	League          string                 `json:"league,omitempty"`
	HomeTeam        string                 `json:"home_team,omitempty"`
	AwayTeam        string                 `json:"away_team,omitempty"`
	ScheduledStart  time.Time              `json:"scheduled_start"`
	Venue           string                 `json:"venue,omitempty"`
	Status          string                 `json:"status"`
	LiveScore       *LiveScore             `json:"live_score,omitempty"`
	Result          *ResultInfo            `json:"result,omitempty"`
	Period          string                 `json:"period,omitempty"`
	ClockSeconds    *int                   `json:"clock_seconds,omitempty"`
	Stats           EventStats             `json:"stats,omitempty"`
	Incidents       []MatchTrackerIncident `json:"incidents,omitempty"`
	CreatedAt       time.Time              `json:"created_at"`
	UpdatedAt       time.Time              `json:"updated_at,omitempty"`
}

type LiveScore struct {
	HomeScore      int       `json:"home_score"`
	AwayScore      int       `json:"away_score"`
	ElapsedMinutes int       `json:"elapsed_minutes,omitempty"`
	LastUpdate     time.Time `json:"last_update"`
}

type ResultInfo struct {
	Outcome     string     `json:"outcome"`
	HomeScore   int        `json:"home_score"`
	AwayScore   int        `json:"away_score"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`
}

type CreateEventRequest struct {
	ExternalEventID string    `json:"external_event_id"`
	Sport           string    `json:"sport"`
	League          string    `json:"league"`
	HomeTeam        string    `json:"home_team"`
	AwayTeam        string    `json:"away_team"`
	ScheduledStart  time.Time `json:"scheduled_start"`
	Venue           string    `json:"venue"`
	Country         string    `json:"country,omitempty"`
}

type UpsertProviderEventResponse struct {
	Event   *Event `json:"event"`
	Created bool   `json:"created"`
}

type MockDataEventInput struct {
	ProviderEventID string    `json:"provider_event_id"`
	Sport           string    `json:"sport"`
	League          string    `json:"league,omitempty"`
	HomeTeam        string    `json:"home_team"`
	AwayTeam        string    `json:"away_team"`
	ScheduledStart  time.Time `json:"scheduled_start"`
	Venue           string    `json:"venue,omitempty"`
	Country         string    `json:"country,omitempty"`
	Status          string    `json:"status,omitempty"`
}

type SyncMockDataEventsRequest struct {
	Events []MockDataEventInput `json:"events"`
}

type OddinSportInput struct {
	ID   string `json:"id,omitempty"`
	Name string `json:"name"`
}

type OddinTournamentInput struct {
	ID      string `json:"id,omitempty"`
	Name    string `json:"name"`
	Country string `json:"country,omitempty"`
}

type OddinCompetitorInput struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	Abbreviation string `json:"abbreviation,omitempty"`
	Side         string `json:"side,omitempty"`
}

type OddinEventInput struct {
	SportEventID    string                 `json:"sport_event_id"`
	Name            string                 `json:"name,omitempty"`
	StartTime       time.Time              `json:"start_time"`
	Sport           OddinSportInput        `json:"sport"`
	Tournament      OddinTournamentInput   `json:"tournament"`
	Competitors     []OddinCompetitorInput `json:"competitors"`
	SportEventState string                 `json:"sport_event_state,omitempty"`
}

type SyncOddinEventsRequest struct {
	Events []OddinEventInput `json:"events"`
}

type BetgeniusCompetitionInput struct {
	ID   string `json:"id,omitempty"`
	Name string `json:"name"`
}

type BetgeniusSeasonInput struct {
	ID   string `json:"id,omitempty"`
	Name string `json:"name"`
}

type BetgeniusCompetitorInput struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	HomeAway string `json:"home_away"`
}

type BetgeniusFixtureInput struct {
	FixtureID    string                     `json:"fixture_id"`
	Name         string                     `json:"name,omitempty"`
	StartTimeUTC time.Time                  `json:"start_time_utc"`
	Status       string                     `json:"status,omitempty"`
	Sport        OddinSportInput            `json:"sport"`
	Competition  BetgeniusCompetitionInput  `json:"competition"`
	Season       BetgeniusSeasonInput       `json:"season"`
	Competitors  []BetgeniusCompetitorInput `json:"competitors"`
}

type SyncBetgeniusEventsRequest struct {
	Events []BetgeniusFixtureInput `json:"events"`
}

type ProviderSyncItem struct {
	ExternalID string `json:"external_id"`
	EventID    string `json:"event_id,omitempty"`
	Created    bool   `json:"created"`
	Status     string `json:"status,omitempty"`
}

type ProviderSyncResponse struct {
	Provider string             `json:"provider"`
	Synced   int                `json:"synced"`
	Created  int                `json:"created"`
	Updated  int                `json:"updated"`
	Items    []ProviderSyncItem `json:"items"`
}

type UpdateLiveScoreRequest struct {
	Status         string                 `json:"status"`
	HomeScore      int                    `json:"home_score"`
	AwayScore      int                    `json:"away_score"`
	ElapsedMinutes int                    `json:"elapsed_minutes"`
	LastUpdate     time.Time              `json:"last_update"`
	Period         string                 `json:"period,omitempty"`
	ClockSeconds   *int                   `json:"clock_seconds,omitempty"`
	Stats          EventStats             `json:"stats,omitempty"`
	Incidents      []MatchTrackerIncident `json:"incidents,omitempty"`
}

type UpdateResultRequest struct {
	Status      string    `json:"status"`
	HomeScore   int       `json:"home_score"`
	AwayScore   int       `json:"away_score"`
	Result      string    `json:"result"`
	CompletedAt time.Time `json:"completed_at"`
}

type EventFilters struct {
	Sport      string
	League     string
	Status     string
	ExternalID string
	StartDate  *time.Time
	EndDate    *time.Time
	Page       int
	Limit      int
}

type UpdateFixtureStatusRequest struct {
	Status string `json:"status"`
}

type Pagination struct {
	Page  int `json:"page"`
	Limit int `json:"limit"`
	Total int `json:"total"`
}

type ListEventsResponse struct {
	Data       []*Event   `json:"data"`
	Pagination Pagination `json:"pagination"`
}

type SportSummary struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Leagues     []string `json:"leagues"`
	EventsCount int      `json:"events_count"`
}

type SportsResponse struct {
	Sports []SportSummary `json:"sports"`
}

type LeagueSummary struct {
	Name        string `json:"name"`
	Country     string `json:"country,omitempty"`
	EventsCount int    `json:"events_count"`
}

type LeaguesResponse struct {
	Sport   string          `json:"sport"`
	Leagues []LeagueSummary `json:"leagues"`
}

type TournamentSummary struct {
	Sport     string `json:"sport"`
	League    string `json:"league"`
	Country   string `json:"country,omitempty"`
	Fixtures  int    `json:"fixtures"`
	LiveCount int    `json:"live_count"`
	Scheduled int    `json:"scheduled_count"`
	Completed int    `json:"completed_count"`
	Cancelled int    `json:"cancelled_count"`
	Postponed int    `json:"postponed_count"`
}

type TournamentsResponse struct {
	Tournaments []TournamentSummary `json:"tournaments"`
}

type FixtureStatMetric struct {
	Home float64 `json:"home"`
	Away float64 `json:"away"`
	Unit string  `json:"unit,omitempty"`
}

type EventStats map[string]FixtureStatMetric

type MatchTrackerScore struct {
	Home int `json:"home"`
	Away int `json:"away"`
}

type MatchTrackerIncident struct {
	IncidentID   string             `json:"incidentId"`
	FixtureID    string             `json:"fixtureId"`
	Type         string             `json:"type"`
	Period       string             `json:"period,omitempty"`
	ClockSeconds *int               `json:"clockSeconds,omitempty"`
	OccurredAt   string             `json:"occurredAt"`
	Score        *MatchTrackerScore `json:"score,omitempty"`
	Details      map[string]string  `json:"details,omitempty"`
}

type MatchTrackerTimelineResponse struct {
	FixtureID    string                 `json:"fixtureId"`
	Status       string                 `json:"status"`
	Period       string                 `json:"period,omitempty"`
	ClockSeconds *int                   `json:"clockSeconds,omitempty"`
	Score        MatchTrackerScore      `json:"score"`
	Incidents    []MatchTrackerIncident `json:"incidents"`
	UpdatedAt    string                 `json:"updatedAt"`
}

type FixtureStatsResponse struct {
	FixtureID    string     `json:"fixtureId"`
	Status       string     `json:"status"`
	Period       string     `json:"period,omitempty"`
	ClockSeconds *int       `json:"clockSeconds,omitempty"`
	Metrics      EventStats `json:"metrics"`
	UpdatedAt    string     `json:"updatedAt"`
}

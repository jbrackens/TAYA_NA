package betgenius

import (
	"fmt"
	"strings"

	"github.com/phoenixbot/phoenix-events/internal/models"
)

func NormalizeEvent(input models.BetgeniusFixtureInput) (models.CreateEventRequest, string, error) {
	fixtureID := strings.TrimSpace(input.FixtureID)
	if fixtureID == "" {
		return models.CreateEventRequest{}, "", fmt.Errorf("fixture_id is required")
	}
	if input.StartTimeUTC.IsZero() {
		return models.CreateEventRequest{}, "", fmt.Errorf("start_time_utc is required")
	}

	homeTeam, awayTeam := resolveCompetitors(input.Competitors)
	if homeTeam == "" || awayTeam == "" {
		return models.CreateEventRequest{}, "", fmt.Errorf("home and away competitors are required")
	}

	sport := strings.TrimSpace(strings.ToLower(input.Sport.Name))
	if sport == "" {
		return models.CreateEventRequest{}, "", fmt.Errorf("sport.name is required")
	}

	status := normalizeStatus(input.Status)
	if status == "" {
		status = "scheduled"
	}

	return models.CreateEventRequest{
		ExternalEventID: externalID(fixtureID),
		Sport:           sport,
		League:          strings.TrimSpace(input.Season.Name),
		HomeTeam:        homeTeam,
		AwayTeam:        awayTeam,
		ScheduledStart:  input.StartTimeUTC.UTC(),
		Venue:           strings.TrimSpace(input.Name),
		Country:         strings.TrimSpace(input.Competition.Name),
	}, status, nil
}

func externalID(fixtureID string) string {
	normalized := strings.TrimSpace(fixtureID)
	if strings.HasPrefix(normalized, "betgenius:") {
		return normalized
	}
	return "betgenius:" + normalized
}

func normalizeStatus(value string) string {
	switch strings.TrimSpace(strings.ToLower(value)) {
	case "", "scheduled":
		return "scheduled"
	case "postponed":
		return "postponed"
	case "cancelled", "deleted", "unscheduled":
		return "cancelled"
	default:
		return ""
	}
}

func resolveCompetitors(competitors []models.BetgeniusCompetitorInput) (string, string) {
	var homeTeam, awayTeam string
	for _, competitor := range competitors {
		name := strings.TrimSpace(competitor.Name)
		switch strings.TrimSpace(strings.ToLower(competitor.HomeAway)) {
		case "home":
			homeTeam = name
		case "away":
			awayTeam = name
		}
	}
	if homeTeam != "" && awayTeam != "" {
		return homeTeam, awayTeam
	}
	if len(competitors) > 0 && homeTeam == "" {
		homeTeam = strings.TrimSpace(competitors[0].Name)
	}
	if len(competitors) > 1 && awayTeam == "" {
		awayTeam = strings.TrimSpace(competitors[1].Name)
	}
	return homeTeam, awayTeam
}

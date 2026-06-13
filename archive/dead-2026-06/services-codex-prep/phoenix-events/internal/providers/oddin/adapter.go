package oddin

import (
	"fmt"
	"strings"

	"github.com/phoenixbot/phoenix-events/internal/models"
)

func NormalizeEvent(input models.OddinEventInput) (models.CreateEventRequest, string, error) {
	providerEventID := strings.TrimSpace(input.SportEventID)
	if providerEventID == "" {
		return models.CreateEventRequest{}, "", fmt.Errorf("sport_event_id is required")
	}
	if input.StartTime.IsZero() {
		return models.CreateEventRequest{}, "", fmt.Errorf("start_time is required")
	}

	homeTeam, awayTeam := resolveCompetitors(input.Competitors)
	if homeTeam == "" || awayTeam == "" {
		return models.CreateEventRequest{}, "", fmt.Errorf("home and away competitors are required")
	}

	sport := strings.TrimSpace(strings.ToLower(input.Sport.Name))
	if sport == "" {
		return models.CreateEventRequest{}, "", fmt.Errorf("sport.name is required")
	}

	status := normalizeStatus(input.SportEventState)
	if status == "" {
		status = "scheduled"
	}

	return models.CreateEventRequest{
		ExternalEventID: externalID(providerEventID),
		Sport:           sport,
		League:          strings.TrimSpace(input.Tournament.Name),
		HomeTeam:        homeTeam,
		AwayTeam:        awayTeam,
		ScheduledStart:  input.StartTime.UTC(),
		Venue:           strings.TrimSpace(input.Name),
		Country:         strings.TrimSpace(input.Tournament.Country),
	}, status, nil
}

func externalID(providerEventID string) string {
	normalized := strings.TrimSpace(providerEventID)
	if strings.HasPrefix(normalized, "oddin:") {
		return normalized
	}
	return "oddin:" + normalized
}

func normalizeStatus(value string) string {
	switch strings.TrimSpace(strings.ToLower(value)) {
	case "", "not_started", "started":
		return "scheduled"
	case "live":
		return "live"
	case "delayed", "postponed":
		return "postponed"
	case "cancelled", "abandoned", "closed":
		return "cancelled"
	case "ended", "finalized":
		return "completed"
	default:
		return ""
	}
}

func resolveCompetitors(competitors []models.OddinCompetitorInput) (string, string) {
	var homeTeam, awayTeam string
	for _, competitor := range competitors {
		name := strings.TrimSpace(competitor.Name)
		switch strings.TrimSpace(strings.ToLower(competitor.Side)) {
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

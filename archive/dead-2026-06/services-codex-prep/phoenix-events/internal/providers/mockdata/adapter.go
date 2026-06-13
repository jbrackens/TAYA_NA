package mockdata

import (
	"fmt"
	"strings"

	"github.com/phoenixbot/phoenix-events/internal/models"
)

func NormalizeEvent(input models.MockDataEventInput) (models.CreateEventRequest, string, error) {
	providerEventID := strings.TrimSpace(input.ProviderEventID)
	if providerEventID == "" {
		return models.CreateEventRequest{}, "", fmt.Errorf("provider_event_id is required")
	}
	eventStatus := normalizeStatus(input.Status)
	if eventStatus == "" {
		eventStatus = "scheduled"
	}
	return models.CreateEventRequest{
		ExternalEventID: externalID(providerEventID),
		Sport:           strings.TrimSpace(strings.ToLower(input.Sport)),
		League:          strings.TrimSpace(input.League),
		HomeTeam:        strings.TrimSpace(input.HomeTeam),
		AwayTeam:        strings.TrimSpace(input.AwayTeam),
		ScheduledStart:  input.ScheduledStart.UTC(),
		Venue:           strings.TrimSpace(input.Venue),
		Country:         strings.TrimSpace(input.Country),
	}, eventStatus, nil
}

func externalID(providerEventID string) string {
	normalized := strings.TrimSpace(providerEventID)
	if strings.HasPrefix(normalized, "mockdata:") {
		return normalized
	}
	return "mockdata:" + normalized
}

func normalizeStatus(status string) string {
	switch strings.TrimSpace(strings.ToLower(status)) {
	case "", "scheduled":
		return "scheduled"
	case "live", "postponed", "cancelled", "completed":
		return strings.TrimSpace(strings.ToLower(status))
	default:
		return ""
	}
}

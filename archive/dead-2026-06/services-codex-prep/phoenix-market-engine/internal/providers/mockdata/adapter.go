package mockdata

import (
	"fmt"
	"strings"

	"github.com/shopspring/decimal"

	"github.com/phoenixbot/phoenix-market-engine/internal/models"
)

func NormalizeMarket(input models.MockDataMarketInput) (models.CreateMarketRequest, string, error) {
	providerMarketID := strings.TrimSpace(input.ProviderMarketID)
	if providerMarketID == "" {
		return models.CreateMarketRequest{}, "", fmt.Errorf("provider_market_id is required")
	}
	eventExternalID := strings.TrimSpace(input.EventExternalID)
	if eventExternalID == "" {
		return models.CreateMarketRequest{}, "", fmt.Errorf("event_external_id is required")
	}
	if len(input.Outcomes) == 0 {
		return models.CreateMarketRequest{}, "", fmt.Errorf("outcomes are required")
	}
	request := models.CreateMarketRequest{
		ExternalID: externalID(providerMarketID),
		EventID:    eventExternalID,
		MarketType: strings.TrimSpace(input.MarketType),
		Outcomes:   make([]models.CreateMarketOutcomeInput, 0, len(input.Outcomes)),
		Odds:       make(map[string]decimal.Decimal, len(input.Odds)),
		Status:     normalizeStatus(input.Status),
	}
	if request.Status == "" {
		request.Status = "open"
	}
	for _, outcome := range input.Outcomes {
		name := strings.TrimSpace(outcome.Name)
		if name == "" {
			return models.CreateMarketRequest{}, "", fmt.Errorf("outcome name is required")
		}
		request.Outcomes = append(request.Outcomes, models.CreateMarketOutcomeInput{
			Name:      name,
			OutcomeID: strings.TrimSpace(outcome.OutcomeID),
		})
	}
	for outcomeID, odds := range input.Odds {
		request.Odds[strings.TrimSpace(outcomeID)] = odds
	}
	return request, eventExternalIDValue(eventExternalID), nil
}

func externalID(providerMarketID string) string {
	normalized := strings.TrimSpace(providerMarketID)
	if strings.HasPrefix(normalized, "mockdata:") {
		return normalized
	}
	return "mockdata:" + normalized
}

func eventExternalIDValue(value string) string {
	normalized := strings.TrimSpace(value)
	if strings.HasPrefix(normalized, "mockdata:") {
		return normalized
	}
	return "mockdata:" + normalized
}

func normalizeStatus(value string) string {
	switch strings.TrimSpace(strings.ToLower(value)) {
	case "", "open":
		return "open"
	case "suspended", "closed", "settled", "voided":
		return strings.TrimSpace(strings.ToLower(value))
	default:
		return ""
	}
}

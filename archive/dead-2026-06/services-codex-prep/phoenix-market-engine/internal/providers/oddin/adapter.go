package oddin

import (
	"fmt"
	"sort"
	"strings"

	"github.com/shopspring/decimal"

	"github.com/phoenixbot/phoenix-market-engine/internal/models"
)

func NormalizeMarket(input models.OddinMarketInput) (models.CreateMarketRequest, string, error) {
	sportEventID := strings.TrimSpace(input.SportEventID)
	if sportEventID == "" {
		return models.CreateMarketRequest{}, "", fmt.Errorf("sport_event_id is required")
	}
	descriptionID := strings.TrimSpace(input.MarketDescriptionID)
	if descriptionID == "" {
		return models.CreateMarketRequest{}, "", fmt.Errorf("market_description_id is required")
	}
	if len(input.MarketOutcomes) == 0 {
		return models.CreateMarketRequest{}, "", fmt.Errorf("market_outcomes are required")
	}

	request := models.CreateMarketRequest{
		ExternalID: externalMarketID(sportEventID, descriptionID, input.MarketSpecifiers),
		EventID:    externalEventID(sportEventID),
		MarketType: resolveMarketType(input),
		Outcomes:   make([]models.CreateMarketOutcomeInput, 0, len(input.MarketOutcomes)),
		Odds:       make(map[string]decimal.Decimal, len(input.MarketOutcomes)),
		Status:     normalizeStatus(input.MarketStatus),
	}
	if request.Status == "" {
		request.Status = "open"
	}

	for _, outcome := range input.MarketOutcomes {
		outcomeID := strings.TrimSpace(outcome.OutcomeID)
		if outcomeID == "" {
			return models.CreateMarketRequest{}, "", fmt.Errorf("outcome_id is required")
		}
		outcomeName := strings.TrimSpace(outcome.OutcomeName)
		if outcomeName == "" {
			outcomeName = outcomeID
		}
		request.Outcomes = append(request.Outcomes, models.CreateMarketOutcomeInput{
			Name:      outcomeName,
			OutcomeID: outcomeID,
		})
		if outcome.Active && outcome.Odds.GreaterThan(decimal.Zero) {
			request.Odds[outcomeID] = outcome.Odds
		}
	}

	return request, externalEventID(sportEventID), nil
}

func externalEventID(sportEventID string) string {
	normalized := strings.TrimSpace(sportEventID)
	if strings.HasPrefix(normalized, "oddin:") {
		return normalized
	}
	return "oddin:" + normalized
}

func externalMarketID(sportEventID, descriptionID string, specifiers map[string]string) string {
	base := []string{"oddin", strings.TrimSpace(sportEventID), strings.TrimSpace(descriptionID)}
	if len(specifiers) == 0 {
		return strings.Join(base, ":")
	}
	keys := make([]string, 0, len(specifiers))
	for key := range specifiers {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	parts := make([]string, 0, len(keys))
	for _, key := range keys {
		parts = append(parts, fmt.Sprintf("%s=%s", strings.TrimSpace(key), strings.TrimSpace(specifiers[key])))
	}
	return strings.Join(append(base, strings.Join(parts, "|")), ":")
}

func resolveMarketType(input models.OddinMarketInput) string {
	if name := strings.TrimSpace(input.MarketName); name != "" {
		return name
	}
	return "oddin:" + strings.TrimSpace(input.MarketDescriptionID)
}

func normalizeStatus(value string) string {
	switch strings.TrimSpace(strings.ToLower(value)) {
	case "", "active", "open":
		return "open"
	case "suspended", "deactivated":
		return "suspended"
	case "settled":
		return "settled"
	case "cancelled":
		return "voided"
	case "closed":
		return "closed"
	default:
		return ""
	}
}

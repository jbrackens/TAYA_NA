package betgenius

import (
	"fmt"
	"strings"

	"github.com/shopspring/decimal"

	"github.com/phoenixbot/phoenix-market-engine/internal/models"
)

func NormalizeMarket(input models.SyncBetgeniusMarketsItem) (models.CreateMarketRequest, string, error) {
	fixtureID := strings.TrimSpace(input.FixtureID)
	if fixtureID == "" {
		return models.CreateMarketRequest{}, "", fmt.Errorf("fixture_id is required")
	}
	marketID := strings.TrimSpace(input.MarketID)
	if marketID == "" {
		return models.CreateMarketRequest{}, "", fmt.Errorf("market_id is required")
	}
	if len(input.Selections) == 0 {
		return models.CreateMarketRequest{}, "", fmt.Errorf("selections are required")
	}

	request := models.CreateMarketRequest{
		ExternalID: externalMarketID(marketID),
		EventID:    externalEventID(fixtureID),
		MarketType: resolveMarketType(input),
		Outcomes:   make([]models.CreateMarketOutcomeInput, 0, len(input.Selections)),
		Odds:       make(map[string]decimal.Decimal, len(input.Selections)),
		Status:     normalizeStatus(input.TradingStatus),
	}
	if request.Status == "" {
		request.Status = "open"
	}

	for _, selection := range input.Selections {
		selectionID := strings.TrimSpace(selection.SelectionID)
		if selectionID == "" {
			return models.CreateMarketRequest{}, "", fmt.Errorf("selection_id is required")
		}
		name := strings.TrimSpace(selection.Name)
		if name == "" {
			name = selectionID
		}
		request.Outcomes = append(request.Outcomes, models.CreateMarketOutcomeInput{
			Name:      name,
			OutcomeID: selectionID,
		})
		if selection.Trading && selection.Odds.GreaterThan(decimal.Zero) {
			request.Odds[selectionID] = selection.Odds
		}
	}

	return request, externalEventID(fixtureID), nil
}

func externalEventID(fixtureID string) string {
	normalized := strings.TrimSpace(fixtureID)
	if strings.HasPrefix(normalized, "betgenius:") {
		return normalized
	}
	return "betgenius:" + normalized
}

func externalMarketID(marketID string) string {
	normalized := strings.TrimSpace(marketID)
	if strings.HasPrefix(normalized, "betgenius:") {
		return normalized
	}
	return "betgenius:" + normalized
}

func normalizeStatus(value string) string {
	switch strings.TrimSpace(strings.ToLower(value)) {
	case "", "open":
		return "open"
	case "suspended":
		return "suspended"
	case "closed":
		return "closed"
	default:
		return ""
	}
}

func resolveMarketType(input models.SyncBetgeniusMarketsItem) string {
	name := strings.TrimSpace(input.MarketName)
	if handicap := strings.TrimSpace(input.Handicap); handicap != "" {
		if name == "" {
			name = strings.TrimSpace(input.MarketType)
		}
		return strings.TrimSpace(name + " " + handicap)
	}
	if name != "" {
		return name
	}
	return strings.TrimSpace(input.MarketType)
}

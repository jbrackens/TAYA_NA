package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/shopspring/decimal"

	"github.com/phoenixbot/phoenix-market-engine/internal/middleware"
	"github.com/phoenixbot/phoenix-market-engine/internal/models"
	"github.com/phoenixbot/phoenix-market-engine/internal/repository"
	"github.com/phoenixbot/phoenix-market-engine/internal/service"
)

type Handlers struct {
	logger  *slog.Logger
	service service.MarketService
}

func NewHandlers(logger *slog.Logger, svc service.MarketService) *Handlers {
	return &Handlers{logger: logger, service: svc}
}

func (h *Handlers) HealthCheck(w http.ResponseWriter, r *http.Request) {
	_ = middleware.WriteJSON(w, http.StatusOK, map[string]string{"status": "healthy", "service": "phoenix-market-engine"})
}

func (h *Handlers) ReadinessCheck(w http.ResponseWriter, r *http.Request) {
	_ = middleware.WriteJSON(w, http.StatusOK, map[string]string{"status": "ready", "service": "phoenix-market-engine"})
}

func (h *Handlers) CreateMarket(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		EventID    string `json:"event_id"`
		MarketType string `json:"market_type"`
		Outcomes   []struct {
			Name      string `json:"name"`
			OutcomeID string `json:"outcome_id"`
		} `json:"outcomes"`
		Odds   map[string]json.Number `json:"odds"`
		Status string                 `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	request, err := decodeCreateMarketRequest(payload)
	if err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	market, err := h.service.CreateMarket(r.Context(), request, middleware.GetAuthClaims(r))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusCreated, market)
}

func (h *Handlers) SyncMockDataMarkets(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		Markets []struct {
			ProviderMarketID string `json:"provider_market_id"`
			EventExternalID  string `json:"event_external_id"`
			MarketType       string `json:"market_type"`
			Status           string `json:"status"`
			Outcomes         []struct {
				Name      string `json:"name"`
				OutcomeID string `json:"outcome_id"`
			} `json:"outcomes"`
			Odds map[string]json.Number `json:"odds"`
		} `json:"markets"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	request := &models.SyncMockDataMarketsRequest{Markets: make([]models.MockDataMarketInput, 0, len(payload.Markets))}
	for _, item := range payload.Markets {
		market := models.MockDataMarketInput{
			ProviderMarketID: strings.TrimSpace(item.ProviderMarketID),
			EventExternalID:  strings.TrimSpace(item.EventExternalID),
			MarketType:       strings.TrimSpace(item.MarketType),
			Status:           strings.TrimSpace(item.Status),
			Outcomes:         make([]models.CreateMarketOutcomeInput, 0, len(item.Outcomes)),
			Odds:             make(map[string]decimal.Decimal, len(item.Odds)),
		}
		for _, outcome := range item.Outcomes {
			market.Outcomes = append(market.Outcomes, models.CreateMarketOutcomeInput{
				Name:      strings.TrimSpace(outcome.Name),
				OutcomeID: strings.TrimSpace(outcome.OutcomeID),
			})
		}
		for outcomeID, value := range item.Odds {
			parsed, err := decimal.NewFromString(value.String())
			if err != nil {
				_ = middleware.WriteError(w, http.StatusBadRequest, fmt.Sprintf("invalid odds for outcome %s", outcomeID))
				return
			}
			market.Odds[strings.TrimSpace(outcomeID)] = parsed
		}
		request.Markets = append(request.Markets, market)
	}
	response, err := h.service.SyncMockDataMarkets(r.Context(), request, middleware.GetAuthClaims(r))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) SyncOddinMarkets(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		Markets []struct {
			SportEventID        string            `json:"sport_event_id"`
			MarketDescriptionID string            `json:"market_description_id"`
			MarketName          string            `json:"market_name"`
			MarketSpecifiers    map[string]string `json:"market_specifiers"`
			MarketStatus        string            `json:"market_status"`
			MarketOutcomes      []struct {
				OutcomeID   string      `json:"outcome_id"`
				OutcomeName string      `json:"outcome_name"`
				Odds        json.Number `json:"odds"`
				Active      bool        `json:"active"`
			} `json:"market_outcomes"`
		} `json:"markets"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	request := &models.SyncOddinMarketsRequest{Markets: make([]models.OddinMarketInput, 0, len(payload.Markets))}
	for _, item := range payload.Markets {
		market := models.OddinMarketInput{
			SportEventID:        strings.TrimSpace(item.SportEventID),
			MarketDescriptionID: strings.TrimSpace(item.MarketDescriptionID),
			MarketName:          strings.TrimSpace(item.MarketName),
			MarketSpecifiers:    item.MarketSpecifiers,
			MarketStatus:        strings.TrimSpace(item.MarketStatus),
			MarketOutcomes:      make([]models.OddinOutcomeInput, 0, len(item.MarketOutcomes)),
		}
		for _, outcome := range item.MarketOutcomes {
			parsedOdds := decimal.Zero
			if strings.TrimSpace(outcome.Odds.String()) != "" {
				value, err := decimal.NewFromString(outcome.Odds.String())
				if err != nil {
					_ = middleware.WriteError(w, http.StatusBadRequest, fmt.Sprintf("invalid odds for outcome %s", outcome.OutcomeID))
					return
				}
				parsedOdds = value
			}
			market.MarketOutcomes = append(market.MarketOutcomes, models.OddinOutcomeInput{
				OutcomeID:   strings.TrimSpace(outcome.OutcomeID),
				OutcomeName: strings.TrimSpace(outcome.OutcomeName),
				Odds:        parsedOdds,
				Active:      outcome.Active,
			})
		}
		request.Markets = append(request.Markets, market)
	}
	response, err := h.service.SyncOddinMarkets(r.Context(), request, middleware.GetAuthClaims(r))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) SyncBetgeniusMarkets(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		Markets []struct {
			FixtureID     string `json:"fixture_id"`
			MarketID      string `json:"market_id"`
			MarketType    string `json:"market_type"`
			MarketName    string `json:"market_name"`
			Handicap      string `json:"handicap"`
			TradingStatus string `json:"trading_status"`
			Selections    []struct {
				SelectionID string      `json:"selection_id"`
				Name        string      `json:"name"`
				Odds        json.Number `json:"odds"`
				Trading     bool        `json:"trading"`
			} `json:"selections"`
		} `json:"markets"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	request := &models.SyncBetgeniusMarketsRequest{Markets: make([]models.SyncBetgeniusMarketsItem, 0, len(payload.Markets))}
	for _, item := range payload.Markets {
		market := models.SyncBetgeniusMarketsItem{
			FixtureID:     strings.TrimSpace(item.FixtureID),
			MarketID:      strings.TrimSpace(item.MarketID),
			MarketType:    strings.TrimSpace(item.MarketType),
			MarketName:    strings.TrimSpace(item.MarketName),
			Handicap:      strings.TrimSpace(item.Handicap),
			TradingStatus: strings.TrimSpace(item.TradingStatus),
			Selections:    make([]models.BetgeniusSelectionInput, 0, len(item.Selections)),
		}
		for _, selection := range item.Selections {
			parsedOdds := decimal.Zero
			if strings.TrimSpace(selection.Odds.String()) != "" {
				value, err := decimal.NewFromString(selection.Odds.String())
				if err != nil {
					_ = middleware.WriteError(w, http.StatusBadRequest, fmt.Sprintf("invalid odds for selection %s", selection.SelectionID))
					return
				}
				parsedOdds = value
			}
			market.Selections = append(market.Selections, models.BetgeniusSelectionInput{
				SelectionID: strings.TrimSpace(selection.SelectionID),
				Name:        strings.TrimSpace(selection.Name),
				Odds:        parsedOdds,
				Trading:     selection.Trading,
			})
		}
		request.Markets = append(request.Markets, market)
	}
	response, err := h.service.SyncBetgeniusMarkets(r.Context(), request, middleware.GetAuthClaims(r))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) GetMarket(w http.ResponseWriter, r *http.Request) {
	market, err := h.service.GetMarket(r.Context(), chi.URLParam(r, "marketID"))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, market)
}

func (h *Handlers) ListMarkets(w http.ResponseWriter, r *http.Request) {
	filters := models.MarketFilters{
		EventID:    r.URL.Query().Get("event_id"),
		Status:     r.URL.Query().Get("status"),
		MarketType: r.URL.Query().Get("market_type"),
		Page:       intFromQuery(r, "page", 1),
		Limit:      intFromQuery(r, "limit", 50),
	}
	response, err := h.service.ListMarkets(r.Context(), filters)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) UpdateOdds(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		Odds   map[string]json.Number `json:"odds"`
		Reason string                 `json:"reason"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	request, err := decodeUpdateOddsRequest(payload.Odds, payload.Reason)
	if err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	market, err := h.service.UpdateOdds(r.Context(), chi.URLParam(r, "marketID"), request, middleware.GetAuthClaims(r))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, market)
}

func (h *Handlers) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	var request models.UpdateMarketStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	market, err := h.service.UpdateStatus(r.Context(), chi.URLParam(r, "marketID"), &request, middleware.GetAuthClaims(r))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, market)
}

func (h *Handlers) SettleMarket(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		WinningOutcomeID string `json:"winning_outcome_id"`
		Reason           string `json:"reason"`
		SettledAt        string `json:"settled_at"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	request, err := decodeSettleRequest(payload.WinningOutcomeID, payload.Reason, payload.SettledAt)
	if err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	response, err := h.service.SettleMarket(r.Context(), chi.URLParam(r, "marketID"), request, middleware.GetAuthClaims(r))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusAccepted, response)
}

func (h *Handlers) GetLiquidity(w http.ResponseWriter, r *http.Request) {
	response, err := h.service.GetLiquidity(r.Context(), chi.URLParam(r, "marketID"))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) writeServiceError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, repository.ErrNotFound):
		_ = middleware.WriteError(w, http.StatusNotFound, "resource not found")
	case errors.Is(err, service.ErrInvalidInput):
		_ = middleware.WriteError(w, http.StatusBadRequest, err.Error())
	default:
		h.logger.Error("market request failed", slog.Any("error", err))
		_ = middleware.WriteError(w, http.StatusBadRequest, err.Error())
	}
}

func decodeCreateMarketRequest(payload struct {
	EventID    string `json:"event_id"`
	MarketType string `json:"market_type"`
	Outcomes   []struct {
		Name      string `json:"name"`
		OutcomeID string `json:"outcome_id"`
	} `json:"outcomes"`
	Odds   map[string]json.Number `json:"odds"`
	Status string                 `json:"status"`
}) (*models.CreateMarketRequest, error) {
	request := &models.CreateMarketRequest{
		EventID:    strings.TrimSpace(payload.EventID),
		MarketType: strings.TrimSpace(payload.MarketType),
		Outcomes:   make([]models.CreateMarketOutcomeInput, 0, len(payload.Outcomes)),
		Odds:       make(map[string]decimal.Decimal, len(payload.Odds)),
		Status:     strings.TrimSpace(payload.Status),
	}
	for _, outcome := range payload.Outcomes {
		request.Outcomes = append(request.Outcomes, models.CreateMarketOutcomeInput{Name: strings.TrimSpace(outcome.Name), OutcomeID: strings.TrimSpace(outcome.OutcomeID)})
	}
	for outcomeID, value := range payload.Odds {
		parsed, err := decimal.NewFromString(value.String())
		if err != nil {
			return nil, fmt.Errorf("invalid odds for outcome %s", outcomeID)
		}
		request.Odds[outcomeID] = parsed
	}
	return request, nil
}

func decodeUpdateOddsRequest(odds map[string]json.Number, reason string) (*models.UpdateOddsRequest, error) {
	request := &models.UpdateOddsRequest{Odds: make(map[string]decimal.Decimal, len(odds)), Reason: strings.TrimSpace(reason)}
	for outcomeID, value := range odds {
		parsed, err := decimal.NewFromString(value.String())
		if err != nil {
			return nil, fmt.Errorf("invalid odds for outcome %s", outcomeID)
		}
		request.Odds[outcomeID] = parsed
	}
	return request, nil
}

func decodeSettleRequest(winningOutcomeID, reason, settledAt string) (*models.SettleMarketRequest, error) {
	request := &models.SettleMarketRequest{
		WinningOutcomeID: strings.TrimSpace(winningOutcomeID),
		Reason:           strings.TrimSpace(reason),
	}
	if strings.TrimSpace(settledAt) == "" {
		return request, nil
	}
	parsed, err := time.Parse(time.RFC3339, settledAt)
	if err != nil {
		return nil, fmt.Errorf("invalid settled_at")
	}
	request.SettledAt = &parsed
	return request, nil
}

func intFromQuery(r *http.Request, key string, fallback int) int {
	value := r.URL.Query().Get(key)
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}

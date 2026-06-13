package models

import (
	"time"

	"github.com/shopspring/decimal"
)

type Market struct {
	MarketID       string                     `json:"market_id"`
	ExternalID     string                     `json:"external_id,omitempty"`
	EventID        string                     `json:"event_id"`
	EventName      string                     `json:"event_name,omitempty"`
	Sport          string                     `json:"sport,omitempty"`
	League         string                     `json:"league,omitempty"`
	MarketType     string                     `json:"market_type"`
	Outcomes       []MarketOutcome            `json:"outcomes"`
	Odds           map[string]decimal.Decimal `json:"odds"`
	Status         string                     `json:"status"`
	MinBet         decimal.Decimal            `json:"min_bet"`
	MaxBet         decimal.Decimal            `json:"max_bet"`
	TotalMatched   decimal.Decimal            `json:"total_matched"`
	CreatedAt      time.Time                  `json:"created_at"`
	UpdatedAt      time.Time                  `json:"updated_at,omitempty"`
	ScheduledStart *time.Time                 `json:"scheduled_start,omitempty"`
}

type MarketOutcome struct {
	OutcomeID string          `json:"outcome_id"`
	Name      string          `json:"name"`
	Odds      decimal.Decimal `json:"odds"`
	Status    string          `json:"status,omitempty"`
	Result    string          `json:"result,omitempty"`
}

type MarketEvent struct {
	ID         string         `json:"id"`
	Name       string         `json:"name"`
	Sport      string         `json:"sport"`
	League     string         `json:"league,omitempty"`
	StartTime  time.Time      `json:"start_time"`
	Status     string         `json:"status"`
	ExternalID string         `json:"external_id,omitempty"`
	Metadata   map[string]any `json:"metadata,omitempty"`
}

type CreateMarketRequest struct {
	EventID    string                     `json:"event_id"`
	ExternalID string                     `json:"external_id,omitempty"`
	MarketType string                     `json:"market_type"`
	Outcomes   []CreateMarketOutcomeInput `json:"outcomes"`
	Odds       map[string]decimal.Decimal `json:"odds"`
	Status     string                     `json:"status"`
}

type CreateMarketOutcomeInput struct {
	Name      string `json:"name"`
	OutcomeID string `json:"outcome_id,omitempty"`
}

type UpdateOddsRequest struct {
	Odds   map[string]decimal.Decimal `json:"odds"`
	Reason string                     `json:"reason"`
}

type UpdateMarketStatusRequest struct {
	Status string `json:"status"`
	Reason string `json:"reason"`
}

type SettleMarketRequest struct {
	WinningOutcomeID string     `json:"winning_outcome_id"`
	Reason           string     `json:"reason,omitempty"`
	SettledAt        *time.Time `json:"settled_at,omitempty"`
}

type SettlementAcceptedResponse struct {
	MarketID          string `json:"market_id"`
	Status            string `json:"status"`
	WinningOutcomeID  string `json:"winning_outcome_id"`
	SettlementBatchID string `json:"settlement_batch_id"`
}

type LiquidityResponse struct {
	MarketID         string                     `json:"market_id"`
	TotalMatched     decimal.Decimal            `json:"total_matched"`
	MatchedByOutcome map[string]decimal.Decimal `json:"matched_by_outcome"`
	UnmatchedOrders  int                        `json:"unmatched_orders"`
	EffectiveSpread  decimal.Decimal            `json:"effective_spread"`
}

type Pagination struct {
	Page  int `json:"page"`
	Limit int `json:"limit"`
	Total int `json:"total"`
}

type ListMarketsResponse struct {
	Data       []*Market  `json:"data"`
	Pagination Pagination `json:"pagination"`
}

type AuthClaims struct {
	UserID      string   `json:"user_id"`
	Email       string   `json:"email"`
	Username    string   `json:"username"`
	Role        string   `json:"role"`
	Permissions []string `json:"permissions"`
}

type MarketFilters struct {
	EventID    string
	Status     string
	MarketType string
	Page       int
	Limit      int
}

type MockDataMarketInput struct {
	ProviderMarketID string                     `json:"provider_market_id"`
	EventExternalID  string                     `json:"event_external_id"`
	MarketType       string                     `json:"market_type"`
	Status           string                     `json:"status,omitempty"`
	Outcomes         []CreateMarketOutcomeInput `json:"outcomes"`
	Odds             map[string]decimal.Decimal `json:"odds"`
}

type SyncMockDataMarketsRequest struct {
	Markets []MockDataMarketInput `json:"markets"`
}

type OddinOutcomeInput struct {
	OutcomeID   string          `json:"outcome_id"`
	OutcomeName string          `json:"outcome_name"`
	Odds        decimal.Decimal `json:"odds"`
	Active      bool            `json:"active"`
}

type OddinMarketInput struct {
	SportEventID        string              `json:"sport_event_id"`
	MarketDescriptionID string              `json:"market_description_id"`
	MarketName          string              `json:"market_name"`
	MarketSpecifiers    map[string]string   `json:"market_specifiers,omitempty"`
	MarketStatus        string              `json:"market_status,omitempty"`
	MarketOutcomes      []OddinOutcomeInput `json:"market_outcomes"`
}

type SyncOddinMarketsRequest struct {
	Markets []OddinMarketInput `json:"markets"`
}

type BetgeniusSelectionInput struct {
	SelectionID string          `json:"selection_id"`
	Name        string          `json:"name"`
	Odds        decimal.Decimal `json:"odds"`
	Trading     bool            `json:"trading"`
}

type SyncBetgeniusMarketsItem struct {
	FixtureID     string                    `json:"fixture_id"`
	MarketID      string                    `json:"market_id"`
	MarketType    string                    `json:"market_type"`
	MarketName    string                    `json:"market_name"`
	Handicap      string                    `json:"handicap,omitempty"`
	TradingStatus string                    `json:"trading_status,omitempty"`
	Selections    []BetgeniusSelectionInput `json:"selections"`
}

type SyncBetgeniusMarketsRequest struct {
	Markets []SyncBetgeniusMarketsItem `json:"markets"`
}

type ProviderMarketSyncItem struct {
	ExternalID string `json:"external_id"`
	MarketID   string `json:"market_id"`
	Created    bool   `json:"created"`
	Status     string `json:"status"`
}

type ProviderMarketSyncResponse struct {
	Provider string                   `json:"provider"`
	Synced   int                      `json:"synced"`
	Created  int                      `json:"created"`
	Updated  int                      `json:"updated"`
	Items    []ProviderMarketSyncItem `json:"items"`
}

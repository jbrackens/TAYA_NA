package models

import (
	"time"

	"github.com/shopspring/decimal"
)

type AuthClaims struct {
	UserID      string   `json:"user_id"`
	Email       string   `json:"email"`
	Username    string   `json:"username"`
	Role        string   `json:"role"`
	Permissions []string `json:"permissions"`
}

type PredictionCategoryView struct {
	ID          string    `json:"id,omitempty"`
	Key         string    `json:"key"`
	Label       string    `json:"label"`
	Description string    `json:"description"`
	Accent      string    `json:"accent"`
	SortOrder   int       `json:"sort_order,omitempty"`
	CreatedAt   time.Time `json:"created_at,omitempty"`
}

type PredictionOutcomeView struct {
	OutcomeID  string          `json:"outcome_id"`
	Label      string          `json:"label"`
	PriceCents int             `json:"price_cents"`
	Change1D   decimal.Decimal `json:"change_1d"`
	Status     string          `json:"status,omitempty"`
	Result     string          `json:"result,omitempty"`
}

type PredictionMarketView struct {
	MarketID           string                  `json:"market_id"`
	Slug               string                  `json:"slug"`
	Title              string                  `json:"title"`
	ShortTitle         string                  `json:"short_title"`
	CategoryKey        string                  `json:"category_key"`
	CategoryLabel      string                  `json:"category_label"`
	Status             string                  `json:"status"`
	Featured           bool                    `json:"featured"`
	Live               bool                    `json:"live"`
	ClosesAt           time.Time               `json:"closes_at"`
	ResolvesAt         time.Time               `json:"resolves_at"`
	VolumeUSD          decimal.Decimal         `json:"volume_usd"`
	LiquidityUSD       decimal.Decimal         `json:"liquidity_usd"`
	Participants       int                     `json:"participants"`
	Summary            string                  `json:"summary"`
	Insight            string                  `json:"insight"`
	Rules              []string                `json:"rules"`
	Tags               []string                `json:"tags"`
	ResolutionSource   string                  `json:"resolution_source"`
	HeroMetricLabel    string                  `json:"hero_metric_label"`
	HeroMetricValue    string                  `json:"hero_metric_value"`
	ProbabilityPercent int                     `json:"probability_percent"`
	PriceChangePercent decimal.Decimal         `json:"price_change_percent"`
	WinningOutcomeID   *string                 `json:"winning_outcome_id,omitempty"`
	SettlementNote     *string                 `json:"settlement_note,omitempty"`
	Outcomes           []PredictionOutcomeView `json:"outcomes"`
	RelatedMarketIDs   []string                `json:"related_market_ids"`
}

type PredictionOverviewResponse struct {
	FeaturedMarkets []*PredictionMarketView  `json:"featured_markets"`
	LiveMarkets     []*PredictionMarketView  `json:"live_markets"`
	TrendingMarkets []*PredictionMarketView  `json:"trending_markets"`
	Categories      []PredictionCategoryView `json:"categories"`
}

type PredictionCategoriesResponse struct {
	Categories []PredictionCategoryView `json:"categories"`
}

type PredictionMarketsResponse struct {
	TotalCount int                     `json:"total_count"`
	Markets    []*PredictionMarketView `json:"markets"`
}

type PredictionMarketDetailResponse struct {
	Market         *PredictionMarketView   `json:"market"`
	RelatedMarkets []*PredictionMarketView `json:"related_markets"`
}

type PredictionTicketPreviewRequest struct {
	MarketID  string          `json:"market_id"`
	OutcomeID string          `json:"outcome_id"`
	StakeUSD  decimal.Decimal `json:"stake_usd"`
}

type PredictionTicketPreviewResponse struct {
	MarketID     string          `json:"market_id"`
	OutcomeID    string          `json:"outcome_id"`
	PriceCents   int             `json:"price_cents"`
	StakeUSD     decimal.Decimal `json:"stake_usd"`
	Shares       decimal.Decimal `json:"shares"`
	MaxPayoutUSD decimal.Decimal `json:"max_payout_usd"`
	MaxProfitUSD decimal.Decimal `json:"max_profit_usd"`
}

type PredictionOrderView struct {
	OrderID          string           `json:"order_id"`
	UserID           string           `json:"user_id"`
	MarketID         string           `json:"market_id"`
	MarketTitle      string           `json:"market_title"`
	CategoryKey      string           `json:"category_key"`
	OutcomeID        string           `json:"outcome_id"`
	OutcomeLabel     string           `json:"outcome_label"`
	StakeUSD         decimal.Decimal  `json:"stake_usd"`
	PriceCents       int              `json:"price_cents"`
	Shares           decimal.Decimal  `json:"shares"`
	MaxPayoutUSD     decimal.Decimal  `json:"max_payout_usd"`
	MaxProfitUSD     decimal.Decimal  `json:"max_profit_usd"`
	Status           string           `json:"status"`
	ReservationID    *string          `json:"reservation_id,omitempty"`
	PlacedAt         time.Time        `json:"placed_at"`
	CancelledAt      *time.Time       `json:"cancelled_at,omitempty"`
	SettledAt        *time.Time       `json:"settled_at,omitempty"`
	SettlementResult *string          `json:"settlement_result,omitempty"`
	SettlementPNL    *decimal.Decimal `json:"settlement_pnl,omitempty"`
	SettlementNote   *string          `json:"settlement_note,omitempty"`
}

type PredictionOrdersResponse struct {
	TotalCount int                    `json:"total_count"`
	Orders     []*PredictionOrderView `json:"orders"`
}

type PredictionPlaceOrderRequest struct {
	UserID    string          `json:"user_id"`
	MarketID  string          `json:"market_id"`
	OutcomeID string          `json:"outcome_id"`
	StakeUSD  decimal.Decimal `json:"stake_usd"`
}

type PredictionPlaceOrderResponse struct {
	Order *PredictionOrderView `json:"order"`
}

type PredictionCancelOrderResponse struct {
	Order *PredictionOrderView `json:"order"`
}

type PredictionAdminCategorySummary struct {
	Key                 string `json:"key"`
	Label               string `json:"label"`
	MarketCount         int    `json:"market_count"`
	LiveMarketCount     int    `json:"live_market_count"`
	OpenMarketCount     int    `json:"open_market_count"`
	ResolvedMarketCount int    `json:"resolved_market_count"`
}

type PredictionAdminSummaryResponse struct {
	TotalMarkets      int                              `json:"total_markets"`
	LiveMarkets       int                              `json:"live_markets"`
	FeaturedMarkets   int                              `json:"featured_markets"`
	ResolvedMarkets   int                              `json:"resolved_markets"`
	TotalVolumeUSD    decimal.Decimal                  `json:"total_volume_usd"`
	TotalLiquidityUSD decimal.Decimal                  `json:"total_liquidity_usd"`
	TotalOrders       int                              `json:"total_orders"`
	OpenOrders        int                              `json:"open_orders"`
	CancelledOrders   int                              `json:"cancelled_orders"`
	Categories        []PredictionAdminCategorySummary `json:"categories"`
	TopMarkets        []*PredictionMarketView          `json:"top_markets"`
}

type PredictionLifecycleRequest struct {
	Reason string `json:"reason"`
}

type PredictionResolveMarketRequest struct {
	OutcomeID string `json:"outcome_id"`
	Reason    string `json:"reason"`
}

type PredictionLifecycleEventView struct {
	ID                 string    `json:"id"`
	Action             string    `json:"action"`
	MarketStatusBefore string    `json:"market_status_before"`
	MarketStatusAfter  string    `json:"market_status_after"`
	OutcomeID          *string   `json:"outcome_id,omitempty"`
	OutcomeLabel       *string   `json:"outcome_label,omitempty"`
	PerformedBy        *string   `json:"performed_by,omitempty"`
	Reason             string    `json:"reason"`
	PerformedAt        time.Time `json:"performed_at"`
}

type PredictionLifecycleHistoryResponse struct {
	MarketID   string                         `json:"market_id"`
	TotalCount int                            `json:"total_count"`
	Items      []PredictionLifecycleEventView `json:"items"`
}

type PredictionMarketFilters struct {
	Category string
	Status   string
	Featured *bool
	Live     *bool
}

type AdminOrderFilters struct {
	UserID   string
	MarketID string
	Status   string
	Category string
}

type IssuePredictionBotAPIKeyRequest struct {
	AccountKey  string     `json:"account_key"`
	DisplayName string     `json:"display_name"`
	Scopes      []string   `json:"scopes"`
	ExpiresAt   *time.Time `json:"expires_at,omitempty"`
}

type IssuedPredictionBotAPIKeyResponse struct {
	AccountID string    `json:"account_id"`
	KeyID     string    `json:"key_id"`
	Token     string    `json:"token"`
	IssuedAt  time.Time `json:"issued_at"`
}

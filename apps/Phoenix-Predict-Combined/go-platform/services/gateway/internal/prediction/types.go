package prediction

import (
	"encoding/json"
	"time"
)

// Category represents a prediction market category (politics, crypto, sports, etc.)
type Category struct {
	ID        string    `json:"id" db:"id"`
	Slug      string    `json:"slug" db:"slug"`
	Name      string    `json:"name" db:"name"`
	Icon      string    `json:"icon,omitempty" db:"icon"`
	SortOrder int       `json:"sortOrder" db:"sort_order"`
	Active    bool      `json:"active" db:"active"`
	CreatedAt time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt time.Time `json:"updatedAt" db:"updated_at"`
}

// Series represents a recurring event template (e.g., "Fed Rate Decisions")
type Series struct {
	ID          string    `json:"id" db:"id"`
	Slug        string    `json:"slug" db:"slug"`
	Title       string    `json:"title" db:"title"`
	Description string    `json:"description,omitempty" db:"description"`
	CategoryID  string    `json:"categoryId" db:"category_id"`
	Frequency   string    `json:"frequency,omitempty" db:"frequency"`
	Tags        []string  `json:"tags" db:"tags"`
	Active      bool      `json:"active" db:"active"`
	CreatedAt   time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt   time.Time `json:"updatedAt" db:"updated_at"`
}

// EventStatus represents the lifecycle state of a prediction event.
type EventStatus string

const (
	EventStatusDraft       EventStatus = "draft"
	EventStatusOpen        EventStatus = "open"
	EventStatusTradingHalt EventStatus = "trading_halt"
	EventStatusClosed      EventStatus = "closed"
	EventStatusSettling    EventStatus = "settling"
	EventStatusSettled     EventStatus = "settled"
	EventStatusVoided      EventStatus = "voided"
)

// Event represents a specific occurrence within a series.
type Event struct {
	ID          string          `json:"id" db:"id"`
	SeriesID    *string         `json:"seriesId,omitempty" db:"series_id"`
	Title       string          `json:"title" db:"title"`
	Description string          `json:"description,omitempty" db:"description"`
	CategoryID  string          `json:"categoryId" db:"category_id"`
	Status      EventStatus     `json:"status" db:"status"`
	Featured    bool            `json:"featured" db:"featured"`
	OpenAt      *time.Time      `json:"openAt,omitempty" db:"open_at"`
	CloseAt     time.Time       `json:"closeAt" db:"close_at"`
	SettleAt    *time.Time      `json:"settleAt,omitempty" db:"settle_at"`
	SettledAt   *time.Time      `json:"settledAt,omitempty" db:"settled_at"`
	Metadata    json.RawMessage `json:"metadata,omitempty" db:"metadata"`
	CreatedBy   *string         `json:"createdBy,omitempty" db:"created_by"`
	CreatedAt   time.Time       `json:"createdAt" db:"created_at"`
	UpdatedAt   time.Time       `json:"updatedAt" db:"updated_at"`

	// Joined data
	Markets []Market `json:"markets,omitempty" db:"-"`
}

// MarketStatus represents the lifecycle state of a prediction market.
type MarketStatus string

const (
	MarketStatusUnopened MarketStatus = "unopened"
	MarketStatusOpen     MarketStatus = "open"
	MarketStatusHalted   MarketStatus = "halted"
	MarketStatusClosed   MarketStatus = "closed"
	MarketStatusSettled  MarketStatus = "settled"
	MarketStatusVoided   MarketStatus = "voided"
)

// MarketResult is the resolved outcome of a market.
type MarketResult string

const (
	MarketResultYes MarketResult = "yes"
	MarketResultNo  MarketResult = "no"
)

// Market represents an individual binary contract within an event.
type Market struct {
	ID                   string          `json:"id" db:"id"`
	EventID              string          `json:"eventId" db:"event_id"`
	Ticker               string          `json:"ticker" db:"ticker"`
	Title                string          `json:"title" db:"title"`
	Description          string          `json:"description,omitempty" db:"description"`
	Status               MarketStatus    `json:"status" db:"status"`
	Result               *MarketResult   `json:"result,omitempty" db:"result"`
	YesPriceCents        int             `json:"yesPriceCents" db:"yes_price_cents"`
	NoPriceCents         int             `json:"noPriceCents" db:"no_price_cents"`
	LastTradePriceCents  *int            `json:"lastTradePriceCents,omitempty" db:"last_trade_price_cents"`
	VolumeCents          int64           `json:"volumeCents" db:"volume_cents"`
	OpenInterestCents    int64           `json:"openInterestCents" db:"open_interest_cents"`
	LiquidityCents       int64           `json:"liquidityCents" db:"liquidity_cents"`
	AMMYesShares         float64         `json:"ammYesShares" db:"amm_yes_shares"`
	AMMNoShares          float64         `json:"ammNoShares" db:"amm_no_shares"`
	AMMLiquidityParam    float64         `json:"ammLiquidityParam" db:"amm_liquidity_param"`
	AMMSubsidyCents      int64           `json:"ammSubsidyCents" db:"amm_subsidy_cents"`
	SettlementSourceKey  string          `json:"settlementSourceKey" db:"settlement_source_key"`
	SettlementCutoffAt   *time.Time      `json:"settlementCutoffAt,omitempty" db:"settlement_cutoff_at"`
	SettlementRule       string          `json:"settlementRule" db:"settlement_rule"`
	SettlementParams     json.RawMessage `json:"settlementParams,omitempty" db:"settlement_params"`
	FallbackSourceKey    *string         `json:"fallbackSourceKey,omitempty" db:"fallback_source_key"`
	FeeRateBps           int             `json:"feeRateBps" db:"fee_rate_bps"`
	MakerRebateBps       int             `json:"makerRebateBps" db:"maker_rebate_bps"`
	OpenAt               *time.Time      `json:"openAt,omitempty" db:"open_at"`
	CloseAt              time.Time       `json:"closeAt" db:"close_at"`
	CreatedAt            time.Time       `json:"createdAt" db:"created_at"`
	UpdatedAt            time.Time       `json:"updatedAt" db:"updated_at"`
	ImagePath            string          `json:"imagePath,omitempty" db:"image_path"`
}

// OrderSide is the side of a prediction (YES or NO).
type OrderSide string

const (
	OrderSideYes OrderSide = "yes"
	OrderSideNo  OrderSide = "no"
)

// OrderAction is the action taken (BUY or SELL).
type OrderAction string

const (
	OrderActionBuy  OrderAction = "buy"
	OrderActionSell OrderAction = "sell"
)

// OrderType distinguishes market orders from limit orders.
type OrderType string

const (
	OrderTypeMarket OrderType = "market"
	OrderTypeLimit  OrderType = "limit"
)

// OrderStatus tracks the lifecycle of an order.
type OrderStatus string

const (
	OrderStatusPending   OrderStatus = "pending"
	OrderStatusOpen      OrderStatus = "open"
	OrderStatusPartial   OrderStatus = "partial"
	OrderStatusFilled    OrderStatus = "filled"
	OrderStatusCancelled OrderStatus = "cancelled"
	OrderStatusExpired   OrderStatus = "expired"
)

// Order represents a user's order to buy or sell contracts.
type Order struct {
	ID                  string      `json:"id" db:"id"`
	UserID              string      `json:"userId" db:"user_id"`
	MarketID            string      `json:"marketId" db:"market_id"`
	Side                OrderSide   `json:"side" db:"side"`
	Action              OrderAction `json:"action" db:"action"`
	OrderType           OrderType   `json:"orderType" db:"order_type"`
	PriceCents          *int        `json:"priceCents,omitempty" db:"price_cents"`
	Quantity            int         `json:"quantity" db:"quantity"`
	FilledQuantity      int         `json:"filledQuantity" db:"filled_quantity"`
	RemainingQuantity   int         `json:"remainingQuantity" db:"remaining_quantity"`
	TotalCostCents      int64       `json:"totalCostCents" db:"total_cost_cents"`
	Status              OrderStatus `json:"status" db:"status"`
	WalletReservationID *string     `json:"walletReservationId,omitempty" db:"wallet_reservation_id"`
	IdempotencyKey      *string     `json:"idempotencyKey,omitempty" db:"idempotency_key"`
	ExpiresAt           *time.Time  `json:"expiresAt,omitempty" db:"expires_at"`
	FilledAt            *time.Time  `json:"filledAt,omitempty" db:"filled_at"`
	CancelledAt         *time.Time  `json:"cancelledAt,omitempty" db:"cancelled_at"`
	CreatedAt           time.Time   `json:"createdAt" db:"created_at"`
	UpdatedAt           time.Time   `json:"updatedAt" db:"updated_at"`
}

// Position represents a user's net holding in a market on one side.
type Position struct {
	ID               string    `json:"id" db:"id"`
	UserID           string    `json:"userId" db:"user_id"`
	MarketID         string    `json:"marketId" db:"market_id"`
	Side             OrderSide `json:"side" db:"side"`
	Quantity         int       `json:"quantity" db:"quantity"`
	AvgPriceCents    int       `json:"avgPriceCents" db:"avg_price_cents"`
	TotalCostCents   int64     `json:"totalCostCents" db:"total_cost_cents"`
	RealizedPnlCents int64     `json:"realizedPnlCents" db:"realized_pnl_cents"`
	CreatedAt        time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt        time.Time `json:"updatedAt" db:"updated_at"`
}

// Trade is an immutable fill record.
type Trade struct {
	ID          string    `json:"id" db:"id"`
	MarketID    string    `json:"marketId" db:"market_id"`
	BuyOrderID  *string   `json:"buyOrderId,omitempty" db:"buy_order_id"`
	SellOrderID *string   `json:"sellOrderId,omitempty" db:"sell_order_id"`
	BuyerID     string    `json:"buyerId" db:"buyer_id"`
	SellerID    *string   `json:"sellerId,omitempty" db:"seller_id"`
	Side        OrderSide `json:"side" db:"side"`
	PriceCents  int       `json:"priceCents" db:"price_cents"`
	Quantity    int       `json:"quantity" db:"quantity"`
	FeeCents    int       `json:"feeCents" db:"fee_cents"`
	IsAMMTrade  bool      `json:"isAmmTrade" db:"is_amm_trade"`
	TradedAt    time.Time `json:"tradedAt" db:"traded_at"`
}

// Settlement records a market resolution.
type Settlement struct {
	ID                 string          `json:"id" db:"id"`
	MarketID           string          `json:"marketId" db:"market_id"`
	Result             MarketResult    `json:"result" db:"result"`
	AttestationSource  string          `json:"attestationSource" db:"attestation_source"`
	AttestationID      *string         `json:"attestationId,omitempty" db:"attestation_id"`
	AttestationDigest  *string         `json:"attestationDigest,omitempty" db:"attestation_digest"`
	AttestationData    json.RawMessage `json:"attestationData,omitempty" db:"attestation_data"`
	SettledBy          *string         `json:"settledBy,omitempty" db:"settled_by"`
	SettledAt          time.Time       `json:"settledAt" db:"settled_at"`
	TotalPayoutCents   int64           `json:"totalPayoutCents" db:"total_payout_cents"`
	PositionsSettled   int             `json:"positionsSettled" db:"positions_settled"`
}

// Payout records a per-position settlement credit.
type Payout struct {
	ID             string    `json:"id" db:"id"`
	SettlementID   string    `json:"settlementId" db:"settlement_id"`
	PositionID     string    `json:"positionId" db:"position_id"`
	UserID         string    `json:"userId" db:"user_id"`
	MarketID       string    `json:"marketId" db:"market_id"`
	Side           OrderSide `json:"side" db:"side"`
	Quantity       int       `json:"quantity" db:"quantity"`
	EntryPriceCents int      `json:"entryPriceCents" db:"entry_price_cents"`
	ExitPriceCents  int      `json:"exitPriceCents" db:"exit_price_cents"`
	PnlCents       int64     `json:"pnlCents" db:"pnl_cents"`
	PayoutCents    int64     `json:"payoutCents" db:"payout_cents"`
	PaidAt         time.Time `json:"paidAt" db:"paid_at"`
}

// LifecycleEvent records a market state transition.
type LifecycleEvent struct {
	ID         string          `json:"id" db:"id"`
	MarketID   string          `json:"marketId" db:"market_id"`
	EventType  string          `json:"eventType" db:"event_type"`
	ActorID    *string         `json:"actorId,omitempty" db:"actor_id"`
	ActorType  string          `json:"actorType" db:"actor_type"`
	Reason     *string         `json:"reason,omitempty" db:"reason"`
	Metadata   json.RawMessage `json:"metadata,omitempty" db:"metadata"`
	OccurredAt time.Time       `json:"occurredAt" db:"occurred_at"`
}

// APIKey represents a bot API key for programmatic access.
type APIKey struct {
	ID         string     `json:"id" db:"id"`
	UserID     string     `json:"userId" db:"user_id"`
	Name       string     `json:"name" db:"name"`
	KeyHash    string     `json:"-" db:"key_hash"`
	KeyPrefix  string     `json:"keyPrefix" db:"key_prefix"`
	Scopes     []string   `json:"scopes" db:"scopes"`
	Active     bool       `json:"active" db:"active"`
	ExpiresAt  *time.Time `json:"expiresAt,omitempty" db:"expires_at"`
	LastUsedAt *time.Time `json:"lastUsedAt,omitempty" db:"last_used_at"`
	CreatedAt  time.Time  `json:"createdAt" db:"created_at"`
}

// --- Request / Response types ---

// PlaceOrderRequest is the API request to place a new order.
type PlaceOrderRequest struct {
	MarketID       string      `json:"marketId" validate:"required"`
	Side           OrderSide   `json:"side" validate:"required,oneof=yes no"`
	Action         OrderAction `json:"action" validate:"required,oneof=buy sell"`
	OrderType      OrderType   `json:"orderType" validate:"required,oneof=market limit"`
	PriceCents     *int        `json:"priceCents,omitempty"`
	Quantity       int         `json:"quantity" validate:"required,gt=0"`
	IdempotencyKey *string     `json:"idempotencyKey,omitempty"`
}

// OrderPreview is the response from previewing an order cost.
type OrderPreview struct {
	Side         OrderSide `json:"side"`
	Action       OrderAction `json:"action"`
	Quantity     int         `json:"quantity"`
	PriceCents   int         `json:"priceCents"`
	TotalCost    int64       `json:"totalCostCents"`
	FeeCents     int64       `json:"feeCents"`
	MaxProfit    int64       `json:"maxProfitCents"`
	MaxLoss      int64       `json:"maxLossCents"`
	NewYesPrice  int         `json:"newYesPriceCents"`
	NewNoPrice   int         `json:"newNoPriceCents"`
}

// PortfolioSummary provides a user's aggregate prediction stats.
type PortfolioSummary struct {
	TotalValueCents    int64   `json:"totalValueCents"`
	UnrealizedPnlCents int64   `json:"unrealizedPnlCents"`
	RealizedPnlCents   int64   `json:"realizedPnlCents"`
	OpenPositions      int     `json:"openPositions"`
	TotalPredictions   int     `json:"totalPredictions"`
	CorrectPredictions int     `json:"correctPredictions"`
	AccuracyPct        float64 `json:"accuracyPct"`
}

// DiscoveryResponse groups markets for the discovery page.
type DiscoveryResponse struct {
	Featured    []Market `json:"featured"`
	Trending    []Market `json:"trending"`
	ClosingSoon []Market `json:"closingSoon"`
	Recent      []Market `json:"recent"`
}

// CreateMarketRequest is the admin request to create a new market.
type CreateMarketRequest struct {
	EventID             string          `json:"eventId" validate:"required"`
	Ticker              string          `json:"ticker" validate:"required"`
	Title               string          `json:"title" validate:"required"`
	Description         string          `json:"description,omitempty"`
	SettlementSourceKey string          `json:"settlementSourceKey" validate:"required"`
	SettlementRule      string          `json:"settlementRule" validate:"required"`
	SettlementParams    json.RawMessage `json:"settlementParams,omitempty"`
	FallbackSourceKey   *string         `json:"fallbackSourceKey,omitempty"`
	CloseAt             time.Time       `json:"closeAt" validate:"required"`
	SettlementCutoffAt  *time.Time      `json:"settlementCutoffAt,omitempty"`
	FeeRateBps          int             `json:"feeRateBps"`
	AMMLiquidityParam   float64         `json:"ammLiquidityParam"`
	AMMSubsidyCents     int64           `json:"ammSubsidyCents"`
}

// ResolveMarketRequest is the admin request to settle a market.
type ResolveMarketRequest struct {
	Result            MarketResult    `json:"result" validate:"required,oneof=yes no"`
	AttestationSource string          `json:"attestationSource" validate:"required"`
	AttestationID     *string         `json:"attestationId,omitempty"`
	AttestationData   json.RawMessage `json:"attestationData,omitempty"`
	Reason            *string         `json:"reason,omitempty"`
}

// PageMeta provides pagination metadata in list responses.
type PageMeta struct {
	Page      int  `json:"page"`
	PageSize  int  `json:"pageSize"`
	Total     int  `json:"total"`
	HasNext   bool `json:"hasNext"`
}

// DashboardMover is a single market in the "biggest YES price moves" list,
// computed as the difference between the first and last YES trade in the window.
type DashboardMover struct {
	MarketID           string `json:"marketId"`
	Ticker             string `json:"ticker"`
	Title              string `json:"title"`
	YesPriceCentsStart int    `json:"yesPriceCentsStart"`
	YesPriceCentsNow   int    `json:"yesPriceCentsNow"`
	VolumeCents        int64  `json:"volumeCents"`
}

// DashboardVolumeStats aggregates trade activity over a time window for the
// admin dashboard. Computed from prediction_trades; window is open-bounded
// at Since (exclusive) and the present.
type DashboardVolumeStats struct {
	Since            time.Time        `json:"since"`
	WindowSeconds    int              `json:"windowSeconds"`
	TotalVolumeCents int64            `json:"totalVolumeCents"`
	TradeCount       int              `json:"tradeCount"`
	TopMovers        []DashboardMover `json:"topMovers"`
}

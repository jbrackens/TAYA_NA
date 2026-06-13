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
	MarketStatusUnopened           MarketStatus = "unopened"
	MarketStatusOpen               MarketStatus = "open"
	MarketStatusHalted             MarketStatus = "halted"
	MarketStatusClosed             MarketStatus = "closed"
	MarketStatusProposedResolution MarketStatus = "proposed_resolution"
	MarketStatusDisputed           MarketStatus = "disputed"
	MarketStatusSettled            MarketStatus = "settled"
	MarketStatusVoided             MarketStatus = "voided"
)

// MarketResult is the resolved outcome of a market.
type MarketResult string

const (
	MarketResultYes MarketResult = "yes"
	MarketResultNo  MarketResult = "no"
)

// ExecutionMode determines whether a market matches via the AMM or the
// real order book exchange engine.
type ExecutionMode string

const (
	ExecutionModeOrderBook ExecutionMode = "order_book"
	ExecutionModeAMM       ExecutionMode = "amm"
)

// Market represents an individual binary contract within an event.
type Market struct {
	ID                  string          `json:"id" db:"id"`
	EventID             string          `json:"eventId" db:"event_id"`
	Ticker              string          `json:"ticker" db:"ticker"`
	Title               string          `json:"title" db:"title"`
	Description         string          `json:"description,omitempty" db:"description"`
	Translations        json.RawMessage `json:"translations,omitempty" db:"translations"`
	Status              MarketStatus    `json:"status" db:"status"`
	Result              *MarketResult   `json:"result,omitempty" db:"result"`
	YesPriceCents       int             `json:"yesPriceCents" db:"yes_price_cents"`
	NoPriceCents        int             `json:"noPriceCents" db:"no_price_cents"`
	LastTradePriceCents *int            `json:"lastTradePriceCents,omitempty" db:"last_trade_price_cents"`
	VolumeCents         int64           `json:"volumeCents" db:"volume_cents"`
	OpenInterestCents   int64           `json:"openInterestCents" db:"open_interest_cents"`
	LiquidityCents      int64           `json:"liquidityCents" db:"liquidity_cents"`
	AMMYesShares        float64         `json:"ammYesShares" db:"amm_yes_shares"`
	AMMNoShares         float64         `json:"ammNoShares" db:"amm_no_shares"`
	AMMLiquidityParam   float64         `json:"ammLiquidityParam" db:"amm_liquidity_param"`
	AMMSubsidyCents     int64           `json:"ammSubsidyCents" db:"amm_subsidy_cents"`
	SettlementSourceKey string          `json:"settlementSourceKey" db:"settlement_source_key"`
	SettlementCutoffAt  *time.Time      `json:"settlementCutoffAt,omitempty" db:"settlement_cutoff_at"`
	SettlementRule      string          `json:"settlementRule" db:"settlement_rule"`
	SettlementParams    json.RawMessage `json:"settlementParams,omitempty" db:"settlement_params"`
	FallbackSourceKey   *string         `json:"fallbackSourceKey,omitempty" db:"fallback_source_key"`
	FeeRateBps          int             `json:"feeRateBps" db:"fee_rate_bps"`
	MakerRebateBps      int             `json:"makerRebateBps" db:"maker_rebate_bps"`
	OpenAt              *time.Time      `json:"openAt,omitempty" db:"open_at"`
	CloseAt             time.Time       `json:"closeAt" db:"close_at"`
	CreatedAt           time.Time       `json:"createdAt" db:"created_at"`
	UpdatedAt           time.Time       `json:"updatedAt" db:"updated_at"`
	ImagePath           string          `json:"imagePath,omitempty" db:"image_path"`

	// ArticleSourceID links an AI-drafted market to its source article
	// (migration 024). Nil for markets created by hand.
	ArticleSourceID *string `json:"articleSourceId,omitempty" db:"article_source_id"`

	// Exchange engine fields (migration 019).
	ExecutionMode          ExecutionMode `json:"executionMode" db:"execution_mode"`
	CollateralPoolCents    int64         `json:"collateralPoolCents" db:"collateral_pool_cents"`
	SettledPayoutPoolCents int64         `json:"settledPayoutPoolCents" db:"settled_payout_pool_cents"`
	BestYesBidCents        *int          `json:"bestYesBidCents,omitempty" db:"best_yes_bid_cents"`
	BestYesAskCents        *int          `json:"bestYesAskCents,omitempty" db:"best_yes_ask_cents"`
	BestNoBidCents         *int          `json:"bestNoBidCents,omitempty" db:"best_no_bid_cents"`
	BestNoAskCents         *int          `json:"bestNoAskCents,omitempty" db:"best_no_ask_cents"`
	LastQuoteAt            *time.Time    `json:"lastQuoteAt,omitempty" db:"last_quote_at"`
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
	OrderStatusRejected  OrderStatus = "rejected"
)

// TimeInForce specifies the lifetime of a limit order.
type TimeInForce string

const (
	TIFGTC TimeInForce = "gtc"
	TIFIOC TimeInForce = "ioc"
	TIFFOK TimeInForce = "fok"
)

// SelfMatchAction tells the exchange how to handle same-user crossings.
type SelfMatchAction string

const (
	SelfMatchCancelTaker SelfMatchAction = "cancel_taker"
	SelfMatchCancelMaker SelfMatchAction = "cancel_maker"
	SelfMatchCancelBoth  SelfMatchAction = "cancel_both"
)

// Failure-reason constants populated on rejected/cancelled orders.
const (
	FailurePriceBandViolation   = "price_band_violation"
	FailurePostOnlyWouldTake    = "post_only_would_take"
	FailureSelfMatchRejected    = "self_match_rejected"
	FailureClosedMarket         = "closed_market"
	FailureInsufficientBalance  = "insufficient_balance"
	FailureInsufficientPosition = "insufficient_position"
	FailureNotionalCapMissing   = "notional_cap_missing"
	FailureNotionalCapExceeded  = "notional_cap_exceeded"
	FailureFOKUnavailable       = "fok_unavailable"
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

	// Exchange engine fields (migration 019).
	TimeInForce           TimeInForce     `json:"timeInForce" db:"time_in_force"`
	ReservedCashCents     int64           `json:"reservedCashCents" db:"reserved_cash_cents"`
	CapturedCashCents     int64           `json:"capturedCashCents" db:"captured_cash_cents"`
	ReleasedCashCents     int64           `json:"releasedCashCents" db:"released_cash_cents"`
	ReservedQuantity      int             `json:"reservedQuantity" db:"reserved_quantity"`
	AverageFillPriceCents *int            `json:"averageFillPriceCents,omitempty" db:"average_fill_price_cents"`
	FilledCostCents       int64           `json:"filledCostCents" db:"filled_cost_cents"`
	FailureReason         *string         `json:"failureReason,omitempty" db:"failure_reason"`
	PostOnly              bool            `json:"postOnly" db:"post_only"`
	ClientOrderID         *string         `json:"clientOrderId,omitempty" db:"client_order_id"`
	SelfMatchAction       SelfMatchAction `json:"selfMatchAction" db:"self_match_action"`
	NotionalCapCents      *int64          `json:"notionalCapCents,omitempty" db:"notional_cap_cents"`
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

	// Exchange engine fields (migration 019). reserved_quantity is the count
	// of shares locked by resting sell orders. available = quantity - reserved.
	ReservedQuantity int `json:"reservedQuantity" db:"reserved_quantity"`
}

// TradeKind distinguishes secondary transfers from complementary issuance.
type TradeKind string

const (
	TradeKindSecondary TradeKind = "secondary"
	TradeKindIssuance  TradeKind = "issuance"
)

// EngineKind tags trade rows with the engine that produced them.
type EngineKind string

const (
	EngineKindOrderBook EngineKind = "order_book"
	EngineKindAMM       EngineKind = "amm"
)

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

	// Exchange engine fields (migration 019). MatchID links the two rows of a
	// complementary issuance fill; equals trade ID for secondary transfers.
	MatchID    string     `json:"matchId" db:"match_id"`
	TradeKind  TradeKind  `json:"tradeKind" db:"trade_kind"`
	EngineKind EngineKind `json:"engineKind" db:"engine_kind"`
}

// CollateralEntryType identifies a row in prediction_collateral_ledger.
type CollateralEntryType string

const (
	CollateralIssue            CollateralEntryType = "issue_collateral"
	CollateralSettlementPayout CollateralEntryType = "settlement_payout"
	CollateralFee              CollateralEntryType = "fee"
	CollateralRefund           CollateralEntryType = "refund"
	CollateralAdjustment       CollateralEntryType = "adjustment"
	CollateralRebate           CollateralEntryType = "rebate"
)

// CollateralDriftAlert summarises recent adjustment ledger rows on a market.
// Surfaced to backoffice ops so the risk page can highlight markets with
// unresolved drift detected by the reconciliation cron.
type CollateralDriftAlert struct {
	MarketID         string    `json:"marketId"`
	Ticker           string    `json:"ticker"`
	AdjustmentCount  int       `json:"adjustmentCount"`
	MaxDriftCents    int64     `json:"maxDriftCents"`
	TotalDriftCents  int64     `json:"totalDriftCents"`
	LatestAdjustedAt time.Time `json:"latestAdjustedAt"`
	LatestReason     string    `json:"latestReason"`
}

// CollateralLedgerEntry is an append-only collateral movement on a market.
type CollateralLedgerEntry struct {
	ID                string              `json:"id" db:"id"`
	MarketID          string              `json:"marketId" db:"market_id"`
	TradeID           *string             `json:"tradeId,omitempty" db:"trade_id"`
	OrderID           *string             `json:"orderId,omitempty" db:"order_id"`
	UserID            *string             `json:"userId,omitempty" db:"user_id"`
	EntryType         CollateralEntryType `json:"entryType" db:"entry_type"`
	AmountCents       int64               `json:"amountCents" db:"amount_cents"`
	BalanceAfterCents int64               `json:"balanceAfterCents" db:"balance_after_cents"`
	Reason            string              `json:"reason" db:"reason"`
	CreatedAt         time.Time           `json:"createdAt" db:"created_at"`
}

// OrderBookLevel is one price level in the order book.
type OrderBookLevel struct {
	PriceCents int `json:"priceCents"`
	Quantity   int `json:"quantity"`
	Total      int `json:"total"`
}

// OrderBookSide is one side (yes or no) with bids and asks.
type OrderBookSide struct {
	Bids []OrderBookLevel `json:"bids"`
	Asks []OrderBookLevel `json:"asks"`
}

// OrderBook is the full L2 book for a market, returned by GET /orderbook.
type OrderBook struct {
	MarketID string        `json:"marketId"`
	Yes      OrderBookSide `json:"yes"`
	No       OrderBookSide `json:"no"`
}

// Settlement records a market resolution.
type Settlement struct {
	ID                string          `json:"id" db:"id"`
	MarketID          string          `json:"marketId" db:"market_id"`
	Result            MarketResult    `json:"result" db:"result"`
	AttestationSource string          `json:"attestationSource" db:"attestation_source"`
	AttestationID     *string         `json:"attestationId,omitempty" db:"attestation_id"`
	AttestationDigest *string         `json:"attestationDigest,omitempty" db:"attestation_digest"`
	AttestationData   json.RawMessage `json:"attestationData,omitempty" db:"attestation_data"`
	SettledBy         *string         `json:"settledBy,omitempty" db:"settled_by"`
	SettledAt         time.Time       `json:"settledAt" db:"settled_at"`
	TotalPayoutCents  int64           `json:"totalPayoutCents" db:"total_payout_cents"`
	PositionsSettled  int             `json:"positionsSettled" db:"positions_settled"`

	// Disbursement progress (migration 034, P3-12). PayoutsTotal is the number
	// of positions to pay, snapshotted when the header commits; PayoutsCompleted
	// advances as each payout batch commits. Completed < Total means a resume
	// pass must finish disbursing this settlement.
	PayoutsTotal     int `json:"payoutsTotal" db:"payouts_total"`
	PayoutsCompleted int `json:"payoutsCompleted" db:"payouts_completed"`

	// Admin override audit (migration 019). Either all three are null or all
	// three are set together; enforced by a CHECK constraint.
	OverrideReason     *string    `json:"overrideReason,omitempty" db:"override_reason"`
	OverriddenByUserID *string    `json:"overriddenByUserId,omitempty" db:"overridden_by_user_id"`
	OverriddenAt       *time.Time `json:"overriddenAt,omitempty" db:"overridden_at"`
}

// Payout records a per-position settlement credit.
type Payout struct {
	ID              string    `json:"id" db:"id"`
	SettlementID    string    `json:"settlementId" db:"settlement_id"`
	PositionID      string    `json:"positionId" db:"position_id"`
	UserID          string    `json:"userId" db:"user_id"`
	MarketID        string    `json:"marketId" db:"market_id"`
	Side            OrderSide `json:"side" db:"side"`
	Quantity        int       `json:"quantity" db:"quantity"`
	EntryPriceCents int       `json:"entryPriceCents" db:"entry_price_cents"`
	ExitPriceCents  int       `json:"exitPriceCents" db:"exit_price_cents"`
	PnlCents        int64     `json:"pnlCents" db:"pnl_cents"`
	PayoutCents     int64     `json:"payoutCents" db:"payout_cents"`
	PaidAt          time.Time `json:"paidAt" db:"paid_at"`
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

	// Exchange engine fields (ignored on AMM-mode markets).
	TimeInForce      TimeInForce     `json:"timeInForce,omitempty"`
	PostOnly         bool            `json:"postOnly,omitempty"`
	ClientOrderID    *string         `json:"clientOrderId,omitempty"`
	SelfMatchAction  SelfMatchAction `json:"selfMatchAction,omitempty"`
	NotionalCapCents *int64          `json:"notionalCapCents,omitempty"`
}

// OrderPreview is the response from previewing an order cost.
type OrderPreview struct {
	Side                    OrderSide     `json:"side"`
	Action                  OrderAction   `json:"action"`
	Quantity                int           `json:"quantity"`
	PriceCents              int           `json:"priceCents"`
	TotalCost               int64         `json:"totalCostCents"`
	FeeCents                int64         `json:"feeCents"`
	MaxProfit               int64         `json:"maxProfitCents"`
	MaxLoss                 int64         `json:"maxLossCents"`
	NewYesPrice             int           `json:"newYesPriceCents"`
	NewNoPrice              int           `json:"newNoPriceCents"`
	ExecutionMode           ExecutionMode `json:"executionMode,omitempty"`
	FilledQuantity          int           `json:"filledQuantity"`
	UnfilledQuantity        int           `json:"unfilledQuantity"`
	AverageFillPriceCents   int           `json:"averageFillPriceCents"`
	TotalCostWithFeesCents  int64         `json:"totalCostWithFeesCents"`
	EstimatedSlippageCents  int           `json:"estimatedSlippageCents"`
	QuoteStatus             OrderStatus   `json:"quoteStatus,omitempty"`
	QuoteStaleAfterMillis   int64         `json:"quoteStaleAfterMillis,omitempty"`
	QuoteGeneratedAtUnixSec int64         `json:"quoteGeneratedAtUnixSec,omitempty"`
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

// CreateEventRequest is the admin request to create a new event. New events
// start in 'draft' status. CreatedBy is server-set from the session (json:"-").
type CreateEventRequest struct {
	SeriesID    *string         `json:"seriesId,omitempty"`
	Title       string          `json:"title" validate:"required"`
	Description string          `json:"description,omitempty"`
	CategoryID  string          `json:"categoryId" validate:"required"`
	Featured    bool            `json:"featured"`
	OpenAt      *time.Time      `json:"openAt,omitempty"`
	CloseAt     time.Time       `json:"closeAt" validate:"required"`
	Metadata    json.RawMessage `json:"metadata,omitempty"`
	CreatedBy   *string         `json:"-"`
}

// CreateMarketRequest is the admin request to create a new market.
type CreateMarketRequest struct {
	EventID             string          `json:"eventId" validate:"required"`
	Ticker              string          `json:"ticker" validate:"required"`
	Title               string          `json:"title" validate:"required"`
	Description         string          `json:"description,omitempty"`
	Translations        json.RawMessage `json:"translations,omitempty"`
	SettlementSourceKey string          `json:"settlementSourceKey" validate:"required"`
	SettlementRule      string          `json:"settlementRule" validate:"required"`
	SettlementParams    json.RawMessage `json:"settlementParams,omitempty"`
	FallbackSourceKey   *string         `json:"fallbackSourceKey,omitempty"`
	CloseAt             time.Time       `json:"closeAt" validate:"required"`
	SettlementCutoffAt  *time.Time      `json:"settlementCutoffAt,omitempty"`
	FeeRateBps          int             `json:"feeRateBps"`
	AMMLiquidityParam   float64         `json:"ammLiquidityParam"`
	AMMSubsidyCents     int64           `json:"ammSubsidyCents"`
	ArticleSourceID     *string         `json:"articleSourceId,omitempty"`
	AIGenerationLogIDs  []string        `json:"aiGenerationLogIds,omitempty"`
	CreatedBy           *string         `json:"-"`
}

// ArticleSource is the provenance record for an AI-drafted market's source
// article (migration 024). Only an excerpt + AI summary + a SHA-256 of the
// article text are stored, never the full copyrighted body.
type ArticleSource struct {
	ID           string          `json:"id" db:"id"`
	SourceURL    *string         `json:"sourceUrl,omitempty" db:"source_url"`
	SourceName   *string         `json:"sourceName,omitempty" db:"source_name"`
	Title        *string         `json:"title,omitempty" db:"title"`
	Author       *string         `json:"author,omitempty" db:"author"`
	PublishedAt  *time.Time      `json:"publishedAt,omitempty" db:"published_at"`
	Language     string          `json:"language" db:"language"`
	Jurisdiction json.RawMessage `json:"jurisdiction,omitempty" db:"jurisdiction"`
	Excerpt      *string         `json:"excerpt,omitempty" db:"excerpt"`
	Summary      *string         `json:"summary,omitempty" db:"summary"`
	TextHash     string          `json:"textHash" db:"text_hash"`
	CreatedBy    *string         `json:"createdBy,omitempty" db:"created_by"`
	CreatedAt    time.Time       `json:"createdAt" db:"created_at"`
	UpdatedAt    time.Time       `json:"updatedAt" db:"updated_at"`
}

// AIGenerationLog is one model call in the market-drafting pipeline
// (migration 024), stored for audit, legal defensibility, and model
// evaluation. InputJSON is redacted/truncated upstream — it must never carry
// the full copyrighted article body.
type AIGenerationLog struct {
	ID                string          `json:"id" db:"id"`
	ArticleSourceID   *string         `json:"articleSourceId,omitempty" db:"article_source_id"`
	MarketID          *string         `json:"marketId,omitempty" db:"market_id"`
	Stage             string          `json:"stage" db:"stage"`
	Tier              *string         `json:"tier,omitempty" db:"tier"`
	ModelProvider     *string         `json:"modelProvider,omitempty" db:"model_provider"`
	ModelName         *string         `json:"modelName,omitempty" db:"model_name"`
	InferenceEndpoint *string         `json:"inferenceEndpoint,omitempty" db:"inference_endpoint"`
	PromptVersion     *string         `json:"promptVersion,omitempty" db:"prompt_version"`
	InputJSON         json.RawMessage `json:"inputJson,omitempty" db:"input_json"`
	OutputJSON        json.RawMessage `json:"outputJson,omitempty" db:"output_json"`
	RiskLevel         *string         `json:"riskLevel,omitempty" db:"risk_level"`
	ValidatorResult   json.RawMessage `json:"validatorResult,omitempty" db:"validator_result"`
	Blocked           bool            `json:"blocked" db:"blocked"`
	LatencyMs         *int            `json:"latencyMs,omitempty" db:"latency_ms"`
	InputTokens       *int            `json:"inputTokens,omitempty" db:"input_tokens"`
	OutputTokens      *int            `json:"outputTokens,omitempty" db:"output_tokens"`
	CostMicros        *int64          `json:"costMicros,omitempty" db:"cost_micros"`
	CreatedBy         *string         `json:"createdBy,omitempty" db:"created_by"`
	RequestID         *string         `json:"requestId,omitempty" db:"request_id"`
	ErrorMessage      *string         `json:"errorMessage,omitempty" db:"error_message"`
	CreatedAt         time.Time       `json:"createdAt" db:"created_at"`
}

// CreateMarketSourceRequest is the admin request to persist AI-drafting
// provenance: the source article (deduped on TextHash) plus the generation-log
// entries that produced the draft. Server-set fields on Source (ID, CreatedAt,
// UpdatedAt) are ignored.
type CreateMarketSourceRequest struct {
	Source         ArticleSource     `json:"source"`
	GenerationLogs []AIGenerationLog `json:"generationLogs,omitempty"`
}

// CreateMarketSourceResponse returns the (deduped) article source id.
type CreateMarketSourceResponse struct {
	ArticleSourceID    string   `json:"articleSourceId"`
	AIGenerationLogIDs []string `json:"aiGenerationLogIds,omitempty"`
}

// AIBudgetStatus is the per-admin AI-drafting budget check (plan §17c). Rate is
// requests/minute; the spend cap is token-based (a robust, price-drift-free
// proxy summed from the generation logs). Caps come from env
// (AI_DRAFT_RATE_PER_MIN, AI_DRAFT_DAILY_TOKEN_CAP).
type AIBudgetStatus struct {
	Allowed            bool   `json:"allowed"`
	Reason             string `json:"reason,omitempty"`
	RequestsLastMinute int    `json:"requestsLastMinute"`
	RatePerMinute      int    `json:"ratePerMinute"`
	TokensToday        int64  `json:"tokensToday"`
	DailyTokenCap      int64  `json:"dailyTokenCap"`
}

// ReserveAIBudgetRequest reserves one draft attempt before model spend. The
// token estimate is conservative and allows the daily cap to fail closed under
// concurrent requests before provider cost is incurred.
type ReserveAIBudgetRequest struct {
	EstimatedInputTokens int `json:"estimatedInputTokens"`
}

// ResolveMarketRequest is the admin request to settle a market.
type ResolveMarketRequest struct {
	Result            MarketResult    `json:"result" validate:"required,oneof=yes no"`
	AttestationSource string          `json:"attestationSource" validate:"required"`
	AttestationID     *string         `json:"attestationId,omitempty"`
	AttestationData   json.RawMessage `json:"attestationData,omitempty"`
	Reason            *string         `json:"reason,omitempty"`
	// OverrideReason is required when the gateway detects a collateral
	// imbalance (reconciliation drift on this market). Empty/nil means
	// the admin isn't asserting an override; the gateway will reject the
	// settle if the invariant doesn't hold. A non-empty value lands on
	// the persisted Settlement row and drives the metrics override flag.
	OverrideReason *string `json:"overrideReason,omitempty"`
}

// PageMeta provides pagination metadata in list responses.
type PageMeta struct {
	Page     int  `json:"page"`
	PageSize int  `json:"pageSize"`
	Total    int  `json:"total"`
	HasNext  bool `json:"hasNext"`
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

// PricePoint is a single bucket in a market's price-history series.
// YesPriceCents is the volume-weighted mean YES price across all trades
// in the bucket; bucket boundaries are aligned to the requested
// resolution. Buckets with zero trades are carried forward from the
// previous known price so charts render a continuous line.
type PricePoint struct {
	BucketStart   time.Time `json:"bucketStart"`
	YesPriceCents int       `json:"yesPriceCents"`
	TradeCount    int       `json:"tradeCount"`
	VolumeCents   int64     `json:"volumeCents"`
}

// PriceHistoryRange is the set of time windows the
// /api/v1/markets/{id}/prices?range= query accepts. Each constant pairs
// the window with the bucket resolution we aggregate at — see
// PriceHistoryWindow for the (since, bucketSec) mapping.
type PriceHistoryRange string

const (
	PriceHistoryRange1H  PriceHistoryRange = "1h"
	PriceHistoryRange1D  PriceHistoryRange = "1d"
	PriceHistoryRange1W  PriceHistoryRange = "1w"
	PriceHistoryRange1M  PriceHistoryRange = "1m"
	PriceHistoryRangeAll PriceHistoryRange = "all"
)

// PriceHistoryResponse wraps the points + metadata so clients can render
// axes / labels without re-deriving the window.
type PriceHistoryResponse struct {
	MarketID  string       `json:"marketId"`
	Range     string       `json:"range"`
	Since     time.Time    `json:"since"`
	Until     time.Time    `json:"until"`
	BucketSec int          `json:"bucketSec"`
	Points    []PricePoint `json:"points"`
}

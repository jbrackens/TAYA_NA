package prediction

import (
	"context"
	"time"
)

// Repository defines the data access interface for the prediction platform.
// Implementations: sql_repository.go (PostgreSQL), inmemory_repository.go (testing).
type Repository interface {
	// Categories
	ListCategories(ctx context.Context, activeOnly bool) ([]Category, error)
	GetCategory(ctx context.Context, slug string) (*Category, error)
	CreateCategory(ctx context.Context, cat *Category) error

	// Series
	ListSeries(ctx context.Context, categoryID *string) ([]Series, error)
	GetSeries(ctx context.Context, id string) (*Series, error)
	CreateSeries(ctx context.Context, s *Series) error

	// Events
	ListEvents(ctx context.Context, filter EventFilter) ([]Event, int, error)
	GetEvent(ctx context.Context, id string) (*Event, error)
	CreateEvent(ctx context.Context, e *Event) error
	UpdateEventStatus(ctx context.Context, id string, status EventStatus) error

	// Markets
	ListMarkets(ctx context.Context, filter MarketFilter) ([]Market, int, error)
	GetMarket(ctx context.Context, id string) (*Market, error)
	GetMarketByTicker(ctx context.Context, ticker string) (*Market, error)
	CreateMarket(ctx context.Context, m *Market) error
	UpdateMarket(ctx context.Context, m *Market) error
	UpdateMarketStatus(ctx context.Context, id string, status MarketStatus) error
	ListMarketsToClose(ctx context.Context) ([]Market, error)
	ListMarketsToSettle(ctx context.Context) ([]Market, error)

	// Orders
	ListOrders(ctx context.Context, filter OrderFilter) ([]Order, int, error)
	GetOrder(ctx context.Context, id string) (*Order, error)
	GetOrderByIdempotencyKey(ctx context.Context, key string) (*Order, error)
	CreateOrder(ctx context.Context, o *Order) error
	UpdateOrder(ctx context.Context, o *Order) error
	PersistFilledOrder(ctx context.Context, order *Order, trade *Trade, position *Position, market *Market) error

	// Positions
	ListPositions(ctx context.Context, userID string) ([]Position, error)
	GetPosition(ctx context.Context, userID, marketID string, side OrderSide) (*Position, error)
	UpsertPosition(ctx context.Context, p *Position) error
	ListPositionsByMarket(ctx context.Context, marketID string) ([]Position, error)

	// Trades
	ListTrades(ctx context.Context, marketID string, limit int) ([]Trade, error)
	CreateTrade(ctx context.Context, t *Trade) error

	// Settlements
	GetSettlement(ctx context.Context, marketID string) (*Settlement, error)
	CreateSettlement(ctx context.Context, s *Settlement) error
	CreatePayout(ctx context.Context, p *Payout) error

	// Lifecycle events
	ListLifecycleEvents(ctx context.Context, marketID string) ([]LifecycleEvent, error)
	CreateLifecycleEvent(ctx context.Context, e *LifecycleEvent) error

	// API Keys
	ListAPIKeys(ctx context.Context, userID string) ([]APIKey, error)
	GetAPIKeyByPrefix(ctx context.Context, prefix string) (*APIKey, error)
	CreateAPIKey(ctx context.Context, k *APIKey) error
	DeactivateAPIKey(ctx context.Context, id string) error
	TouchAPIKeyLastUsed(ctx context.Context, id string) error

	// Portfolio
	GetPortfolioSummary(ctx context.Context, userID string) (*PortfolioSummary, error)
	ListSettledPositions(ctx context.Context, userID string, page, pageSize int) ([]Payout, int, error)

	// Discovery
	GetDiscovery(ctx context.Context) (*DiscoveryResponse, error)

	// Dashboard
	DashboardVolumeStatsSince(ctx context.Context, since time.Time, topMovers int) (*DashboardVolumeStats, error)
}

// AtomicFilledOrderPersister is an optional repository capability for commits
// that can join the wallet debit and prediction fill in one shared SQL
// transaction. SQLRepository implements this in DB mode.
type AtomicFilledOrderPersister interface {
	PersistFilledOrderAtomic(
		ctx context.Context,
		wallet WalletAdapter,
		userID string,
		totalCost int64,
		debitKey string,
		debitReason string,
		order *Order,
		trade *Trade,
		position *Position,
		market *Market,
	) error
}

// WalletCreditRequest describes a single wallet credit to apply while
// persisting a settlement or void transition.
type WalletCreditRequest struct {
	UserID         string
	AmountCents    int64
	IdempotencyKey string
	Reason         string
}

// ExchangeRepository is the optional repository capability surface for the
// binary exchange engine. SQLRepository implements it; in-memory fakes for
// tests may opt in by implementing the same methods. Callers should type-
// assert and degrade gracefully when not present (the AMM-only path doesn't
// need the order book API).
type ExchangeRepository interface {
	// GetOrderBook returns the L2 book for a market — yes/no bids and asks
	// with running totals, depth-capped at MaxOrderBookDepth.
	GetOrderBook(ctx context.Context, marketID string, depth int) (*OrderBook, error)

	// PersistMatchAtomic applies a match plan to the database in a single
	// transaction held under a per-market advisory lock. Trades, order
	// updates, position mutations, ledger entries, and market quote updates
	// all commit together or not at all.
	PersistMatchAtomic(ctx context.Context, walletAdapter ExchangeWalletAdapter, plan *MatchPlan) error

	// LoadMakersForSecondary returns resting opposite-action orders on the
	// same side, ordered by price-time priority. Used by the match engine
	// to find candidates for secondary same-side transfer.
	LoadMakersForSecondary(ctx context.Context, marketID string, takerSide OrderSide, takerAction OrderAction, takerLimit *int, limit int) ([]Order, error)

	// LoadMakersForIssuance returns resting Buy orders on the opposite side
	// whose price plus the taker's limit can mint a complementary pair
	// (sum >= 100). Used by the match engine for issuance.
	LoadMakersForIssuance(ctx context.Context, marketID string, otherSide OrderSide, takerLimit int, limit int) ([]Order, error)

	// RefreshMarketBestQuotes recomputes the market's top-of-book columns
	// from the current open-order partial indexes. Called after a match
	// commits so `market:<id>` subscribers see updated bid/ask without
	// re-aggregating client-side.
	RefreshMarketBestQuotes(ctx context.Context, marketID string) error

	// ReconcileMarket runs a two-phase collateral invariant check for a
	// market. Phase 1 reads without a lock; Phase 2 only runs if Phase 1
	// suspects drift, takes the per-market advisory lock briefly, and
	// writes a forensic ledger entry. See reconciliation.go for details.
	ReconcileMarket(ctx context.Context, marketID string) (*CollateralDriftReport, error)

	// ListRecentDriftAlerts returns markets that had collateral
	// `adjustment` ledger entries written since `since`. One row per
	// market; aggregates count, max drift, total drift, and most recent
	// adjustment timestamp. Used by the backoffice ops page to surface
	// markets needing investigation.
	ListRecentDriftAlerts(ctx context.Context, since time.Time) ([]CollateralDriftAlert, error)
}

// AtomicMarketSettlementPersister is an optional repository capability for
// market settlement/void flows that need wallet credits and prediction writes
// to commit together.
//
// loyalty + accruals are optional — passing nil/empty disables loyalty
// accrual in the settlement flow (test fakes + legacy callers stay unchanged).
// The persister returns per-accrual results so the caller can fire
// post-commit WebSocket events (e.g. TierPromoted) after a successful tx.
type AtomicMarketSettlementPersister interface {
	PersistResolvedMarketAtomic(
		ctx context.Context,
		wallet WalletAdapter,
		market *Market,
		settlement *Settlement,
		payouts []Payout,
		credits []WalletCreditRequest,
		loyalty LoyaltyAdapter,
		accruals []LoyaltyAccrualRequest,
		lifecycle *LifecycleEvent,
	) ([]LoyaltyAccrualResult, error)
	PersistVoidedMarketAtomic(
		ctx context.Context,
		wallet WalletAdapter,
		market *Market,
		payouts []Payout,
		credits []WalletCreditRequest,
		lifecycle *LifecycleEvent,
	) error
}

// EventFilter provides filtering options for listing events.
type EventFilter struct {
	CategoryID *string
	Status     *EventStatus
	Featured   *bool
	SeriesID   *string
	Page       int
	PageSize   int
}

// MarketFilter provides filtering options for listing markets.
type MarketFilter struct {
	EventID     *string
	CategoryID  *string
	Status      *MarketStatus
	Ticker      *string
	CloseBefore *time.Time
	Page        int
	PageSize    int
}

// OrderFilter provides filtering options for listing orders.
type OrderFilter struct {
	UserID   string
	MarketID *string
	Status   *OrderStatus
	Page     int
	PageSize int
}

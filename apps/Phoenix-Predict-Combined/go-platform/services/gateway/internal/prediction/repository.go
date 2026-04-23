package prediction

import "context"

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
	EventID    *string
	CategoryID *string
	Status     *MarketStatus
	Ticker     *string
	Page       int
	PageSize   int
}

// OrderFilter provides filtering options for listing orders.
type OrderFilter struct {
	UserID   string
	MarketID *string
	Status   *OrderStatus
	Page     int
	PageSize int
}

package cache

import (
	"fmt"
)

// InvalidationHandler provides methods to invalidate cache based on write operations
type InvalidationHandler struct {
	cached *CachedReadRepository
}

// NewInvalidationHandler creates a new invalidation handler
func NewInvalidationHandler(cached *CachedReadRepository) *InvalidationHandler {
	return &InvalidationHandler{
		cached: cached,
	}
}

// InvalidateOnBetPlaced invalidates caches affected by a new bet placement
// - Invalidates punter profile (wallet changed)
// - Invalidates market (odds might have changed)
func (h *InvalidationHandler) InvalidateOnBetPlaced(punterID, marketID string) error {
	if err := h.cached.InvalidatePunter(punterID); err != nil {
		return fmt.Errorf("failed to invalidate punter on bet placement: %w", err)
	}

	if err := h.cached.InvalidateMarket(marketID); err != nil {
		return fmt.Errorf("failed to invalidate market on bet placement: %w", err)
	}

	return nil
}

// InvalidateOnMarketUpdate invalidates caches affected by a market update
// - Invalidates market itself
// - Invalidates fixture (in case of status changes)
func (h *InvalidationHandler) InvalidateOnMarketUpdate(marketID, fixtureID string) error {
	if err := h.cached.InvalidateMarket(marketID); err != nil {
		return fmt.Errorf("failed to invalidate market on update: %w", err)
	}

	if fixtureID != "" {
		if err := h.cached.InvalidateFixture(fixtureID); err != nil {
			return fmt.Errorf("failed to invalidate fixture on market update: %w", err)
		}
	}

	return nil
}

// InvalidateOnWalletChange invalidates caches affected by a wallet change
// - Invalidates punter profile
func (h *InvalidationHandler) InvalidateOnWalletChange(punterID string) error {
	if err := h.cached.InvalidatePunter(punterID); err != nil {
		return fmt.Errorf("failed to invalidate punter on wallet change: %w", err)
	}

	return nil
}

// InvalidateOnFixtureUpdate invalidates caches affected by a fixture update
// - Invalidates fixture
// - Invalidates all markets for that fixture
func (h *InvalidationHandler) InvalidateOnFixtureUpdate(fixtureID string) error {
	if err := h.cached.InvalidateFixture(fixtureID); err != nil {
		return fmt.Errorf("failed to invalidate fixture on update: %w", err)
	}

	if err := h.cached.InvalidateMarketsForFixture(fixtureID); err != nil {
		return fmt.Errorf("failed to invalidate markets for fixture on update: %w", err)
	}

	return nil
}

// InvalidateOnOddsUpdate invalidates caches affected by odds updates
// - Invalidates market
func (h *InvalidationHandler) InvalidateOnOddsUpdate(marketID string) error {
	if err := h.cached.InvalidateMarket(marketID); err != nil {
		return fmt.Errorf("failed to invalidate market on odds update: %w", err)
	}

	return nil
}

// InvalidateOnBetCashout invalidates caches affected by a cashout
// - Invalidates punter profile (wallet changed)
func (h *InvalidationHandler) InvalidateOnBetCashout(punterID string) error {
	if err := h.cached.InvalidatePunter(punterID); err != nil {
		return fmt.Errorf("failed to invalidate punter on cashout: %w", err)
	}

	return nil
}

// CacheInvalidatorMiddleware wraps operations that should invalidate cache
type CacheInvalidatorMiddleware struct {
	handler *InvalidationHandler
}

// NewCacheInvalidatorMiddleware creates middleware for cache invalidation
func NewCacheInvalidatorMiddleware(handler *InvalidationHandler) *CacheInvalidatorMiddleware {
	return &CacheInvalidatorMiddleware{
		handler: handler,
	}
}

// WithBetPlacementInvalidation wraps a bet placement operation with cache invalidation
func (m *CacheInvalidatorMiddleware) WithBetPlacementInvalidation(punterID, marketID string, op func() error) error {
	if err := op(); err != nil {
		return err
	}

	// Invalidate after successful operation
	return m.handler.InvalidateOnBetPlaced(punterID, marketID)
}

// WithMarketUpdateInvalidation wraps a market update operation with cache invalidation
func (m *CacheInvalidatorMiddleware) WithMarketUpdateInvalidation(marketID, fixtureID string, op func() error) error {
	if err := op(); err != nil {
		return err
	}

	// Invalidate after successful operation
	return m.handler.InvalidateOnMarketUpdate(marketID, fixtureID)
}

// WithWalletChangeInvalidation wraps a wallet change operation with cache invalidation
func (m *CacheInvalidatorMiddleware) WithWalletChangeInvalidation(punterID string, op func() error) error {
	if err := op(); err != nil {
		return err
	}

	// Invalidate after successful operation
	return m.handler.InvalidateOnWalletChange(punterID)
}

// WithFixtureUpdateInvalidation wraps a fixture update operation with cache invalidation
func (m *CacheInvalidatorMiddleware) WithFixtureUpdateInvalidation(fixtureID string, op func() error) error {
	if err := op(); err != nil {
		return err
	}

	// Invalidate after successful operation
	return m.handler.InvalidateOnFixtureUpdate(fixtureID)
}

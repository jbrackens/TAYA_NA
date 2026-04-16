package cache

import (
	"context"
	"crypto/md5"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"phoenix-revival/gateway/internal/domain"
)

// TTL configuration for different entity types
const (
	FixtureListTTL   = 5 * time.Second
	SingleFixtureTTL = 10 * time.Second
	MarketWithSelTTL = 1 * time.Second
	SportsCatalogTTL = 1 * time.Hour
	PunterProfileTTL = 5 * time.Minute
	BetByIDTTL       = 30 * time.Second
)

// CachedReadRepository wraps any ReadRepository and adds caching via Redis
type CachedReadRepository struct {
	underlying domain.ReadRepository
	redis      *RedisClient
	metrics    *CacheMetrics
}

// NewCachedReadRepository creates a new cached repository that wraps an existing repository
func NewCachedReadRepository(underlying domain.ReadRepository, redis *RedisClient) *CachedReadRepository {
	return &CachedReadRepository{
		underlying: underlying,
		redis:      redis,
		metrics:    NewCacheMetrics(),
	}
}

// ListFixtures retrieves fixtures, checking cache first
func (c *CachedReadRepository) ListFixtures(filter domain.FixtureFilter, page domain.PageRequest) ([]domain.Fixture, domain.PageMeta, error) {
	key := c.fixtureListKey(filter, page)

	// Try cache
	var cached struct {
		Fixtures []domain.Fixture
		Meta     domain.PageMeta
	}

	if err := c.redis.Get(context.Background(), key, &cached); err == nil {
		c.metrics.RecordHit("fixture_list")
		return cached.Fixtures, cached.Meta, nil
	}

	c.metrics.RecordMiss("fixture_list")

	// Cache miss - fetch from underlying
	fixtures, meta, err := c.underlying.ListFixtures(filter, page)
	if err != nil {
		c.metrics.RecordError("fixture_list")
		return fixtures, meta, err
	}

	// Cache result
	toCache := struct {
		Fixtures []domain.Fixture
		Meta     domain.PageMeta
	}{
		Fixtures: fixtures,
		Meta:     meta,
	}

	if err := c.redis.Set(context.Background(), key, toCache, FixtureListTTL); err != nil {
		c.metrics.RecordError("fixture_list")
		// Don't fail the request, just log
	}

	return fixtures, meta, nil
}

// GetFixtureByID retrieves a single fixture by ID, checking cache first
func (c *CachedReadRepository) GetFixtureByID(id string) (domain.Fixture, error) {
	key := c.fixtureKey(id)

	var cached domain.Fixture
	if err := c.redis.Get(context.Background(), key, &cached); err == nil {
		c.metrics.RecordHit("fixture")
		return cached, nil
	}

	c.metrics.RecordMiss("fixture")

	// Cache miss - fetch from underlying
	fixture, err := c.underlying.GetFixtureByID(id)
	if err != nil {
		c.metrics.RecordError("fixture")
		return fixture, err
	}

	// Cache result
	if err := c.redis.Set(context.Background(), key, fixture, SingleFixtureTTL); err != nil {
		c.metrics.RecordError("fixture")
		// Don't fail the request, just log
	}

	return fixture, nil
}

// ListMarkets retrieves markets, checking cache first
func (c *CachedReadRepository) ListMarkets(filter domain.MarketFilter, page domain.PageRequest) ([]domain.Market, domain.PageMeta, error) {
	key := c.marketListKey(filter, page)

	// Try cache
	var cached struct {
		Markets []domain.Market
		Meta    domain.PageMeta
	}

	if err := c.redis.Get(context.Background(), key, &cached); err == nil {
		c.metrics.RecordHit("market_list")
		return cached.Markets, cached.Meta, nil
	}

	c.metrics.RecordMiss("market_list")

	// Cache miss - fetch from underlying
	markets, meta, err := c.underlying.ListMarkets(filter, page)
	if err != nil {
		c.metrics.RecordError("market_list")
		return markets, meta, err
	}

	// Cache result
	toCache := struct {
		Markets []domain.Market
		Meta    domain.PageMeta
	}{
		Markets: markets,
		Meta:    meta,
	}

	if err := c.redis.Set(context.Background(), key, toCache, MarketWithSelTTL); err != nil {
		c.metrics.RecordError("market_list")
		// Don't fail the request, just log
	}

	return markets, meta, nil
}

// GetMarketByID retrieves a single market by ID (with selections), checking cache first
func (c *CachedReadRepository) GetMarketByID(id string) (domain.Market, error) {
	key := c.marketKey(id)

	var cached domain.Market
	if err := c.redis.Get(context.Background(), key, &cached); err == nil {
		c.metrics.RecordHit("market")
		return cached, nil
	}

	c.metrics.RecordMiss("market")

	// Cache miss - fetch from underlying
	market, err := c.underlying.GetMarketByID(id)
	if err != nil {
		c.metrics.RecordError("market")
		return market, err
	}

	// Cache result
	if err := c.redis.Set(context.Background(), key, market, MarketWithSelTTL); err != nil {
		c.metrics.RecordError("market")
		// Don't fail the request, just log
	}

	return market, nil
}

// ListPunters retrieves punters, checking cache first
func (c *CachedReadRepository) ListPunters(filter domain.PunterFilter, page domain.PageRequest) ([]domain.Punter, domain.PageMeta, error) {
	key := c.punterListKey(filter, page)

	// Try cache
	var cached struct {
		Punters []domain.Punter
		Meta    domain.PageMeta
	}

	if err := c.redis.Get(context.Background(), key, &cached); err == nil {
		c.metrics.RecordHit("punter_list")
		return cached.Punters, cached.Meta, nil
	}

	c.metrics.RecordMiss("punter_list")

	// Cache miss - fetch from underlying
	punters, meta, err := c.underlying.ListPunters(filter, page)
	if err != nil {
		c.metrics.RecordError("punter_list")
		return punters, meta, err
	}

	// Cache result
	toCache := struct {
		Punters []domain.Punter
		Meta    domain.PageMeta
	}{
		Punters: punters,
		Meta:    meta,
	}

	if err := c.redis.Set(context.Background(), key, toCache, PunterProfileTTL); err != nil {
		c.metrics.RecordError("punter_list")
		// Don't fail the request, just log
	}

	return punters, meta, nil
}

// GetPunterByID retrieves a single punter by ID, checking cache first
func (c *CachedReadRepository) GetPunterByID(id string) (domain.Punter, error) {
	key := c.punterKey(id)

	var cached domain.Punter
	if err := c.redis.Get(context.Background(), key, &cached); err == nil {
		c.metrics.RecordHit("punter")
		return cached, nil
	}

	c.metrics.RecordMiss("punter")

	// Cache miss - fetch from underlying
	punter, err := c.underlying.GetPunterByID(id)
	if err != nil {
		c.metrics.RecordError("punter")
		return punter, err
	}

	// Cache result
	if err := c.redis.Set(context.Background(), key, punter, PunterProfileTTL); err != nil {
		c.metrics.RecordError("punter")
		// Don't fail the request, just log
	}

	return punter, nil
}

func (c *CachedReadRepository) UpdatePunterStatus(id string, status string) (domain.Punter, error) {
	writable, ok := c.underlying.(domain.PunterWriteRepository)
	if !ok {
		return domain.Punter{}, errors.New("punter write repository unavailable")
	}

	punter, err := writable.UpdatePunterStatus(id, status)
	if err != nil {
		c.metrics.RecordError("punter")
		return domain.Punter{}, err
	}

	_ = c.InvalidatePunter(id)
	_ = c.InvalidateAllPunters()

	return punter, nil
}

// InvalidateFixture invalidates cache for a single fixture
func (c *CachedReadRepository) InvalidateFixture(fixtureID string) error {
	key := c.fixtureKey(fixtureID)
	return c.redis.Delete(context.Background(), key)
}

// InvalidateAllFixtures invalidates all fixture list caches
func (c *CachedReadRepository) InvalidateAllFixtures() error {
	// This is a broad invalidation - in production, you might want to track all keys
	// For now, we'll just document this limitation
	return nil
}

// InvalidateMarket invalidates cache for a single market
func (c *CachedReadRepository) InvalidateMarket(marketID string) error {
	key := c.marketKey(marketID)
	return c.redis.Delete(context.Background(), key)
}

// InvalidateMarketsForFixture invalidates all market caches for a fixture
func (c *CachedReadRepository) InvalidateMarketsForFixture(fixtureID string) error {
	// Broad invalidation - in production, track all related keys
	return nil
}

// InvalidatePunter invalidates cache for a single punter
func (c *CachedReadRepository) InvalidatePunter(punterID string) error {
	key := c.punterKey(punterID)
	return c.redis.Delete(context.Background(), key)
}

// InvalidateAllPunters invalidates all punter list caches.
func (c *CachedReadRepository) InvalidateAllPunters() error {
	return c.redis.DeleteByPrefix(context.Background(), "punter:list:")
}

// Metrics returns the cache metrics
func (c *CachedReadRepository) Metrics() *CacheMetrics {
	return c.metrics
}

// Key generation helpers

func (c *CachedReadRepository) fixtureKey(id string) string {
	return fmt.Sprintf("fixture:%s", id)
}

func (c *CachedReadRepository) fixtureListKey(filter domain.FixtureFilter, page domain.PageRequest) string {
	hash := c.hashFilterAndPage(
		fmt.Sprintf("tournament:%s", filter.Tournament),
		fmt.Sprintf("page:%d:size:%d", page.Page, page.PageSize),
		fmt.Sprintf("sort:%s:%s", page.SortBy, page.SortDir),
	)
	return fmt.Sprintf("fixture:list:%s", hash)
}

func (c *CachedReadRepository) marketKey(id string) string {
	return fmt.Sprintf("market:%s", id)
}

func (c *CachedReadRepository) marketListKey(filter domain.MarketFilter, page domain.PageRequest) string {
	hash := c.hashFilterAndPage(
		fmt.Sprintf("fixture:%s", filter.FixtureID),
		fmt.Sprintf("status:%s", filter.Status),
		fmt.Sprintf("page:%d:size:%d", page.Page, page.PageSize),
		fmt.Sprintf("sort:%s:%s", page.SortBy, page.SortDir),
	)
	return fmt.Sprintf("market:list:%s", hash)
}

func (c *CachedReadRepository) punterKey(id string) string {
	return fmt.Sprintf("punter:%s", id)
}

func (c *CachedReadRepository) punterListKey(filter domain.PunterFilter, page domain.PageRequest) string {
	hash := c.hashFilterAndPage(
		fmt.Sprintf("status:%s", filter.Status),
		fmt.Sprintf("search:%s", filter.Search),
		fmt.Sprintf("page:%d:size:%d", page.Page, page.PageSize),
		fmt.Sprintf("sort:%s:%s", page.SortBy, page.SortDir),
	)
	return fmt.Sprintf("punter:list:%s", hash)
}

func (c *CachedReadRepository) hashFilterAndPage(parts ...string) string {
	h := md5.New()
	for _, part := range parts {
		h.Write([]byte(part))
	}
	return hex.EncodeToString(h.Sum(nil))
}

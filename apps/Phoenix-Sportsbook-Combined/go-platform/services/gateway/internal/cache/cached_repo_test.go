package cache

import (
	"testing"

	"phoenix-revival/gateway/internal/domain"
)

// MockReadRepository is a simple mock implementation for testing
type MockReadRepository struct {
	fixtures map[string]domain.Fixture
	markets  map[string]domain.Market
	punters  map[string]domain.Punter
	callLog  []string
}

func NewMockReadRepository() *MockReadRepository {
	return &MockReadRepository{
		fixtures: make(map[string]domain.Fixture),
		markets:  make(map[string]domain.Market),
		punters:  make(map[string]domain.Punter),
		callLog:  make([]string, 0),
	}
}

func (m *MockReadRepository) ListFixtures(filter domain.FixtureFilter, page domain.PageRequest) ([]domain.Fixture, domain.PageMeta, error) {
	m.callLog = append(m.callLog, "ListFixtures")
	fixtures := make([]domain.Fixture, 0, len(m.fixtures))
	for _, f := range m.fixtures {
		if filter.Tournament == "" || filter.Tournament == f.Tournament {
			fixtures = append(fixtures, f)
		}
	}
	return fixtures, domain.PageMeta{Page: page.Page, PageSize: page.PageSize, Total: len(fixtures)}, nil
}

func (m *MockReadRepository) GetFixtureByID(id string) (domain.Fixture, error) {
	m.callLog = append(m.callLog, "GetFixtureByID:"+id)
	if f, ok := m.fixtures[id]; ok {
		return f, nil
	}
	return domain.Fixture{}, domain.ErrNotFound
}

func (m *MockReadRepository) ListMarkets(filter domain.MarketFilter, page domain.PageRequest) ([]domain.Market, domain.PageMeta, error) {
	m.callLog = append(m.callLog, "ListMarkets")
	markets := make([]domain.Market, 0, len(m.markets))
	for _, mk := range m.markets {
		if (filter.FixtureID == "" || filter.FixtureID == mk.FixtureID) &&
			(filter.Status == "" || filter.Status == mk.Status) {
			markets = append(markets, mk)
		}
	}
	return markets, domain.PageMeta{Page: page.Page, PageSize: page.PageSize, Total: len(markets)}, nil
}

func (m *MockReadRepository) GetMarketByID(id string) (domain.Market, error) {
	m.callLog = append(m.callLog, "GetMarketByID:"+id)
	if mk, ok := m.markets[id]; ok {
		return mk, nil
	}
	return domain.Market{}, domain.ErrNotFound
}

func (m *MockReadRepository) ListPunters(filter domain.PunterFilter, page domain.PageRequest) ([]domain.Punter, domain.PageMeta, error) {
	m.callLog = append(m.callLog, "ListPunters")
	punters := make([]domain.Punter, 0, len(m.punters))
	for _, p := range m.punters {
		if filter.Status == "" || filter.Status == p.Status {
			punters = append(punters, p)
		}
	}
	return punters, domain.PageMeta{Page: page.Page, PageSize: page.PageSize, Total: len(punters)}, nil
}

func (m *MockReadRepository) GetPunterByID(id string) (domain.Punter, error) {
	m.callLog = append(m.callLog, "GetPunterByID:"+id)
	if p, ok := m.punters[id]; ok {
		return p, nil
	}
	return domain.Punter{}, domain.ErrNotFound
}

func TestCachedRepositoryFixtureCaching(t *testing.T) {
	redis, err := NewRedisClient("localhost:6379")
	if err != nil {
		t.Skipf("Redis not available: %v", err)
	}
	defer redis.Close()

	mock := NewMockReadRepository()
	mock.fixtures["f1"] = domain.Fixture{
		ID:         "f1",
		Tournament: "Premier League",
		HomeTeam:   "Liverpool",
		AwayTeam:   "Arsenal",
	}

	cached := NewCachedReadRepository(mock, redis)

	// First call should hit underlying
	fixture1, err := cached.GetFixtureByID("f1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if fixture1.ID != "f1" {
		t.Errorf("expected fixture ID f1, got %s", fixture1.ID)
	}

	// Verify underlying was called
	if len(mock.callLog) != 1 || mock.callLog[0] != "GetFixtureByID:f1" {
		t.Errorf("expected 1 call to underlying repo, got %v", mock.callLog)
	}

	// Second call should hit cache
	mock.callLog = nil
	fixture2, err := cached.GetFixtureByID("f1")
	if err != nil {
		t.Fatalf("unexpected error on second call: %v", err)
	}
	if fixture2.ID != "f1" {
		t.Errorf("expected fixture ID f1, got %s", fixture2.ID)
	}

	// Verify underlying was NOT called this time
	if len(mock.callLog) != 0 {
		t.Errorf("expected 0 calls to underlying repo on cache hit, got %v", mock.callLog)
	}

	// Check metrics
	metrics := cached.Metrics().Snapshot()
	if len(metrics) != 1 {
		t.Errorf("expected 1 metric, got %d", len(metrics))
	}
	if metrics[0].Hits != 1 || metrics[0].Misses != 1 {
		t.Errorf("expected 1 hit and 1 miss, got hits=%d misses=%d", metrics[0].Hits, metrics[0].Misses)
	}
}

func TestCachedRepositoryMarketCaching(t *testing.T) {
	redis, err := NewRedisClient("localhost:6379")
	if err != nil {
		t.Skipf("Redis not available: %v", err)
	}
	defer redis.Close()

	mock := NewMockReadRepository()
	mock.markets["m1"] = domain.Market{
		ID:        "m1",
		FixtureID: "f1",
		Name:      "Match Winner",
		Status:    "open",
		Selections: []domain.MarketSelection{
			{ID: "home", Name: "Liverpool", Odds: 1.8},
			{ID: "away", Name: "Arsenal", Odds: 2.2},
		},
	}

	cached := NewCachedReadRepository(mock, redis)

	// First call
	market1, err := cached.GetMarketByID("m1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if market1.ID != "m1" {
		t.Errorf("expected market ID m1, got %s", market1.ID)
	}
	if len(market1.Selections) != 2 {
		t.Errorf("expected 2 selections, got %d", len(market1.Selections))
	}

	// Second call from cache
	mock.callLog = nil
	market2, err := cached.GetMarketByID("m1")
	if err != nil {
		t.Fatalf("unexpected error on second call: %v", err)
	}
	if market2.ID != "m1" {
		t.Errorf("expected market ID m1, got %s", market2.ID)
	}
	if len(market2.Selections) != 2 {
		t.Errorf("expected 2 selections, got %d", len(market2.Selections))
	}

	// Verify cache hit
	if len(mock.callLog) != 0 {
		t.Errorf("expected 0 calls to underlying repo on cache hit, got %v", mock.callLog)
	}
}

func TestCachedRepositoryInvalidation(t *testing.T) {
	redis, err := NewRedisClient("localhost:6379")
	if err != nil {
		t.Skipf("Redis not available: %v", err)
	}
	defer redis.Close()

	mock := NewMockReadRepository()
	mock.fixtures["f1"] = domain.Fixture{
		ID:         "f1",
		Tournament: "Premier League",
	}

	cached := NewCachedReadRepository(mock, redis)

	// Cache the fixture
	_, err = cached.GetFixtureByID("f1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Verify it was cached
	mock.callLog = nil
	_, err = cached.GetFixtureByID("f1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(mock.callLog) != 0 {
		t.Errorf("expected cache hit before invalidation")
	}

	// Invalidate
	if err := cached.InvalidateFixture("f1"); err != nil {
		t.Fatalf("failed to invalidate: %v", err)
	}

	// Next call should hit underlying again
	mock.callLog = nil
	_, err = cached.GetFixtureByID("f1")
	if err != nil {
		t.Fatalf("unexpected error after invalidation: %v", err)
	}
	if len(mock.callLog) != 1 || mock.callLog[0] != "GetFixtureByID:f1" {
		t.Errorf("expected underlying to be called after invalidation, got %v", mock.callLog)
	}
}

func TestCachedRepositoryListFixtures(t *testing.T) {
	redis, err := NewRedisClient("localhost:6379")
	if err != nil {
		t.Skipf("Redis not available: %v", err)
	}
	defer redis.Close()

	mock := NewMockReadRepository()
	mock.fixtures["f1"] = domain.Fixture{
		ID:         "f1",
		Tournament: "Premier League",
	}
	mock.fixtures["f2"] = domain.Fixture{
		ID:         "f2",
		Tournament: "La Liga",
	}

	cached := NewCachedReadRepository(mock, redis)

	// First list call
	fixtures1, meta1, err := cached.ListFixtures(
		domain.FixtureFilter{},
		domain.PageRequest{Page: 1, PageSize: 10},
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(fixtures1) != 2 {
		t.Errorf("expected 2 fixtures, got %d", len(fixtures1))
	}

	// Second list call should hit cache
	mock.callLog = nil
	fixtures2, meta2, err := cached.ListFixtures(
		domain.FixtureFilter{},
		domain.PageRequest{Page: 1, PageSize: 10},
	)
	if err != nil {
		t.Fatalf("unexpected error on second call: %v", err)
	}
	if len(fixtures2) != 2 {
		t.Errorf("expected 2 fixtures, got %d", len(fixtures2))
	}

	// Verify cache hit
	if len(mock.callLog) != 0 {
		t.Errorf("expected 0 calls to underlying repo on cache hit, got %v", mock.callLog)
	}

	// Different pagination should miss cache
	mock.callLog = nil
	fixtures3, _, err := cached.ListFixtures(
		domain.FixtureFilter{},
		domain.PageRequest{Page: 2, PageSize: 10},
	)
	if err != nil {
		t.Fatalf("unexpected error on page 2: %v", err)
	}

	// Should have called underlying because pagination is different
	if len(mock.callLog) != 1 {
		t.Errorf("expected 1 call for different pagination, got %v", mock.callLog)
	}

	_ = meta1
	_ = meta2
	_ = fixtures3
}

func TestCacheMetrics(t *testing.T) {
	metrics := NewCacheMetrics()

	// Record some hits and misses
	metrics.RecordHit("fixture")
	metrics.RecordHit("fixture")
	metrics.RecordMiss("fixture")
	metrics.RecordError("fixture")

	metrics.RecordHit("market")
	metrics.RecordHit("market")
	metrics.RecordHit("market")
	metrics.RecordMiss("market")

	snapshot := metrics.Snapshot()
	if len(snapshot) != 2 {
		t.Errorf("expected 2 metrics, got %d", len(snapshot))
	}

	// Check fixture metrics
	var fixtureMetric CacheMetric
	for _, m := range snapshot {
		if m.Entity == "fixture" {
			fixtureMetric = m
		}
	}

	if fixtureMetric.Hits != 2 {
		t.Errorf("expected 2 hits for fixture, got %d", fixtureMetric.Hits)
	}
	if fixtureMetric.Misses != 1 {
		t.Errorf("expected 1 miss for fixture, got %d", fixtureMetric.Misses)
	}
	if fixtureMetric.Errors != 1 {
		t.Errorf("expected 1 error for fixture, got %d", fixtureMetric.Errors)
	}

	// Hit rate should be 2/3
	expectedRate := float64(2) / float64(3)
	if fixtureMetric.HitRate < expectedRate-0.01 || fixtureMetric.HitRate > expectedRate+0.01 {
		t.Errorf("expected hit rate ~%.4f, got %.4f", expectedRate, fixtureMetric.HitRate)
	}
}

func TestCacheInvalidationHandler(t *testing.T) {
	redis, err := NewRedisClient("localhost:6379")
	if err != nil {
		t.Skipf("Redis not available: %v", err)
	}
	defer redis.Close()

	mock := NewMockReadRepository()
	mock.punters["p1"] = domain.Punter{
		ID:    "p1",
		Email: "test@example.com",
	}

	cached := NewCachedReadRepository(mock, redis)
	handler := NewInvalidationHandler(cached)

	// Cache the punter
	_, err = cached.GetPunterByID("p1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Verify cached
	mock.callLog = nil
	_, err = cached.GetPunterByID("p1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(mock.callLog) != 0 {
		t.Errorf("expected cache hit")
	}

	// Invalidate via handler
	err = handler.InvalidateOnWalletChange("p1")
	if err != nil {
		t.Fatalf("failed to invalidate: %v", err)
	}

	// Should hit underlying now
	mock.callLog = nil
	_, err = cached.GetPunterByID("p1")
	if err != nil {
		t.Fatalf("unexpected error after invalidation: %v", err)
	}
	if len(mock.callLog) != 1 {
		t.Errorf("expected underlying to be called, got %v", mock.callLog)
	}
}

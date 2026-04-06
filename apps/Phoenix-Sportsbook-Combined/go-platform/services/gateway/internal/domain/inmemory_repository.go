package domain

import (
	"sort"
	"strings"
	"sync"
)

const (
	defaultPage     = 1
	defaultPageSize = 20
	maxPageSize     = 100
)

type InMemoryReadRepository struct {
	mu       sync.RWMutex
	fixtures []Fixture
	markets  []Market
	punters  []Punter
}

func NewInMemoryReadRepository() *InMemoryReadRepository {
	return &InMemoryReadRepository{
		fixtures: []Fixture{
			{
				ID:         "f:local:001",
				SportKey:   "esports",
				Tournament: "Premier League",
				LeagueKey:  "premier-league",
				HomeTeam:   "Team Alpha",
				AwayTeam:   "Team Beta",
				StartsAt:   "2026-04-10T20:00:00Z",
			},
			{
				ID:         "f:local:002",
				SportKey:   "esports",
				Tournament: "Champions League",
				LeagueKey:  "champions-league",
				HomeTeam:   "Team Gamma",
				AwayTeam:   "Team Delta",
				StartsAt:   "2026-04-11T19:45:00Z",
			},
		},
		markets: []Market{
			{
				ID:        "m:local:001",
				FixtureID: "f:local:001",
				Name:      "Match Winner",
				Status:    "open",
				StartsAt:  "2026-04-10T20:00:00Z",
				Selections: []MarketSelection{
					{ID: "home", Name: "Team Alpha", Odds: 1.8, Active: true},
					{ID: "away", Name: "Team Beta", Odds: 2.2, Active: true},
					{ID: "draw", Name: "Draw", Odds: 3.15, Active: true},
				},
				MinStakeCents: 100,
				MaxStakeCents: 1000000,
			},
			{
				ID:        "m:local:002",
				FixtureID: "f:local:001",
				Name:      "Over/Under 2.5 Goals",
				Status:    "open",
				StartsAt:  "2026-04-10T20:00:00Z",
				Selections: []MarketSelection{
					{ID: "over", Name: "Over 2.5", Odds: 1.95, Active: true},
					{ID: "under", Name: "Under 2.5", Odds: 1.9, Active: true},
				},
				MinStakeCents: 100,
				MaxStakeCents: 1000000,
			},
			{
				ID:        "m:local:003",
				FixtureID: "f:local:002",
				Name:      "Both Teams To Score",
				Status:    "suspended",
				StartsAt:  "2026-04-11T19:45:00Z",
				Selections: []MarketSelection{
					{ID: "yes", Name: "Yes", Odds: 2.2, Active: true},
					{ID: "no", Name: "No", Odds: 1.62, Active: true},
				},
				MinStakeCents: 100,
				MaxStakeCents: 1000000,
			},
		},
		punters: []Punter{
			{
				ID:          "p:local:001",
				Email:       "alice@example.com",
				Status:      "active",
				CountryCode: "MT",
				CreatedAt:   "2026-01-10T09:15:00Z",
				LastLoginAt: "2026-03-02T10:30:00Z",
			},
			{
				ID:          "p:local:002",
				Email:       "bob@example.com",
				Status:      "suspended",
				CountryCode: "DE",
				CreatedAt:   "2026-01-21T14:05:00Z",
				LastLoginAt: "2026-02-27T16:45:00Z",
			},
			{
				ID:          "p:local:003",
				Email:       "charlie@example.com",
				Status:      "self_excluded",
				CountryCode: "SE",
				CreatedAt:   "2026-02-03T12:20:00Z",
				LastLoginAt: "2026-02-20T08:11:00Z",
			},
		},
	}
}

func (r *InMemoryReadRepository) ListFixtures(filter FixtureFilter, page PageRequest) ([]Fixture, PageMeta, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	filtered := make([]Fixture, 0, len(r.fixtures))
	for _, fixture := range r.fixtures {
		if filter.Tournament != "" && !strings.Contains(strings.ToLower(fixture.Tournament), strings.ToLower(filter.Tournament)) {
			continue
		}
		filtered = append(filtered, fixture)
	}

	sortFixtures(filtered, page.SortBy, page.SortDir)
	window, meta := paginateFixtures(filtered, page)
	return window, meta, nil
}

func (r *InMemoryReadRepository) GetFixtureByID(id string) (Fixture, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, f := range r.fixtures {
		if f.ID == id {
			return f, nil
		}
	}
	return Fixture{}, ErrNotFound
}

func (r *InMemoryReadRepository) ListMarkets(filter MarketFilter, page PageRequest) ([]Market, PageMeta, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	filtered := make([]Market, 0, len(r.markets))
	for _, market := range r.markets {
		if filter.FixtureID != "" && market.FixtureID != filter.FixtureID {
			continue
		}
		if filter.Status != "" && !strings.EqualFold(market.Status, filter.Status) {
			continue
		}
		filtered = append(filtered, market)
	}

	sortMarkets(filtered, page.SortBy, page.SortDir)
	window, meta := paginateMarkets(filtered, page)
	return window, meta, nil
}

func (r *InMemoryReadRepository) GetMarketByID(id string) (Market, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, m := range r.markets {
		if m.ID == id {
			return m, nil
		}
	}
	return Market{}, ErrNotFound
}

func (r *InMemoryReadRepository) ListPunters(filter PunterFilter, page PageRequest) ([]Punter, PageMeta, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	filtered := make([]Punter, 0, len(r.punters))
	search := strings.ToLower(strings.TrimSpace(filter.Search))
	for _, punter := range r.punters {
		if filter.Status != "" && !strings.EqualFold(punter.Status, filter.Status) {
			continue
		}
		if search != "" {
			email := strings.ToLower(punter.Email)
			id := strings.ToLower(punter.ID)
			if !strings.Contains(email, search) && !strings.Contains(id, search) {
				continue
			}
		}
		filtered = append(filtered, punter)
	}

	sortPunters(filtered, page.SortBy, page.SortDir)
	window, meta := paginatePunters(filtered, page)
	return window, meta, nil
}

func (r *InMemoryReadRepository) GetPunterByID(id string) (Punter, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, punter := range r.punters {
		if punter.ID == id {
			return punter, nil
		}
	}
	return Punter{}, ErrNotFound
}

func (r *InMemoryReadRepository) UpdatePunterStatus(id string, status string) (Punter, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	for index, punter := range r.punters {
		if punter.ID != id {
			continue
		}
		r.punters[index].Status = status
		return r.punters[index], nil
	}

	return Punter{}, ErrNotFound
}

func (r *InMemoryReadRepository) snapshot() readModelSnapshot {
	r.mu.RLock()
	defer r.mu.RUnlock()

	return readModelSnapshot{
		Fixtures: append([]Fixture(nil), r.fixtures...),
		Markets:  append([]Market(nil), r.markets...),
		Punters:  append([]Punter(nil), r.punters...),
	}
}

func sortFixtures(items []Fixture, sortBy string, sortDir string) {
	field := sortBy
	if field == "" {
		field = "startsAt"
	}
	desc := strings.EqualFold(sortDir, "desc")

	sort.SliceStable(items, func(i, j int) bool {
		left := fixtureSortValue(items[i], field)
		right := fixtureSortValue(items[j], field)
		if left == right {
			if desc {
				return items[i].ID > items[j].ID
			}
			return items[i].ID < items[j].ID
		}
		if desc {
			return left > right
		}
		return left < right
	})
}

func sortMarkets(items []Market, sortBy string, sortDir string) {
	field := sortBy
	if field == "" {
		field = "startsAt"
	}
	desc := strings.EqualFold(sortDir, "desc")

	sort.SliceStable(items, func(i, j int) bool {
		left := marketSortValue(items[i], field)
		right := marketSortValue(items[j], field)
		if left == right {
			if desc {
				return items[i].ID > items[j].ID
			}
			return items[i].ID < items[j].ID
		}
		if desc {
			return left > right
		}
		return left < right
	})
}

func sortPunters(items []Punter, sortBy string, sortDir string) {
	field := sortBy
	if field == "" {
		field = "createdAt"
	}
	desc := strings.EqualFold(sortDir, "desc")

	sort.SliceStable(items, func(i, j int) bool {
		left := punterSortValue(items[i], field)
		right := punterSortValue(items[j], field)
		if left == right {
			if desc {
				return items[i].ID > items[j].ID
			}
			return items[i].ID < items[j].ID
		}
		if desc {
			return left > right
		}
		return left < right
	})
}

func fixtureSortValue(item Fixture, field string) string {
	switch field {
	case "tournament":
		return strings.ToLower(item.Tournament)
	case "homeTeam":
		return strings.ToLower(item.HomeTeam)
	case "awayTeam":
		return strings.ToLower(item.AwayTeam)
	case "startsAt":
		fallthrough
	default:
		return item.StartsAt
	}
}

func marketSortValue(item Market, field string) string {
	switch field {
	case "name":
		return strings.ToLower(item.Name)
	case "status":
		return strings.ToLower(item.Status)
	case "fixtureId":
		return strings.ToLower(item.FixtureID)
	case "startsAt":
		fallthrough
	default:
		return item.StartsAt
	}
}

func punterSortValue(item Punter, field string) string {
	switch field {
	case "email":
		return strings.ToLower(item.Email)
	case "status":
		return strings.ToLower(item.Status)
	case "lastLoginAt":
		return item.LastLoginAt
	case "createdAt":
		fallthrough
	default:
		return item.CreatedAt
	}
}

func paginateFixtures(items []Fixture, req PageRequest) ([]Fixture, PageMeta) {
	normalized := normalizePageRequest(req)
	total := len(items)
	start := (normalized.Page - 1) * normalized.PageSize
	if start >= total {
		return []Fixture{}, PageMeta{
			Page:     normalized.Page,
			PageSize: normalized.PageSize,
			Total:    total,
			HasNext:  false,
		}
	}

	end := start + normalized.PageSize
	if end > total {
		end = total
	}

	out := make([]Fixture, end-start)
	copy(out, items[start:end])

	return out, PageMeta{
		Page:     normalized.Page,
		PageSize: normalized.PageSize,
		Total:    total,
		HasNext:  end < total,
	}
}

func paginateMarkets(items []Market, req PageRequest) ([]Market, PageMeta) {
	normalized := normalizePageRequest(req)
	total := len(items)
	start := (normalized.Page - 1) * normalized.PageSize
	if start >= total {
		return []Market{}, PageMeta{
			Page:     normalized.Page,
			PageSize: normalized.PageSize,
			Total:    total,
			HasNext:  false,
		}
	}

	end := start + normalized.PageSize
	if end > total {
		end = total
	}

	out := make([]Market, end-start)
	copy(out, items[start:end])

	return out, PageMeta{
		Page:     normalized.Page,
		PageSize: normalized.PageSize,
		Total:    total,
		HasNext:  end < total,
	}
}

func paginatePunters(items []Punter, req PageRequest) ([]Punter, PageMeta) {
	normalized := normalizePageRequest(req)
	total := len(items)
	start := (normalized.Page - 1) * normalized.PageSize
	if start >= total {
		return []Punter{}, PageMeta{
			Page:     normalized.Page,
			PageSize: normalized.PageSize,
			Total:    total,
			HasNext:  false,
		}
	}

	end := start + normalized.PageSize
	if end > total {
		end = total
	}

	out := make([]Punter, end-start)
	copy(out, items[start:end])

	return out, PageMeta{
		Page:     normalized.Page,
		PageSize: normalized.PageSize,
		Total:    total,
		HasNext:  end < total,
	}
}

func normalizePageRequest(req PageRequest) PageRequest {
	out := req
	if out.Page <= 0 {
		out.Page = defaultPage
	}
	if out.PageSize <= 0 {
		out.PageSize = defaultPageSize
	}
	if out.PageSize > maxPageSize {
		out.PageSize = maxPageSize
	}
	if out.SortDir == "" {
		out.SortDir = "asc"
	}
	return out
}

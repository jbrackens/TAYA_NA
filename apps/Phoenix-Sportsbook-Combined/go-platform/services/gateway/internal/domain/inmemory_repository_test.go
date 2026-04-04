package domain

import "testing"

func TestInMemoryRepositoryListMarketsFiltersAndPaginates(t *testing.T) {
	repository := NewInMemoryReadRepository()

	items, page, err := repository.ListMarkets(MarketFilter{
		FixtureID: "f:local:001",
		Status:    "open",
	}, PageRequest{
		Page:     1,
		PageSize: 1,
		SortBy:   "name",
		SortDir:  "asc",
	})
	if err != nil {
		t.Fatalf("list markets: %v", err)
	}

	if page.Total != 2 {
		t.Fatalf("expected total=2, got %d", page.Total)
	}
	if page.HasNext != true {
		t.Fatalf("expected hasNext=true")
	}
	if len(items) != 1 {
		t.Fatalf("expected 1 market on first page, got %d", len(items))
	}
	if items[0].Name != "Match Winner" {
		t.Fatalf("unexpected first market order: %s", items[0].Name)
	}
}

func TestInMemoryRepositoryListFixturesSortsByTournamentDesc(t *testing.T) {
	repository := NewInMemoryReadRepository()

	fixtures, page, err := repository.ListFixtures(FixtureFilter{}, PageRequest{
		Page:     1,
		PageSize: 10,
		SortBy:   "tournament",
		SortDir:  "desc",
	})
	if err != nil {
		t.Fatalf("list fixtures: %v", err)
	}

	if page.Total != 2 {
		t.Fatalf("expected total=2, got %d", page.Total)
	}
	if len(fixtures) != 2 {
		t.Fatalf("expected 2 fixtures, got %d", len(fixtures))
	}
	if fixtures[0].Tournament != "Premier League" {
		t.Fatalf("unexpected first tournament: %s", fixtures[0].Tournament)
	}
}

func TestInMemoryRepositoryGetFixtureByID(t *testing.T) {
	repository := NewInMemoryReadRepository()

	fixture, err := repository.GetFixtureByID("f:local:001")
	if err != nil {
		t.Fatalf("expected fixture, got error: %v", err)
	}
	if fixture.HomeTeam != "Team Alpha" {
		t.Fatalf("unexpected fixture home team: %s", fixture.HomeTeam)
	}
}

func TestInMemoryRepositoryListPuntersFiltersAndSearches(t *testing.T) {
	repository := NewInMemoryReadRepository()

	items, page, err := repository.ListPunters(PunterFilter{
		Status: "active",
		Search: "alice",
	}, PageRequest{
		Page:     1,
		PageSize: 10,
		SortBy:   "email",
		SortDir:  "asc",
	})
	if err != nil {
		t.Fatalf("list punters: %v", err)
	}
	if page.Total != 1 || len(items) != 1 {
		t.Fatalf("expected exactly one active punter search result")
	}
	if items[0].ID != "p:local:001" {
		t.Fatalf("unexpected punter id: %s", items[0].ID)
	}
}

func TestInMemoryRepositoryReturnsNotFound(t *testing.T) {
	repository := NewInMemoryReadRepository()

	_, err := repository.GetMarketByID("m:local:missing")
	if err == nil {
		t.Fatalf("expected not found error")
	}
	if err != ErrNotFound {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
}

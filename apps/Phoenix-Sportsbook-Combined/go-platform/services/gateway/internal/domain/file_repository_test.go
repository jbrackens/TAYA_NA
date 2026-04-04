package domain

import (
	"os"
	"path/filepath"
	"testing"
)

func TestFileReadRepositoryLoadsSnapshotAndSupportsQueries(t *testing.T) {
	snapshot := `{
  "fixtures": [
    {
      "id": "f:file:001",
      "tournament": "Serie A",
      "homeTeam": "Roma",
      "awayTeam": "Milan",
      "startsAt": "2026-03-07T19:45:00Z"
    }
  ],
  "markets": [
    {
      "id": "m:file:001",
      "fixtureId": "f:file:001",
      "name": "Match Winner",
      "status": "open",
      "startsAt": "2026-03-07T19:45:00Z"
    },
    {
      "id": "m:file:002",
      "fixtureId": "f:file:001",
      "name": "Over/Under 2.5 Goals",
      "status": "suspended",
      "startsAt": "2026-03-07T19:45:00Z"
    }
  ],
  "punters": [
    {
      "id": "p:file:001",
      "email": "admin-test@example.com",
      "status": "active",
      "countryCode": "MT",
      "createdAt": "2026-01-02T10:00:00Z",
      "lastLoginAt": "2026-03-01T10:00:00Z"
    }
  ]
}`

	path := filepath.Join(t.TempDir(), "read-model.json")
	if err := os.WriteFile(path, []byte(snapshot), 0o644); err != nil {
		t.Fatalf("write snapshot: %v", err)
	}

	repository, err := NewFileReadRepository(path)
	if err != nil {
		t.Fatalf("new file read repository: %v", err)
	}

	fixtures, fixturePage, err := repository.ListFixtures(FixtureFilter{}, PageRequest{Page: 1, PageSize: 10})
	if err != nil {
		t.Fatalf("list fixtures: %v", err)
	}
	if fixturePage.Total != 1 || len(fixtures) != 1 {
		t.Fatalf("expected one fixture loaded from file")
	}

	markets, marketPage, err := repository.ListMarkets(MarketFilter{Status: "open"}, PageRequest{Page: 1, PageSize: 10})
	if err != nil {
		t.Fatalf("list markets: %v", err)
	}
	if marketPage.Total != 1 || len(markets) != 1 {
		t.Fatalf("expected one open market loaded from file")
	}
	if markets[0].ID != "m:file:001" {
		t.Fatalf("unexpected market id: %s", markets[0].ID)
	}

	punters, punterPage, err := repository.ListPunters(PunterFilter{Status: "active"}, PageRequest{Page: 1, PageSize: 10})
	if err != nil {
		t.Fatalf("list punters: %v", err)
	}
	if punterPage.Total != 1 || len(punters) != 1 {
		t.Fatalf("expected one active punter loaded from file")
	}
	if punters[0].ID != "p:file:001" {
		t.Fatalf("unexpected punter id: %s", punters[0].ID)
	}
}

func TestFileReadRepositoryReturnsErrorForInvalidJSON(t *testing.T) {
	path := filepath.Join(t.TempDir(), "invalid.json")
	if err := os.WriteFile(path, []byte("{invalid"), 0o644); err != nil {
		t.Fatalf("write invalid file: %v", err)
	}

	if _, err := NewFileReadRepository(path); err == nil {
		t.Fatalf("expected invalid JSON error")
	}
}

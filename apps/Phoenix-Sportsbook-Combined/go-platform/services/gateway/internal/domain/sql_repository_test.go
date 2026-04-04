package domain

import "testing"

func TestSortDirection(t *testing.T) {
	if got := sortDirection("desc"); got != "DESC" {
		t.Fatalf("expected DESC, got %s", got)
	}
	if got := sortDirection("anything"); got != "ASC" {
		t.Fatalf("expected ASC fallback, got %s", got)
	}
}

func TestFixtureSortColumnWhitelist(t *testing.T) {
	if got := fixtureSortColumn("homeTeam"); got != "home_team" {
		t.Fatalf("expected home_team, got %s", got)
	}
	if got := fixtureSortColumn("badField"); got != "starts_at" {
		t.Fatalf("expected default starts_at, got %s", got)
	}
}

func TestMarketSortColumnWhitelist(t *testing.T) {
	if got := marketSortColumn("fixtureId"); got != "fixture_id" {
		t.Fatalf("expected fixture_id, got %s", got)
	}
	if got := marketSortColumn("badField"); got != "starts_at" {
		t.Fatalf("expected default starts_at, got %s", got)
	}
}

func TestPunterSortColumnWhitelist(t *testing.T) {
	if got := punterSortColumn("lastLoginAt"); got != "last_login_at" {
		t.Fatalf("expected last_login_at, got %s", got)
	}
	if got := punterSortColumn("badField"); got != "created_at" {
		t.Fatalf("expected default created_at, got %s", got)
	}
}

func TestWhereClause(t *testing.T) {
	if got := whereClause(nil); got != "" {
		t.Fatalf("expected empty where clause, got %q", got)
	}
	if got := whereClause([]string{"a = 1", "b = 2"}); got != "WHERE a = 1 AND b = 2" {
		t.Fatalf("unexpected where clause: %q", got)
	}
}

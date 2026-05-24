package prediction

import (
	"strings"
	"testing"
)

// The publication gate lives in buildMarketWhere: player-facing market queries
// must never return pre-launch `unopened` markets (e.g. AI drafts awaiting admin
// review) unless the caller explicitly opts in (admin views).

func TestBuildMarketWhereExcludesUnopenedByDefault(t *testing.T) {
	where, _ := buildMarketWhere(MarketFilter{})
	if !strings.Contains(where, "status <> 'unopened'") {
		t.Fatalf("default filter must exclude unopened markets; got WHERE %q", where)
	}
}

func TestBuildMarketWhereIncludesUnopenedWhenOptedIn(t *testing.T) {
	where, _ := buildMarketWhere(MarketFilter{IncludeUnopened: true})
	if strings.Contains(where, "status <> 'unopened'") {
		t.Fatalf("IncludeUnopened=true must not add the exclusion; got WHERE %q", where)
	}
}

func TestBuildMarketWhereStatusFilterCannotSurfaceUnopened(t *testing.T) {
	// A public caller passing ?status=unopened must still get the exclusion, so
	// the combined predicate (status='unopened' AND status<>'unopened') returns
	// nothing — a player can't reveal drafts by asking for them.
	s := MarketStatusUnopened
	where, _ := buildMarketWhere(MarketFilter{Status: &s})
	if !strings.Contains(where, "status <> 'unopened'") {
		t.Fatalf("a public status filter must still exclude unopened; got WHERE %q", where)
	}
}

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

func TestBuildMarketWhereSearchesTickerTitleAndDescription(t *testing.T) {
	q := "election"
	where, args := buildMarketWhere(MarketFilter{Search: &q})
	for _, token := range []string{"m.ticker ILIKE", "m.title ILIKE", "COALESCE(m.description, '') ILIKE"} {
		if !strings.Contains(where, token) {
			t.Fatalf("search filter should include %s; got WHERE %q", token, where)
		}
	}
	if len(args) != 1 || args[0] != "%election%" {
		t.Fatalf("expected one wildcard search arg, got %#v", args)
	}
}

func TestBuildMarketWhereFiltersBySeriesAndTags(t *testing.T) {
	seriesID := "series-123"
	tag := "Fed Rates"
	where, args := buildMarketWhere(MarketFilter{SeriesID: &seriesID, Tag: &tag})
	if !strings.Contains(where, "series_id = $1") {
		t.Fatalf("series filter should constrain event series, got WHERE %q", where)
	}
	if !strings.Contains(where, "JOIN prediction_series") || !strings.Contains(where, "lower(unnest(s.tags))") {
		t.Fatalf("tag filter should join series tags case-insensitively, got WHERE %q", where)
	}
	if len(args) != 2 || args[0] != seriesID || args[1] != tag {
		t.Fatalf("expected series and tag args, got %#v", args)
	}
}

func TestMarketOrderClauseSupportsDiscoverySorts(t *testing.T) {
	if clause := marketOrderClause("closing_soon"); !strings.Contains(clause, "rm.close_at ASC") {
		t.Fatalf("closing_soon sort should order by close_at ASC, got %q", clause)
	}
	if clause := marketOrderClause("newest"); !strings.Contains(clause, "rm.created_at DESC") {
		t.Fatalf("newest sort should order by created_at DESC, got %q", clause)
	}
	if clause := marketOrderClause("activity"); !strings.Contains(clause, "volume_24h_cents") {
		t.Fatalf("activity sort should use ranking score, got %q", clause)
	}
}

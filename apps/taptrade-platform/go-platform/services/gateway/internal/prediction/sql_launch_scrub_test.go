package prediction

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"testing"
	"time"

	"taptrade/gateway/internal/compliance"
)

// TestSQLListMarketsExcludesLaunchScrubbedTitles exercises the SQL translation
// of the launch-safety scrub against a real Postgres: markets whose title
// would be redacted to the sentinel are excluded from public list queries and
// every discovery bucket, stay included for opted-in (admin/worker) callers,
// and remain fetchable by direct ticker for audit. Skipped unless
// GATEWAY_DB_DSN is set (and reachable), so the default `go test` run stays
// hermetic.
//
// Run it with the dev database:
//
//	GATEWAY_DB_DSN="postgres://predict:localdev@localhost:5434/predict?sslmode=disable" \
//	  go test ./internal/prediction/ -run TestSQLListMarketsExcludesLaunchScrubbedTitles -v
func TestSQLListMarketsExcludesLaunchScrubbedTitles(t *testing.T) {
	dsn := os.Getenv("GATEWAY_DB_DSN")
	if dsn == "" {
		t.Skip("set GATEWAY_DB_DSN to run the launch-scrub list-exclusion integration test")
	}

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	ctx := context.Background()
	// Cleanup order matters: t.Cleanup runs after the test body (and its
	// defers), so the row deletes AND the close both live here, deletes first.
	t.Cleanup(func() {
		if _, err := db.ExecContext(ctx,
			`DELETE FROM prediction_markets WHERE ticker LIKE 'SCRUBT-%'`); err != nil {
			t.Logf("cleanup markets: %v", err)
		}
		if _, err := db.ExecContext(ctx,
			`DELETE FROM prediction_events WHERE title LIKE 'launch scrub test event %'`); err != nil {
			t.Logf("cleanup events: %v", err)
		}
		db.Close()
	})
	if err := db.PingContext(ctx); err != nil {
		t.Skipf("GATEWAY_DB_DSN set but db not reachable: %v", err)
	}

	suffix := fmt.Sprintf("scrub-%d", time.Now().UnixNano())
	cleanTicker := "SCRUBT-CLEAN-" + suffix
	scrubbedTicker := "SCRUBT-DIRTY-" + suffix

	var eventID string
	if err := db.QueryRowContext(ctx,
		`INSERT INTO prediction_events (title, status, featured, open_at, close_at)
		 VALUES ($1, 'open', true, NOW() - INTERVAL '1 day', NOW() + INTERVAL '30 days')
		 RETURNING id`, "launch scrub test event "+suffix,
	).Scan(&eventID); err != nil {
		t.Fatalf("seed event: %v", err)
	}

	// Absurd volume pins both markets to the top of the volume-ordered
	// discovery buckets, so "the scrubbed one is absent" is a real assertion
	// rather than an artifact of LIMIT 12.
	const bigVolume = int64(900_000_000_000)
	seed := func(ticker, title string) {
		t.Helper()
		if _, err := db.ExecContext(ctx,
			`INSERT INTO prediction_markets
			 (event_id, ticker, title, status, settlement_source_key, settlement_rule,
			  close_at, volume_cents)
			 VALUES ($1, $2, $3, 'open', 'manual', 'manual-attestation',
			         NOW() + INTERVAL '3 days', $4)`,
			eventID, ticker, title, bigVolume,
		); err != nil {
			t.Fatalf("seed market %s: %v", ticker, err)
		}
	}
	seed(cleanTicker, "Fed cuts at the September FOMC "+suffix)
	seed(scrubbedTicker, "Will BTC hit $200k before the halving "+suffix)

	repo := NewSQLRepository(db)

	tickers := func(markets []Market) map[string]bool {
		out := map[string]bool{}
		for _, m := range markets {
			out[m.Ticker] = true
		}
		return out
	}

	// Public list: scrubbed market excluded, and the total reflects the
	// exclusion so pagination stays honest.
	publicMarkets, publicTotal, err := repo.ListMarkets(ctx, MarketFilter{
		EventID: &eventID, Page: 1, PageSize: 50,
	})
	if err != nil {
		t.Fatalf("public ListMarkets: %v", err)
	}
	got := tickers(publicMarkets)
	if !got[cleanTicker] || got[scrubbedTicker] {
		t.Fatalf("public list must keep %s and exclude %s, got %v", cleanTicker, scrubbedTicker, got)
	}
	if publicTotal != 1 {
		t.Fatalf("public total must count only listable markets, got %d", publicTotal)
	}

	// Opted-in list (admin/back-office/workers): both visible.
	adminMarkets, adminTotal, err := repo.ListMarkets(ctx, MarketFilter{
		EventID: &eventID, Page: 1, PageSize: 50, IncludeLaunchScrubbed: true,
	})
	if err != nil {
		t.Fatalf("opted-in ListMarkets: %v", err)
	}
	got = tickers(adminMarkets)
	if !got[cleanTicker] || !got[scrubbedTicker] {
		t.Fatalf("opted-in list must include both markets, got %v", got)
	}
	if adminTotal != 2 {
		t.Fatalf("opted-in total must count both markets, got %d", adminTotal)
	}

	// Direct ticker fetch stays available for audit/back-office.
	direct, err := repo.GetMarketByTicker(ctx, scrubbedTicker)
	if err != nil || direct == nil {
		t.Fatalf("scrubbed market must stay fetchable by ticker: %v", err)
	}

	// Discovery: all buckets are public, so the scrubbed market appears in
	// none of them; the clean sibling proves the event/volume setup would
	// have surfaced it.
	discovery, err := repo.GetDiscovery(ctx)
	if err != nil {
		t.Fatalf("GetDiscovery: %v", err)
	}
	buckets := map[string][]Market{
		"featured":    discovery.Featured,
		"trending":    discovery.Trending,
		"closingSoon": discovery.ClosingSoon,
		"recent":      discovery.Recent,
	}
	for name, bucket := range buckets {
		if tickers(bucket)[scrubbedTicker] {
			t.Fatalf("discovery bucket %s leaked the scrubbed market", name)
		}
	}
	if !tickers(discovery.Featured)[cleanTicker] || !tickers(discovery.Trending)[cleanTicker] {
		t.Fatalf("clean market should top featured+trending (featured=%v trending=%v)",
			tickers(discovery.Featured), tickers(discovery.Trending))
	}
}

// TestSQLLaunchScrubPredicateMatchesGoPredicate is the drift guard between
// compliance.HasLaunchProhibitedCopy (the Go regex the payload scrub uses)
// and compliance.LaunchProhibitedCopySQLCondition (its Postgres translation
// the list filter uses). Every title a market could plausibly carry must get
// the same verdict from both, or a market would be hidden from lists while
// its title renders clean — or listed while scrubbed. Skipped unless
// GATEWAY_DB_DSN is set.
func TestSQLLaunchScrubPredicateMatchesGoPredicate(t *testing.T) {
	dsn := os.Getenv("GATEWAY_DB_DSN")
	if dsn == "" {
		t.Skip("set GATEWAY_DB_DSN to run the scrub-predicate parity test")
	}

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	defer db.Close()
	ctx := context.Background()
	if err := db.PingContext(ctx); err != nil {
		t.Skipf("GATEWAY_DB_DSN set but db not reachable: %v", err)
	}

	query := `SELECT ` + compliance.LaunchProhibitedCopySQLCondition("$1::text")

	titles := []string{
		"",
		"Fed cuts at May FOMC?",
		"Will BTC hit $200k?",
		"Cash out before Friday",
		"CASH OUT BEFORE FRIDAY",
		"Best bets for the finals",
		"bet on it",
		"alphabets are not wagers",
		"Wagering closes at noon",
		"USDC depegs below 0.99?",
		"usd strength continues?",
		"Crypto ETF approved in July?",
		"Scashier is a brand",
		"Redeemable rewards drop",
		"All points are non-redeemable",
		"non-redeemable today, redeemable tomorrow",
		"Money talks",
		"prize pool doubles",
		"A sportsbook opens in Vegas",
		"deposit-free trial",
		"Dollars to donuts",
		"freebet weekend",
		"freebets weekend",
		"points-only launch, no payout",
	}
	for _, title := range titles {
		var sqlVerdict bool
		if err := db.QueryRowContext(ctx, query, title).Scan(&sqlVerdict); err != nil {
			t.Fatalf("evaluate SQL predicate for %q: %v", title, err)
		}
		if goVerdict := compliance.HasLaunchProhibitedCopy(title); sqlVerdict != goVerdict {
			t.Errorf("predicate drift on %q: go=%v sql=%v", title, goVerdict, sqlVerdict)
		}
	}
}

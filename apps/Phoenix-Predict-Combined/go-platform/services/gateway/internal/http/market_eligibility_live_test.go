package http

import (
	"context"
	"database/sql"
	"os"
	"testing"

	_ "github.com/lib/pq"
)

// TestSQLMarketEligibilityLive (GAP-20): a restricted market (with required
// tags) is tradeable only by a user holding ALL of them; an unrestricted market
// is always eligible. Opt-in: MARKET_ELIG_LIVE_DSN. Self-provisions the two
// tables the query reads (migration 057 + the store-owned crm_user_tags).
func TestSQLMarketEligibilityLive(t *testing.T) {
	dsn := os.Getenv("MARKET_ELIG_LIVE_DSN")
	if dsn == "" {
		t.Skip("MARKET_ELIG_LIVE_DSN not set; skipping live market-eligibility test")
	}
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer db.Close()
	ctx := context.Background()

	for _, ddl := range []string{
		`CREATE TABLE IF NOT EXISTS market_eligibility_tags (market_id UUID NOT NULL, tag_id BIGINT NOT NULL, PRIMARY KEY (market_id, tag_id))`,
		`CREATE TABLE IF NOT EXISTS crm_user_tags (tag_id BIGINT NOT NULL, user_id TEXT NOT NULL, assigned_by TEXT, assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY (tag_id, user_id))`,
	} {
		if _, err := db.Exec(ddl); err != nil {
			t.Fatalf("ddl: %v", err)
		}
	}
	const restricted = "00000000-0000-0000-0000-0000000000aa"
	const unrestricted = "00000000-0000-0000-0000-0000000000bb"
	_, _ = db.Exec(`DELETE FROM market_eligibility_tags WHERE market_id IN ($1,$2)`, restricted, unrestricted)
	_, _ = db.Exec(`DELETE FROM crm_user_tags WHERE user_id IN ('u-holder','u-partial','u-none')`)
	if _, err := db.Exec(`INSERT INTO market_eligibility_tags (market_id, tag_id) VALUES ($1, 9001), ($1, 9002)`, restricted); err != nil {
		t.Fatalf("seed reqs: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO crm_user_tags (tag_id, user_id) VALUES (9001,'u-holder'),(9002,'u-holder'),(9001,'u-partial')`); err != nil {
		t.Fatalf("seed user tags: %v", err)
	}

	elig := sqlMarketEligibility{db: db}
	check := func(user, market string, want bool) {
		t.Helper()
		got, err := elig.IsEligible(ctx, user, market)
		if err != nil {
			t.Fatalf("IsEligible(%s,%s): %v", user, market, err)
		}
		if got != want {
			t.Fatalf("IsEligible(%s,%s) = %v, want %v", user, market, got, want)
		}
	}
	check("u-holder", restricted, true)   // holds all required tags
	check("u-partial", restricted, false) // missing 9002
	check("u-none", restricted, false)    // holds none
	check("u-none", unrestricted, true)   // market has no required tags
}

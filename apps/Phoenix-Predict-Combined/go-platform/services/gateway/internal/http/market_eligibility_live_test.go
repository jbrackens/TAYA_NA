package http

import (
	"context"
	"database/sql"
	"errors"
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

// TestSQLMarketEligibilityAdminLive (GAP-20 slice 2): the admin config store —
// list/add/remove tag rules on a real DB, including the fail-safe validation
// (unknown market → errEligMarketNotFound, unknown tag → errEligTagNotFound) and
// idempotent add / no-op remove. Opt-in: MARKET_ELIG_LIVE_DSN. Self-provisions
// minimal prediction_markets + crm_tags shells (bare-DB CI group).
func TestSQLMarketEligibilityAdminLive(t *testing.T) {
	dsn := os.Getenv("MARKET_ELIG_LIVE_DSN")
	if dsn == "" {
		t.Skip("MARKET_ELIG_LIVE_DSN not set; skipping live market-eligibility admin test")
	}
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer db.Close()
	ctx := context.Background()

	for _, ddl := range []string{
		`CREATE TABLE IF NOT EXISTS market_eligibility_tags (market_id UUID NOT NULL, tag_id BIGINT NOT NULL, PRIMARY KEY (market_id, tag_id))`,
		`CREATE TABLE IF NOT EXISTS prediction_markets (id UUID PRIMARY KEY)`,
		`CREATE TABLE IF NOT EXISTS crm_tags (id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL)`,
	} {
		if _, err := db.Exec(ddl); err != nil {
			t.Fatalf("ddl: %v", err)
		}
	}

	const mkt = "00000000-0000-0000-0000-0000000000c1"
	const missingMkt = "00000000-0000-0000-0000-0000000000c2"
	_, _ = db.Exec(`DELETE FROM market_eligibility_tags WHERE market_id = $1`, mkt)
	_, _ = db.Exec(`DELETE FROM prediction_markets WHERE id IN ($1,$2)`, mkt, missingMkt)
	_, _ = db.Exec(`DELETE FROM crm_tags WHERE id IN (9101, 9102)`)
	if _, err := db.Exec(`INSERT INTO prediction_markets (id) VALUES ($1)`, mkt); err != nil {
		t.Fatalf("seed market: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO crm_tags (id, name) VALUES (9101,'vip'),(9102,'accredited')`); err != nil {
		t.Fatalf("seed tags: %v", err)
	}

	store := sqlMarketEligibility{db: db}

	if tags, err := store.ListRequiredTags(ctx, mkt); err != nil || len(tags) != 0 {
		t.Fatalf("initial list: tags=%v err=%v", tags, err)
	}

	// Add two; re-adding is idempotent.
	if err := store.AddRequiredTag(ctx, mkt, 9101); err != nil {
		t.Fatalf("add 9101: %v", err)
	}
	if err := store.AddRequiredTag(ctx, mkt, 9102); err != nil {
		t.Fatalf("add 9102: %v", err)
	}
	if err := store.AddRequiredTag(ctx, mkt, 9101); err != nil {
		t.Fatalf("idempotent re-add 9101: %v", err)
	}
	if tags, err := store.ListRequiredTags(ctx, mkt); err != nil || len(tags) != 2 || tags[0] != 9101 || tags[1] != 9102 {
		t.Fatalf("list after add: tags=%v err=%v", tags, err)
	}

	// Fail-safe validation: refuse an unsatisfiable rule (unknown tag) and a rule
	// on a non-existent market.
	if err := store.AddRequiredTag(ctx, missingMkt, 9101); !errors.Is(err, errEligMarketNotFound) {
		t.Fatalf("add to unknown market: want errEligMarketNotFound, got %v", err)
	}
	if err := store.AddRequiredTag(ctx, mkt, 9999); !errors.Is(err, errEligTagNotFound) {
		t.Fatalf("add unknown tag: want errEligTagNotFound, got %v", err)
	}

	// Remove one; removing an absent rule is a no-op; removing from an unknown
	// market still 404s.
	if err := store.RemoveRequiredTag(ctx, mkt, 9101); err != nil {
		t.Fatalf("remove 9101: %v", err)
	}
	if err := store.RemoveRequiredTag(ctx, mkt, 9999); err != nil {
		t.Fatalf("remove absent tag (no-op): %v", err)
	}
	if err := store.RemoveRequiredTag(ctx, missingMkt, 9102); !errors.Is(err, errEligMarketNotFound) {
		t.Fatalf("remove from unknown market: want errEligMarketNotFound, got %v", err)
	}
	if tags, err := store.ListRequiredTags(ctx, mkt); err != nil || len(tags) != 1 || tags[0] != 9102 {
		t.Fatalf("list after remove: tags=%v err=%v", tags, err)
	}
}

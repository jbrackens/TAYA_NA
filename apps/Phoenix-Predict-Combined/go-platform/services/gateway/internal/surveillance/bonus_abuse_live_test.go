package surveillance

// Opt-in live test (SURV_LIVE_DSN, migrated-DB group): exercises the GAP-23
// BonusAbuseDetector against a seeded campaign + a same-inbox farming ring in the
// real punters/campaigns/player_bonuses schema. Seeded rows are cleaned up on
// exit so the shared migrated DB is left as found.

import (
	"context"
	"testing"
	"time"

	_ "github.com/lib/pq"
)

func TestBonusAbuseDetectorLive(t *testing.T) {
	db := liveDB(t)
	defer db.Close()
	ctx := context.Background()

	var campaignID int64
	if err := db.QueryRowContext(ctx, `
INSERT INTO campaigns (name, campaign_type, status, start_at, end_at, created_by)
VALUES ('gap23-bonus-abuse-test', 'signup_bonus', 'active', NOW(), NOW() + INTERVAL '30 days', 'test')
RETURNING id`).Scan(&campaignID); err != nil {
		t.Skipf("cannot seed campaign (schema not migrated?): %v", err)
	}
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM player_bonuses WHERE campaign_id = $1`, campaignID)
		_, _ = db.Exec(`DELETE FROM punters WHERE id IN ('gap23-farm-a','gap23-farm-b','gap23-legit-x')`)
		_, _ = db.Exec(`DELETE FROM campaigns WHERE id = $1`, campaignID)
	})

	// Two alt accounts whose gmail addresses normalize to one inbox (the ring),
	// plus a control account on a distinct inbox — all claiming this campaign.
	accts := []struct{ id, email string }{
		{"gap23-farm-a", "promo.farmer+a@gmail.com"},
		{"gap23-farm-b", "promofarmer+b@gmail.com"},
		{"gap23-legit-x", "gap23-legit@example.com"},
	}
	for i, a := range accts {
		if _, err := db.ExecContext(ctx,
			`INSERT INTO punters (id, email) VALUES ($1, $2)`, a.id, a.email); err != nil {
			t.Fatalf("seed punter %s: %v", a.id, err)
		}
		// granted_at increasing with i so gap23-farm-a is the earliest ring
		// member and therefore the alert subject.
		if _, err := db.ExecContext(ctx, `
INSERT INTO player_bonuses (user_id, campaign_id, bonus_type, granted_amount_cents, remaining_amount_cents, expires_at, granted_at)
VALUES ($1, $2, 'signup_bonus', 1000, 1000, NOW() + INTERVAL '30 days', NOW() + make_interval(mins => $3))`,
			a.id, campaignID, i); err != nil {
			t.Fatalf("seed bonus %s: %v", a.id, err)
		}
	}

	alerts, err := BonusAbuseDetector{}.Scan(ctx, db, time.Time{})
	if err != nil {
		t.Fatalf("scan: %v", err)
	}

	var ring *Alert
	for i := range alerts {
		if alerts[i].Kind == "bonus_abuse" && alerts[i].Detail["campaignId"] == campaignID {
			ring = &alerts[i]
		}
	}
	if ring == nil {
		t.Fatalf("expected a bonus_abuse alert for campaign %d, got %+v", campaignID, alerts)
	}
	if ring.SubjectID != "gap23-farm-a" {
		t.Fatalf("subject should be the earliest ring account gap23-farm-a, got %q", ring.SubjectID)
	}
	if ring.Detail["accountCount"].(int) != 2 {
		t.Fatalf("ring accountCount = %v, want 2 (control account is a distinct inbox)", ring.Detail["accountCount"])
	}
}

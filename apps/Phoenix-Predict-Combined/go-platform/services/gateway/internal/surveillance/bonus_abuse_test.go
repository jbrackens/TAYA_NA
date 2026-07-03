package surveillance

import "testing"

// TestBonusFarmingAlerts (GAP-23) exercises the pure grouping/severity logic of
// the bonus-abuse detector without a DB: a same-inbox ring on one campaign trips
// a medium alert, a three-account ring trips a high alert, duplicate grant rows
// for one account do not inflate the count, and a solo distinct inbox never trips.
func TestBonusFarmingAlerts(t *testing.T) {
	grants := []bonusGrant{
		// campaign 1: a farming ring — two alts whose gmail addresses normalize
		// to the same inbox (one via +tag, one via dots + googlemail alias).
		{campaignID: 1, acct: "a1", email: "farmer+a@gmail.com", amountCents: 500, grantedAt: "2026-01-01"},
		{campaignID: 1, acct: "a2", email: "far.mer@googlemail.com", amountCents: 700, grantedAt: "2026-01-02"},
		// campaign 1: a solo distinct inbox — must NOT trip.
		{campaignID: 1, acct: "b1", email: "solo@example.com", amountCents: 100, grantedAt: "2026-01-03"},
		// campaign 2: a three-account ring — high severity.
		{campaignID: 2, acct: "c1", email: "ring@x.com", amountCents: 100, grantedAt: "2026-01-01"},
		{campaignID: 2, acct: "c2", email: "ring@x.com", amountCents: 100, grantedAt: "2026-01-02"},
		{campaignID: 2, acct: "c3", email: "ring@x.com", amountCents: 100, grantedAt: "2026-01-03"},
		// a duplicate grant row for c3 — must not inflate the account count.
		{campaignID: 2, acct: "c3", email: "ring@x.com", amountCents: 100, grantedAt: "2026-01-04"},
	}

	alerts := bonusFarmingAlerts(grants, 0) // 0 coerced to the floor of 2
	if len(alerts) != 2 {
		t.Fatalf("want 2 alerts (one ring per campaign), got %d: %+v", len(alerts), alerts)
	}

	byCampaign := map[int64]Alert{}
	for _, a := range alerts {
		if a.Kind != "bonus_abuse" {
			t.Fatalf("unexpected alert kind %q", a.Kind)
		}
		byCampaign[a.Detail["campaignId"].(int64)] = a
	}

	c1 := byCampaign[1]
	if c1.SubjectID != "a1" {
		t.Fatalf("campaign 1 subject should be the earliest ring account a1, got %q", c1.SubjectID)
	}
	if c1.Detail["accountCount"].(int) != 2 || c1.Severity != "medium" {
		t.Fatalf("campaign 1 ring should be 2 accounts / medium: %+v", c1)
	}
	if c1.Detail["totalGrantedCents"].(int64) != 1200 {
		t.Fatalf("campaign 1 total = %v, want 1200", c1.Detail["totalGrantedCents"])
	}

	c2 := byCampaign[2]
	if c2.Detail["accountCount"].(int) != 3 || c2.Severity != "high" {
		t.Fatalf("campaign 2 ring should be 3 accounts / high (dedup c3): %+v", c2)
	}
	if c2.Detail["totalGrantedCents"].(int64) != 300 {
		t.Fatalf("campaign 2 total = %v, want 300 (duplicate c3 row excluded)", c2.Detail["totalGrantedCents"])
	}
}

// TestBonusFarmingAlertsRespectsMinAccounts confirms a higher threshold suppresses
// a two-account ring.
func TestBonusFarmingAlertsRespectsMinAccounts(t *testing.T) {
	grants := []bonusGrant{
		{campaignID: 7, acct: "x", email: "dup@site.com", amountCents: 1, grantedAt: "2026-01-01"},
		{campaignID: 7, acct: "y", email: "dup@site.com", amountCents: 1, grantedAt: "2026-01-02"},
	}
	if got := bonusFarmingAlerts(grants, 3); len(got) != 0 {
		t.Fatalf("minAccounts=3 must suppress a 2-account ring, got %+v", got)
	}
	if got := bonusFarmingAlerts(grants, 2); len(got) != 1 {
		t.Fatalf("minAccounts=2 must flag the 2-account ring, got %d", len(got))
	}
}

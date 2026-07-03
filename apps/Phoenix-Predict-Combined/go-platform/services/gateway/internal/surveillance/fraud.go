package surveillance

import (
	"context"
	"database/sql"
	"fmt"
	"sort"
	"strings"
	"time"
)

// NormalizeEmail collapses the common inbox-aliasing tricks so that addresses
// delivering to the same real mailbox map to one key:
//   - lowercase + trim
//   - drop a "+tag" suffix in the local part (universal provider convention)
//   - for Gmail/Googlemail, also strip dots in the local part and treat
//     googlemail.com as gmail.com (Gmail ignores both)
//
// Addresses without an "@", or with an empty local/domain, are returned
// lowercased-and-trimmed but otherwise untouched (nothing to normalize).
func NormalizeEmail(email string) string {
	e := strings.ToLower(strings.TrimSpace(email))
	at := strings.LastIndex(e, "@")
	if at <= 0 || at == len(e)-1 {
		return e
	}
	local, domain := e[:at], e[at+1:]

	if plus := strings.IndexByte(local, '+'); plus >= 0 {
		local = local[:plus]
	}
	if domain == "gmail.com" || domain == "googlemail.com" {
		local = strings.ReplaceAll(local, ".", "")
		domain = "gmail.com"
	}
	if local == "" {
		// A local part that was entirely a "+tag" is degenerate; fall back to
		// the pre-strip address so distinct such addresses don't all collide.
		return e
	}
	return local + "@" + domain
}

// DuplicateAccountDetector flags groups of two or more distinct accounts whose
// email addresses normalize to the same real inbox — the cheapest strong
// duplicate-account signal available without IP/device capture (which this
// schema does not store; see GAP note in the ledger). One alert per group,
// subject = earliest account, the rest listed in detail.
type DuplicateAccountDetector struct{}

func (DuplicateAccountDetector) Name() string { return "duplicate_account" }

// Scan ignores the time window: duplicate accounts are a standing property, not
// a windowed event. It reads punters read-only.
func (DuplicateAccountDetector) Scan(ctx context.Context, db *sql.DB, _ time.Time) ([]Alert, error) {
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()

	rows, err := db.QueryContext(ctx, `
SELECT id, email, CAST(created_at AS TEXT)
FROM punters
WHERE email IS NOT NULL AND email <> ''
ORDER BY created_at ASC, id ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	type acct struct{ id, email, created string }
	groups := map[string][]acct{}
	for rows.Next() {
		var a acct
		if err := rows.Scan(&a.id, &a.email, &a.created); err != nil {
			return nil, err
		}
		key := NormalizeEmail(a.email)
		groups[key] = append(groups[key], a)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Deterministic output order so the alert set is stable across runs.
	keys := make([]string, 0, len(groups))
	for k := range groups {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	alerts := []Alert{}
	for _, key := range keys {
		members := groups[key]
		if len(members) < 2 {
			continue
		}
		// members are already ordered by created_at ASC from the query.
		subject := members[0]
		others := make([]map[string]any, 0, len(members)-1)
		ids := make([]string, 0, len(members))
		for _, m := range members {
			ids = append(ids, m.id)
		}
		for _, m := range members[1:] {
			others = append(others, map[string]any{
				"id": m.id, "email": m.email, "createdAt": m.created,
			})
		}
		sev := "medium"
		if len(members) >= 4 {
			sev = "high"
		}
		alerts = append(alerts, Alert{
			Kind:      "duplicate_account",
			Severity:  sev,
			SubjectID: subject.id,
			Summary: fmt.Sprintf("%d accounts share the normalized email %q",
				len(members), key),
			Detail: map[string]any{
				"normalizedEmail": key,
				"accountCount":    len(members),
				"linkedAccounts":  others,
			},
			// Stable across runs for the same membership set; a new member
			// changes the key so a grown ring re-alerts.
			DedupeKey: fmt.Sprintf("duplicate_account:%s:%s", key, strings.Join(ids, ",")),
		})
	}
	return alerts, rows.Err()
}

// BonusAbuseDetector flags bonus farming (GAP-23, PAM spec §18 Market Integrity,
// Fraud, and Abuse Monitoring — "Fraud & abuse: ... bonus abuse"): two or more
// distinct accounts whose emails normalize to the same real inbox that EACH
// claimed a bonus from the SAME campaign — one person harvesting a promotion via
// alt accounts. It joins player_bonuses to punters (both keyed by the VARCHAR
// user id) and reuses NormalizeEmail — the same inbox-aliasing collapse the
// duplicate-account detector uses. Like that detector, bonus farming is a
// standing property, so it ignores the scan window; read-only over both tables.
// The alert goes to a human analyst for case review, never an automated sanction.
type BonusAbuseDetector struct {
	// MinAccounts is the number of same-inbox accounts holding one campaign's
	// bonus that trips an alert. Values < 2 are coerced to 2 (a single alt is
	// already the abuse floor).
	MinAccounts int
}

func (BonusAbuseDetector) Name() string { return "bonus_abuse" }

// bonusGrant is one (campaign, account) bonus grant row, carrying the account's
// email for inbox normalization.
type bonusGrant struct {
	campaignID  int64
	acct        string
	email       string
	amountCents int64
	grantedAt   string
}

func (d BonusAbuseDetector) Scan(ctx context.Context, db *sql.DB, _ time.Time) ([]Alert, error) {
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()

	rows, err := db.QueryContext(ctx, `
SELECT b.campaign_id, p.id, p.email, b.granted_amount_cents, CAST(b.granted_at AS TEXT)
FROM player_bonuses b
JOIN punters p ON p.id = b.user_id
WHERE p.email IS NOT NULL AND p.email <> ''
  AND b.campaign_id IS NOT NULL
ORDER BY b.campaign_id, b.granted_at ASC, p.id ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	grants := []bonusGrant{}
	for rows.Next() {
		var g bonusGrant
		if err := rows.Scan(&g.campaignID, &g.acct, &g.email, &g.amountCents, &g.grantedAt); err != nil {
			return nil, err
		}
		grants = append(grants, g)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return bonusFarmingAlerts(grants, d.MinAccounts), nil
}

// bonusFarmingAlerts groups grants by (campaign, normalized inbox) and emits one
// alert per group of >= minAccounts DISTINCT accounts. Pure (no DB) so the
// grouping/severity logic is unit-testable without Postgres. Input is expected
// ordered by granted_at ASC so the earliest account is the alert subject.
func bonusFarmingAlerts(grants []bonusGrant, minAccounts int) []Alert {
	if minAccounts < 2 {
		minAccounts = 2
	}
	type group struct {
		campaignID int64
		normEmail  string
		accts      []bonusGrant // one entry per distinct account (first grant kept)
		seen       map[string]bool
	}
	groups := map[string]*group{}
	order := []string{}
	for _, g := range grants {
		norm := NormalizeEmail(g.email)
		key := fmt.Sprintf("%d\x00%s", g.campaignID, norm)
		gr := groups[key]
		if gr == nil {
			gr = &group{campaignID: g.campaignID, normEmail: norm, seen: map[string]bool{}}
			groups[key] = gr
			order = append(order, key)
		}
		if gr.seen[g.acct] {
			continue
		}
		gr.seen[g.acct] = true
		gr.accts = append(gr.accts, g)
	}
	sort.Strings(order) // deterministic alert order across runs

	alerts := []Alert{}
	for _, key := range order {
		gr := groups[key]
		if len(gr.accts) < minAccounts {
			continue
		}
		var totalCents int64
		ids := make([]string, 0, len(gr.accts))
		others := make([]map[string]any, 0, len(gr.accts)-1)
		for i, m := range gr.accts {
			totalCents += m.amountCents
			ids = append(ids, m.acct)
			if i > 0 {
				others = append(others, map[string]any{
					"id": m.acct, "email": m.email, "grantedAt": m.grantedAt,
				})
			}
		}
		subject := gr.accts[0]
		sev := "medium"
		if len(gr.accts) >= 3 {
			sev = "high"
		}
		alerts = append(alerts, Alert{
			Kind:      "bonus_abuse",
			Severity:  sev,
			SubjectID: subject.acct,
			Summary: fmt.Sprintf("%d accounts sharing inbox %q each claimed campaign %d's bonus (%d cents total) — possible bonus farming",
				len(gr.accts), gr.normEmail, gr.campaignID, totalCents),
			Detail: map[string]any{
				"campaignId":        gr.campaignID,
				"normalizedEmail":   gr.normEmail,
				"accountCount":      len(gr.accts),
				"totalGrantedCents": totalCents,
				"linkedAccounts":    others,
			},
			// Stable per (campaign, inbox, member set); a new alt changes the key
			// so a grown ring re-alerts, and a re-scan of the same ring upserts.
			DedupeKey: fmt.Sprintf("bonus_abuse:%d:%s:%s", gr.campaignID, gr.normEmail, strings.Join(ids, ",")),
		})
	}
	return alerts
}

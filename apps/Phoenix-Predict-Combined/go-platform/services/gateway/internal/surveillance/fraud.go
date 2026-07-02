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

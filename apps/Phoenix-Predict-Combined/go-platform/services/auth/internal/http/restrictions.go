package http

import (
	"context"
	"os"
	"strings"
)

// GAP-10 (PAM spec §13 Responsible Gaming / Responsible Trading + §32
// Scenario 6, "login and trading blocked"): a self-excluded, RG-blocked, or
// admin-suspended player must not be able to LOG IN — trading-path
// enforcement alone (GAP-9) leaves the account usable for everything else.
//
// The auth service reads the gateway-owned punters and player_restrictions
// tables through its own DB handle — the same colocated-schema pattern
// lookupAdminUser established for admin_users staff login. Deployments
// already require the shared database for that; this control relies on the
// same fact and fails CLOSED in deployed environments when the lookup errors.

// authKnownDevEnvironments mirrors the gateway's GAP-4 allowlist: only these
// ENVIRONMENT values are development. Anything else — including non-canonical
// deployed values like "prod" or a typo — is a deployed environment.
var authKnownDevEnvironments = map[string]bool{
	"":            true,
	"development": true,
	"dev":         true,
	"test":        true,
	"testing":     true,
	"local":       true,
	"ci":          true,
}

func deployedAuthEnvironment() bool {
	return !authKnownDevEnvironments[strings.ToLower(strings.TrimSpace(os.Getenv("ENVIRONMENT")))]
}

// playerLoginRestriction reports a non-empty machine-readable reason when the
// player must be refused a session:
//   - "self_excluded": an active RG self-exclusion (permanent, or temporary
//     and unexpired — the exact predicate the gateway RG service uses in
//     GetPlayerRestrictions).
//   - "blocked": the RG blocked flag.
//   - "status_<status>": the admin-set punters.status is anything but active
//     (suspended / self_excluded / deactivated / unknown future values —
//     default-deny, mirroring the GAP-9 order gate).
//
// A missing punters/player_restrictions row means an unrestricted account
// (rows are created lazily). With no DB wired (in-memory dev mode) there is
// no punter data at all and the check is a no-op.
func (a *AuthService) playerLoginRestriction(userID string) (string, error) {
	if a.db == nil {
		return "", nil
	}
	ctx, cancel := context.WithTimeout(context.Background(), userDBTimeout)
	defer cancel()
	var status string
	var blocked, excluded bool
	err := a.db.QueryRowContext(ctx, `
SELECT COALESCE(p.status, 'active'),
       COALESCE(r.blocked, FALSE),
       COALESCE(r.self_excluded AND (r.self_exclusion_permanent
                OR (r.self_exclusion_until IS NOT NULL AND r.self_exclusion_until > NOW())), FALSE)
FROM (SELECT $1::text AS uid) q
LEFT JOIN punters p ON p.id = q.uid
LEFT JOIN player_restrictions r ON r.user_id = q.uid`, userID).
		Scan(&status, &blocked, &excluded)
	if err != nil {
		return "", err
	}
	switch {
	case excluded:
		return "self_excluded", nil
	case blocked:
		return "blocked", nil
	case status != "active":
		return "status_" + status, nil
	}
	return "", nil
}

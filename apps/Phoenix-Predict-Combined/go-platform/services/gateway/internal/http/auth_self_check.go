package http

import (
	stdhttp "net/http"

	"phoenix-revival/platform/transport/httpx"
)

// requireSelfOrAdmin enforces that a private user-scoped endpoint can only
// be called with a userId querystring matching the authenticated session
// user OR by an admin.
//
// The caller extracts the claimed user ID from the querystring (or path)
// and passes it in. This helper:
//   - Returns httpx.Unauthorized if there's no session user (defense in
//     depth — httpx.Auth middleware should already have caught this, but
//     the handler stays safe if someone later puts the route on the public
//     prefix list by mistake).
//   - Returns httpx.Forbidden if the session user differs from the claimed
//     user and they're not an admin.
//   - Returns nil (allow) if the session user matches the claim, or the
//     caller is an admin (via requireAdminRole's semantics).
//
// Loyalty and leaderboard endpoints accept a ?userId= query param for
// backwards-compat with the existing API shape. Before this helper, the
// handlers returned whichever user's data was requested, which meant any
// authenticated user could enumerate every other user's points, tier,
// rank, and ledger history. This closes that.
//
// See PLAN-loyalty-leaderboards.md §8 "Auth hardening (in scope — Codex
// flagged as a privacy bug)" for the design context.
func requireSelfOrAdmin(r *stdhttp.Request, claimedUserID string) error {
	sessionUserID := userIDFromRequest(r)
	if sessionUserID == "" {
		return httpx.Unauthorized("authentication required")
	}
	if sessionUserID == claimedUserID {
		return nil
	}
	// Mismatch: allow only if the session user is an admin.
	if err := requireAdminRole(r); err == nil {
		return nil
	}
	return httpx.Forbidden("cannot access another user's loyalty data")
}

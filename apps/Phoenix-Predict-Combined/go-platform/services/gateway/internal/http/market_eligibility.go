package http

import (
	"context"
	"database/sql"
	"errors"
	stdhttp "net/http"

	"phoenix-revival/platform/transport/httpx"
)

// GAP-20 (PAM spec §15 Prediction Market Account Functions): per-market
// eligibility. A restricted market may require the trader to hold one or more
// CRM segment tags; a user who does not hold ALL of them cannot trade that
// market — the "restricted players cannot access restricted markets" invariant.
// The check runs on the order path AFTER the global compliance gates, as a
// sibling of the per-market jurisdiction overlay, and OUT of the protected
// prediction core: it reads market_eligibility_tags (migration 057) and the
// store-owned crm_user_tags (segmentation) directly, never touching
// internal/prediction or the ComplianceChecker seam (which lacks the marketID).

// marketEligibilityChecker reports whether a user may trade a given market.
type marketEligibilityChecker interface {
	IsEligible(ctx context.Context, userID, marketID string) (bool, error)
}

// marketEligibility is the wired checker. Nil in memory mode (no DB): the gate
// is then a no-op, exactly like the KYC/geo gates when unconfigured.
var marketEligibility marketEligibilityChecker

// sqlMarketEligibility answers eligibility in one query: a user is eligible iff
// there is NO required tag on the market that the user does not hold — so an
// unrestricted market (no rows) is always eligible, and a restricted market
// requires the user to hold ALL of its tags (fail-closed ALL semantics).
type sqlMarketEligibility struct{ db *sql.DB }

func (s sqlMarketEligibility) IsEligible(ctx context.Context, userID, marketID string) (bool, error) {
	var eligible bool
	err := s.db.QueryRowContext(ctx, `
SELECT NOT EXISTS (
  SELECT 1 FROM market_eligibility_tags met
  WHERE met.market_id = $1
    AND NOT EXISTS (
      SELECT 1 FROM crm_user_tags ut
      WHERE ut.user_id = $2 AND ut.tag_id = met.tag_id
    )
)`, marketID, userID).Scan(&eligible)
	return eligible, err
}

// checkMarketEligibility blocks an order when the market restricts trading to
// tag-holders and the user lacks a required tag. Fail-closed: a lookup error
// blocks (mirrors the per-market jurisdiction overlay). A nil checker (memory
// mode / no DB) is a no-op — there is no eligibility configuration to enforce.
func checkMarketEligibility(r *stdhttp.Request, userID, marketID string) error {
	if marketEligibility == nil {
		return nil
	}
	eligible, err := marketEligibility.IsEligible(r.Context(), userID, marketID)
	if err != nil {
		return httpx.Forbidden("market eligibility check unavailable")
	}
	if !eligible {
		return httpx.Forbidden("this market is restricted; your account is not eligible to trade it")
	}
	return nil
}

// GAP-20 slice 2 — admin configuration of a market's required eligibility tags.
// The order-path gate above is inert until an operator declares which tags a
// market requires; these methods are that declaration surface, exposed through
// the RBAC-gated, audited admin route on /api/v1/admin/markets/{id}/eligibility-tags.

// Sentinel errors from the admin config path so the handler can map them to
// precise HTTP statuses: a missing market → 404, a missing tag → 400. Writing a
// requirement that references a non-existent tag would silently lock the market
// to nobody, so we refuse it rather than persist an unsatisfiable rule.
var (
	errEligMarketNotFound = errors.New("market not found")
	errEligTagNotFound    = errors.New("tag not found")
)

// marketEligibilityAdminStore is the config-side slice the admin route needs so
// handler tests can stub it. sqlMarketEligibility satisfies it.
type marketEligibilityAdminStore interface {
	ListRequiredTags(ctx context.Context, marketID string) ([]int64, error)
	AddRequiredTag(ctx context.Context, marketID string, tagID int64) error
	RemoveRequiredTag(ctx context.Context, marketID string, tagID int64) error
}

// marketEligibilityAdmin is the wired admin store. Nil in memory mode (no DB):
// the admin route then reports the surface unavailable, exactly like the gate.
var marketEligibilityAdmin marketEligibilityAdminStore

// ListRequiredTags returns, ascending, the tag ids a market requires a trader to
// hold. An unrestricted market returns an empty (non-nil) slice.
func (s sqlMarketEligibility) ListRequiredTags(ctx context.Context, marketID string) ([]int64, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT tag_id FROM market_eligibility_tags WHERE market_id::text = $1 ORDER BY tag_id`, marketID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	tags := []int64{}
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		tags = append(tags, id)
	}
	return tags, rows.Err()
}

// AddRequiredTag makes a market require the given tag. It validates that BOTH
// the market and the tag exist first — refusing (errEligTagNotFound) a rule that
// would lock the market to nobody. Idempotent: re-adding an existing rule is a
// no-op (ON CONFLICT DO NOTHING).
func (s sqlMarketEligibility) AddRequiredTag(ctx context.Context, marketID string, tagID int64) error {
	if err := s.requireMarketExists(ctx, marketID); err != nil {
		return err
	}
	var tagExists bool
	if err := s.db.QueryRowContext(ctx,
		`SELECT EXISTS(SELECT 1 FROM crm_tags WHERE id = $1)`, tagID).Scan(&tagExists); err != nil {
		return err
	}
	if !tagExists {
		return errEligTagNotFound
	}
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO market_eligibility_tags (market_id, tag_id) VALUES ($1::uuid, $2) ON CONFLICT DO NOTHING`,
		marketID, tagID)
	return err
}

// RemoveRequiredTag drops a tag requirement from a market. Removing a rule that
// is not present is a no-op, but the market is still validated to exist so a
// mistyped market id surfaces as 404 rather than a silent success.
func (s sqlMarketEligibility) RemoveRequiredTag(ctx context.Context, marketID string, tagID int64) error {
	if err := s.requireMarketExists(ctx, marketID); err != nil {
		return err
	}
	_, err := s.db.ExecContext(ctx,
		`DELETE FROM market_eligibility_tags WHERE market_id::text = $1 AND tag_id = $2`, marketID, tagID)
	return err
}

// requireMarketExists returns errEligMarketNotFound when no such market exists.
// It compares the id as text so a malformed (non-UUID) id simply matches nothing
// and yields a clean 404, rather than a Postgres uuid-parse error surfaced as 500.
func (s sqlMarketEligibility) requireMarketExists(ctx context.Context, marketID string) error {
	var exists bool
	if err := s.db.QueryRowContext(ctx,
		`SELECT EXISTS(SELECT 1 FROM prediction_markets WHERE id::text = $1)`, marketID).Scan(&exists); err != nil {
		return err
	}
	if !exists {
		return errEligMarketNotFound
	}
	return nil
}

// mapMarketEligibilityError translates the admin store's sentinel errors into
// HTTP responses; anything else is an internal fault (the raw cause is logged,
// not leaked).
func mapMarketEligibilityError(err error) error {
	switch {
	case errors.Is(err, errEligMarketNotFound):
		return httpx.NotFound("market not found")
	case errors.Is(err, errEligTagNotFound):
		return httpx.BadRequest("tag not found; create the tag before requiring it", map[string]any{"field": "tagId"})
	default:
		return httpx.Internal("failed to update market eligibility tags", err)
	}
}

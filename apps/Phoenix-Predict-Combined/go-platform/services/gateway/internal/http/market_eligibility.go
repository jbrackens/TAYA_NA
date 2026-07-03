package http

import (
	"context"
	"database/sql"
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

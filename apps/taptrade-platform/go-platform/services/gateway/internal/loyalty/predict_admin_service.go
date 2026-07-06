package loyalty

import (
	"context"
	"errors"
	"time"
)

// Admin-facing service methods for the office loyalty pages. Kept in a
// separate file from predict_service.go to make the admin surface easy to
// find. These reach the concrete repo's admin queries through a capability
// assertion so PredictRepo (and its test fakes) stay unchanged.

// ErrAdminListingUnsupported is returned when the wired repo doesn't implement
// the admin read queries (e.g. an in-memory fake). Real deployments use
// *PredictSQLRepo, which does.
var ErrAdminListingUnsupported = errors.New("loyalty: admin account listing not supported by this repo")

// adminAccountReader is the slice of *PredictSQLRepo the admin methods need.
type adminAccountReader interface {
	ListAdminAccounts(ctx context.Context, f PredictAdminAccountFilter, limit, offset int) ([]PredictAdminAccountRow, error)
	CountAdminAccounts(ctx context.Context, f PredictAdminAccountFilter) (int, error)
}

// AdminAccountSummary is the per-account view the office /loyalty list +
// /loyalty/[id] detail render. Rank names + next-rank XP are derived here
// from PointsBalance via the tiers.go helpers (the stored `tier` column can
// lag a balance change; deriving keeps the display authoritative).
type AdminAccountSummary struct {
	AccountID                string     `json:"accountId"`
	PlayerID                 string     `json:"playerId"`
	Rank                     int        `json:"rank"`
	RankName                 string     `json:"rankName"`
	NextRank                 int        `json:"nextRank,omitempty"`
	NextRankName             string     `json:"nextRankName,omitempty"`
	PointsBalance            int64      `json:"pointsBalance"`
	PointsEarnedLifetime     int64      `json:"pointsEarnedLifetime"`
	PointsEarned7D           int64      `json:"pointsEarned7D"`
	PointsEarned30D          int64      `json:"pointsEarned30D"`
	PointsEarnedCurrentMonth int64      `json:"pointsEarnedCurrentMonth"`
	XPToNextRank             int64      `json:"xpToNextRank"`
	Unit                     string     `json:"unit"`
	LastAccrualAt            *time.Time `json:"lastAccrualAt,omitempty"`
	CreatedAt                time.Time  `json:"createdAt"`
	UpdatedAt                time.Time  `json:"updatedAt"`
}

// AdminTierView is the office's LoyaltyTier shape (tierCode/displayName/
// minLifetimePoints). The Hidden tier (empty name) is omitted.
type AdminTierView struct {
	TierCode          string `json:"tierCode"`
	DisplayName       string `json:"displayName"`
	MinLifetimePoints int64  `json:"minLifetimePoints"`
}

func summaryFromRow(row PredictAdminAccountRow) AdminAccountSummary {
	tier := PredictTierForPoints(row.PointsBalance)
	pointsToNext, nextName := PredictPointsToNextTier(row.PointsBalance)
	nextRank := PredictTier(0)
	if tier < PredictTierLegend {
		nextRank = tier + 1
	}
	return AdminAccountSummary{
		AccountID:                row.UserID,
		PlayerID:                 row.UserID,
		Rank:                     int(tier),
		RankName:                 PredictTierName(tier),
		NextRank:                 int(nextRank),
		NextRankName:             nextName,
		PointsBalance:            row.PointsBalance,
		PointsEarnedLifetime:     row.EarnedLifetime,
		PointsEarned7D:           row.Earned7D,
		PointsEarned30D:          row.Earned30D,
		PointsEarnedCurrentMonth: row.EarnedMonth,
		XPToNextRank:             pointsToNext,
		Unit:                     "PTS",
		LastAccrualAt:            row.LastAccrualAt,
		CreatedAt:                row.CreatedAt,
		UpdatedAt:                row.UpdatedAt,
	}
}

// AdminTiers returns the tier table in the office's LoyaltyTier shape,
// skipping the Hidden (tier 0, no name) entry.
func (s *PredictService) AdminTiers() []AdminTierView {
	out := []AdminTierView{}
	for _, def := range PredictTiers() {
		if def.Name == "" {
			continue
		}
		out = append(out, AdminTierView{
			TierCode:          def.Name,
			DisplayName:       def.Name,
			MinLifetimePoints: def.PointsThreshold,
		})
	}
	return out
}

// tierBand maps a tier-name filter (case-insensitive) to a [min,max) points
// band. Returns (0,0,false) when the code is empty/unknown (no filter).
func tierBand(tierCode string) (min, max int64, ok bool) {
	switch normalizeTierCode(tierCode) {
	case "newcomer":
		return PredictTierThresholdNewcomer, PredictTierThresholdTrader, true
	case "trader":
		return PredictTierThresholdTrader, PredictTierThresholdSharp, true
	case "sharp":
		return PredictTierThresholdSharp, PredictTierThresholdWhale, true
	case "whale":
		return PredictTierThresholdWhale, PredictTierThresholdLegend, true
	case "legend":
		return PredictTierThresholdLegend, 0, true
	default:
		return 0, 0, false
	}
}

func normalizeTierCode(s string) string {
	b := make([]rune, 0, len(s))
	for _, r := range s {
		if r >= 'A' && r <= 'Z' {
			r += 'a' - 'A'
		}
		b = append(b, r)
	}
	return string(b)
}

// ListAdminAccounts returns a filtered, paginated account list plus the total
// count. search matches the user id; rankName narrows to that rank's points
// band. Older callers may still pass the same value through the tierCode query
// fallback at the HTTP boundary.
func (s *PredictService) ListAdminAccounts(
	ctx context.Context,
	search, rankName string,
	page, pageSize int,
) ([]AdminAccountSummary, int, error) {
	reader, ok := s.repo.(adminAccountReader)
	if !ok {
		return nil, 0, ErrAdminListingUnsupported
	}
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 50
	}
	if pageSize > 200 {
		pageSize = 200
	}

	filter := PredictAdminAccountFilter{Search: search}
	if min, max, ok := tierBand(rankName); ok {
		filter.MinPoints = min
		filter.MaxPoints = max
	}

	total, err := reader.CountAdminAccounts(ctx, filter)
	if err != nil {
		return nil, 0, err
	}
	rows, err := reader.ListAdminAccounts(ctx, filter, pageSize, (page-1)*pageSize)
	if err != nil {
		return nil, 0, err
	}
	out := make([]AdminAccountSummary, 0, len(rows))
	for _, row := range rows {
		out = append(out, summaryFromRow(row))
	}
	return out, total, nil
}

// AdminAccountDetail returns one account summary plus its recent ledger. If
// the account has no loyalty_accounts row yet, returns (nil, nil, nil) so the
// handler can 404 cleanly.
func (s *PredictService) AdminAccountDetail(
	ctx context.Context,
	userID string,
	ledgerLimit int,
) (*AdminAccountSummary, []PredictLedgerEntry, error) {
	reader, ok := s.repo.(adminAccountReader)
	if !ok {
		return nil, nil, ErrAdminListingUnsupported
	}
	rows, err := reader.ListAdminAccounts(ctx, PredictAdminAccountFilter{ExactUserID: userID}, 1, 0)
	if err != nil {
		return nil, nil, err
	}
	if len(rows) == 0 {
		return nil, nil, nil
	}
	summary := summaryFromRow(rows[0])
	ledger, err := s.repo.ListLedger(ctx, userID, ledgerLimit)
	if err != nil {
		return nil, nil, err
	}
	return &summary, ledger, nil
}

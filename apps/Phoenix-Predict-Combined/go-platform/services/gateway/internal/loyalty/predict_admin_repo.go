package loyalty

import (
	"context"
	"database/sql"
	"time"
)

// Admin read models for the office loyalty pages (/loyalty, /loyalty/[id]).
// These live on the concrete *PredictSQLRepo, NOT on the PredictRepo
// interface, so the existing test fakes (predict_service_test.go,
// predict_loyalty_handlers_test.go) keep compiling. The PredictService
// reaches them through a capability assertion (see ListAdminAccounts there).

// PredictAdminAccountRow is the raw per-account aggregation: the loyalty_accounts
// row joined with windowed positive-delta sums from loyalty_ledger. Tier names
// + points-to-next are derived in the service layer from PointsBalance.
type PredictAdminAccountRow struct {
	UserID         string
	PointsBalance  int64
	EarnedLifetime int64
	Earned7D       int64
	Earned30D      int64
	EarnedMonth    int64
	LastAccrualAt  *time.Time
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

// PredictAdminAccountFilter narrows the admin account list. All fields
// optional. MinPoints/MaxPoints express a tier band (max 0 = no upper bound);
// ExactUserID short-circuits to a single account (used by the detail route).
type PredictAdminAccountFilter struct {
	Search      string
	MinPoints   int64
	MaxPoints   int64
	ExactUserID string
}

// CountAdminAccounts returns the total matching the filter (ignores paging).
// Filters reference only loyalty_accounts, so no ledger join is needed.
func (r *PredictSQLRepo) CountAdminAccounts(ctx context.Context, f PredictAdminAccountFilter) (int, error) {
	var total int
	err := r.db.QueryRowContext(ctx, `
		SELECT COUNT(*)
		FROM loyalty_accounts la
		WHERE ($1 = '' OR la.user_id ILIKE '%' || $1 || '%')
		  AND ($2 = '' OR la.user_id = $2)
		  AND la.points_balance >= $3
		  AND ($4 = 0 OR la.points_balance < $4)`,
		f.Search, f.ExactUserID, f.MinPoints, f.MaxPoints,
	).Scan(&total)
	return total, err
}

// ListAdminAccounts returns a paginated, filtered account list with windowed
// earned-point sums. Ordered by points_balance DESC (the natural admin
// "biggest accounts first" view). limit ≤ 0 means "no cap".
func (r *PredictSQLRepo) ListAdminAccounts(
	ctx context.Context,
	f PredictAdminAccountFilter,
	limit, offset int,
) ([]PredictAdminAccountRow, error) {
	query := `
		SELECT
			la.user_id,
			la.points_balance,
			COALESCE(SUM(CASE WHEN ll.delta_points > 0 THEN ll.delta_points ELSE 0 END), 0) AS lifetime,
			COALESCE(SUM(CASE WHEN ll.delta_points > 0 AND ll.created_at >= now() - interval '7 days'  THEN ll.delta_points ELSE 0 END), 0) AS earned_7d,
			COALESCE(SUM(CASE WHEN ll.delta_points > 0 AND ll.created_at >= now() - interval '30 days' THEN ll.delta_points ELSE 0 END), 0) AS earned_30d,
			COALESCE(SUM(CASE WHEN ll.delta_points > 0 AND ll.created_at >= date_trunc('month', now()) THEN ll.delta_points ELSE 0 END), 0) AS earned_month,
			MAX(ll.created_at) AS last_accrual_at,
			la.created_at,
			la.updated_at
		FROM loyalty_accounts la
		LEFT JOIN loyalty_ledger ll ON ll.user_id = la.user_id
		WHERE ($1 = '' OR la.user_id ILIKE '%' || $1 || '%')
		  AND ($2 = '' OR la.user_id = $2)
		  AND la.points_balance >= $3
		  AND ($4 = 0 OR la.points_balance < $4)
		GROUP BY la.user_id, la.points_balance, la.created_at, la.updated_at
		ORDER BY la.points_balance DESC, la.user_id ASC`
	args := []interface{}{f.Search, f.ExactUserID, f.MinPoints, f.MaxPoints}
	if limit > 0 {
		query += ` LIMIT $5 OFFSET $6`
		args = append(args, limit, offset)
	}

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []PredictAdminAccountRow{}
	for rows.Next() {
		var (
			row           PredictAdminAccountRow
			lastAccrualAt sql.NullTime
		)
		if err := rows.Scan(
			&row.UserID,
			&row.PointsBalance,
			&row.EarnedLifetime,
			&row.Earned7D,
			&row.Earned30D,
			&row.EarnedMonth,
			&lastAccrualAt,
			&row.CreatedAt,
			&row.UpdatedAt,
		); err != nil {
			return nil, err
		}
		if lastAccrualAt.Valid {
			t := lastAccrualAt.Time
			row.LastAccrualAt = &t
		}
		out = append(out, row)
	}
	return out, rows.Err()
}

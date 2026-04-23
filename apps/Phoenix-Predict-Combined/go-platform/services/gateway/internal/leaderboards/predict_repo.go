package leaderboards

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"
)

// Predict-native leaderboards persistence — PLAN-loyalty-leaderboards.md §8.
// Reads precomputed snapshots produced by PredictRecomputer, plus the SQL
// queries the recomputer invokes. Parallel to the sportsbook service.go; the
// two coexist during the un-orphaning transition.

// PredictEntry is one rendered row: rank, metric, display name. The display
// name falls back to u-<first6> when the user has no username set, per plan
// §2.Leaderboard identity.
type PredictEntry struct {
	BoardID     string    `json:"boardId"`
	Rank        int       `json:"rank"`
	UserID      string    `json:"userId"`
	DisplayName string    `json:"displayName"`
	MetricValue float64   `json:"metricValue"`
	WindowStart time.Time `json:"windowStart"`
	WindowEnd   time.Time `json:"windowEnd"`
}

// PredictLBRepo is the Predict-native leaderboards persistence interface.
//
// Read methods serve the HTTP layer. Recompute methods are owned by
// PredictRecomputer — they truncate + repopulate the current window's
// snapshots under a single transaction per board.
type PredictLBRepo interface {
	ListEntries(ctx context.Context, boardID string, limit int) ([]PredictEntry, error)
	GetEntry(ctx context.Context, boardID, userID string) (*PredictEntry, error)
	ListUserRanks(ctx context.Context, userID string) ([]PredictEntry, error)

	RecomputeAccuracy(ctx context.Context, windowStart, windowEnd time.Time) (int, error)
	RecomputeWeeklyPnL(ctx context.Context, windowStart, windowEnd time.Time) (int, error)
	RecomputeSharpness(ctx context.Context, windowStart, windowEnd time.Time, minVolumeCents int64) (int, error)
	RecomputeCategoryChampions(ctx context.Context, categorySlug string, windowStart, windowEnd time.Time) (int, error)
}

// PredictSQLRepo backs PredictLBRepo with PostgreSQL.
type PredictSQLRepo struct {
	db *sql.DB
}

func NewPredictSQLRepo(db *sql.DB) *PredictSQLRepo {
	return &PredictSQLRepo{db: db}
}

// DB exposes the underlying pool for callers that need to run ad-hoc reads
// (e.g. migrations, diagnostics).
func (r *PredictSQLRepo) DB() *sql.DB { return r.db }

// ListEntries returns the top `limit` rows for the board in its most-recent
// window, ordered by rank ascending. The most-recent window is whichever
// window_start was last written — we don't surface older windows.
func (r *PredictSQLRepo) ListEntries(ctx context.Context, boardID string, limit int) ([]PredictEntry, error) {
	if strings.TrimSpace(boardID) == "" {
		return nil, errors.New("leaderboards: board_id required")
	}
	if limit <= 0 {
		limit = 25
	}

	rows, err := r.db.QueryContext(ctx, `
		WITH latest AS (
			SELECT MAX(window_start) AS window_start
			FROM leaderboard_snapshots
			WHERE board_id = $1
		)
		SELECT ls.rank, ls.user_id,
		       COALESCE(NULLIF(p.username, ''), substring(ls.user_id, 1, 10)) AS display_name,
		       ls.metric_value, ls.window_start, ls.window_end
		FROM leaderboard_snapshots ls
		JOIN latest USING (window_start)
		LEFT JOIN punters p ON p.id = ls.user_id
		WHERE ls.board_id = $1
		ORDER BY ls.rank ASC
		LIMIT $2`, boardID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []PredictEntry
	for rows.Next() {
		e := PredictEntry{BoardID: boardID}
		if err := rows.Scan(&e.Rank, &e.UserID, &e.DisplayName, &e.MetricValue, &e.WindowStart, &e.WindowEnd); err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

// GetEntry returns the user's current rank on one board, or nil if they
// haven't qualified for that board's latest window.
func (r *PredictSQLRepo) GetEntry(ctx context.Context, boardID, userID string) (*PredictEntry, error) {
	if strings.TrimSpace(boardID) == "" || strings.TrimSpace(userID) == "" {
		return nil, nil
	}
	var e PredictEntry
	e.BoardID = boardID
	err := r.db.QueryRowContext(ctx, `
		WITH latest AS (
			SELECT MAX(window_start) AS window_start
			FROM leaderboard_snapshots
			WHERE board_id = $1
		)
		SELECT ls.rank,
		       COALESCE(NULLIF(p.username, ''), substring(ls.user_id, 1, 10)) AS display_name,
		       ls.metric_value, ls.window_start, ls.window_end
		FROM leaderboard_snapshots ls
		JOIN latest USING (window_start)
		LEFT JOIN punters p ON p.id = ls.user_id
		WHERE ls.board_id = $1 AND ls.user_id = $2`, boardID, userID).
		Scan(&e.Rank, &e.DisplayName, &e.MetricValue, &e.WindowStart, &e.WindowEnd)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	e.UserID = userID
	return &e, nil
}

// ListUserRanks returns the user's rank on every board they currently qualify
// for, newest window only per board. Drives the portfolio rank chip +
// /leaderboards sidebar "my ranks" summary.
func (r *PredictSQLRepo) ListUserRanks(ctx context.Context, userID string) ([]PredictEntry, error) {
	if strings.TrimSpace(userID) == "" {
		return nil, nil
	}
	rows, err := r.db.QueryContext(ctx, `
		WITH latest_per_board AS (
			SELECT board_id, MAX(window_start) AS window_start
			FROM leaderboard_snapshots
			GROUP BY board_id
		)
		SELECT ls.board_id, ls.rank,
		       COALESCE(NULLIF(p.username, ''), substring(ls.user_id, 1, 10)) AS display_name,
		       ls.metric_value, ls.window_start, ls.window_end
		FROM leaderboard_snapshots ls
		JOIN latest_per_board lpb USING (board_id, window_start)
		LEFT JOIN punters p ON p.id = ls.user_id
		WHERE ls.user_id = $1
		ORDER BY ls.rank ASC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []PredictEntry
	for rows.Next() {
		e := PredictEntry{UserID: userID}
		if err := rows.Scan(&e.BoardID, &e.Rank, &e.DisplayName, &e.MetricValue, &e.WindowStart, &e.WindowEnd); err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

// Recompute helpers. Each runs in its own transaction: delete the snapshot
// rows for the current window, then repopulate from the source tables.
// Returns the number of rows inserted.
//
// The delete + insert pattern means a user who drops below the qualification
// bar between ticks disappears from the board — correct per plan §2.

func (r *PredictSQLRepo) RecomputeAccuracy(ctx context.Context, windowStart, windowEnd time.Time) (int, error) {
	return r.recomputeTx(ctx, PredictBoardAccuracy, windowStart, windowEnd, func(tx *sql.Tx) (int, error) {
		res, err := tx.ExecContext(ctx, `
			INSERT INTO leaderboard_snapshots
			  (board_id, user_id, metric_value, rank, window_start, window_end, computed_at)
			SELECT $1 AS board_id,
			       user_id,
			       100.0 * SUM(CASE WHEN payout_cents > 0 THEN 1 ELSE 0 END) / COUNT(*) AS accuracy_pct,
			       RANK() OVER (ORDER BY 100.0 * SUM(CASE WHEN payout_cents > 0 THEN 1 ELSE 0 END) / COUNT(*) DESC)::int AS rank,
			       $2::timestamptz AS window_start,
			       $3::timestamptz AS window_end,
			       now() AS computed_at
			FROM prediction_payouts
			WHERE paid_at >= $2 AND paid_at < $3
			GROUP BY user_id
			HAVING COUNT(*) >= 10`,
			PredictBoardAccuracy, windowStart, windowEnd)
		if err != nil {
			return 0, err
		}
		n, _ := res.RowsAffected()
		return int(n), nil
	})
}

func (r *PredictSQLRepo) RecomputeWeeklyPnL(ctx context.Context, windowStart, windowEnd time.Time) (int, error) {
	return r.recomputeTx(ctx, PredictBoardPnLWeekly, windowStart, windowEnd, func(tx *sql.Tx) (int, error) {
		res, err := tx.ExecContext(ctx, `
			INSERT INTO leaderboard_snapshots
			  (board_id, user_id, metric_value, rank, window_start, window_end, computed_at)
			SELECT $1 AS board_id,
			       user_id,
			       SUM(pnl_cents)::numeric AS pnl_cents,
			       RANK() OVER (ORDER BY SUM(pnl_cents) DESC)::int AS rank,
			       $2::timestamptz AS window_start,
			       $3::timestamptz AS window_end,
			       now() AS computed_at
			FROM prediction_payouts
			WHERE paid_at >= $2 AND paid_at < $3
			GROUP BY user_id
			HAVING COUNT(*) >= 1`,
			PredictBoardPnLWeekly, windowStart, windowEnd)
		if err != nil {
			return 0, err
		}
		n, _ := res.RowsAffected()
		return int(n), nil
	})
}

func (r *PredictSQLRepo) RecomputeSharpness(ctx context.Context, windowStart, windowEnd time.Time, minVolumeCents int64) (int, error) {
	return r.recomputeTx(ctx, PredictBoardSharpness, windowStart, windowEnd, func(tx *sql.Tx) (int, error) {
		// Volume for a settled position = entry_price_cents × quantity.
		// Sharpness = P&L ÷ volume. Floor on volume + count keeps small-sample
		// noise off the board.
		res, err := tx.ExecContext(ctx, `
			WITH agg AS (
				SELECT user_id,
				       SUM(pnl_cents) AS pnl_total,
				       SUM(entry_price_cents::bigint * quantity::bigint) AS volume_total,
				       COUNT(*) AS settled_count
				FROM prediction_payouts
				WHERE paid_at >= $2 AND paid_at < $3
				GROUP BY user_id
				HAVING COUNT(*) >= 5
				   AND SUM(entry_price_cents::bigint * quantity::bigint) >= $4
			)
			INSERT INTO leaderboard_snapshots
			  (board_id, user_id, metric_value, rank, window_start, window_end, computed_at)
			SELECT $1 AS board_id,
			       user_id,
			       (pnl_total::numeric / NULLIF(volume_total, 0)::numeric) AS roi,
			       RANK() OVER (ORDER BY (pnl_total::numeric / NULLIF(volume_total, 0)::numeric) DESC)::int AS rank,
			       $2::timestamptz,
			       $3::timestamptz,
			       now()
			FROM agg`,
			PredictBoardSharpness, windowStart, windowEnd, minVolumeCents)
		if err != nil {
			return 0, err
		}
		n, _ := res.RowsAffected()
		return int(n), nil
	})
}

func (r *PredictSQLRepo) RecomputeCategoryChampions(ctx context.Context, categorySlug string, windowStart, windowEnd time.Time) (int, error) {
	if strings.TrimSpace(categorySlug) == "" {
		return 0, errors.New("leaderboards: category slug required")
	}
	boardID := PredictCategoryBoardID(categorySlug)
	return r.recomputeTx(ctx, boardID, windowStart, windowEnd, func(tx *sql.Tx) (int, error) {
		res, err := tx.ExecContext(ctx, `
			INSERT INTO leaderboard_snapshots
			  (board_id, user_id, metric_value, rank, window_start, window_end, computed_at)
			SELECT $1 AS board_id,
			       pp.user_id,
			       SUM(pp.pnl_cents)::numeric AS pnl_cents,
			       RANK() OVER (ORDER BY SUM(pp.pnl_cents) DESC)::int AS rank,
			       $3::timestamptz,
			       $4::timestamptz,
			       now()
			FROM prediction_payouts pp
			JOIN prediction_markets pm ON pm.id = pp.market_id
			JOIN prediction_events pe ON pe.id = pm.event_id
			JOIN prediction_categories pc ON pc.id = pe.category_id
			WHERE pp.paid_at >= $3 AND pp.paid_at < $4
			  AND pc.slug = $2
			GROUP BY pp.user_id
			HAVING COUNT(*) >= 3`,
			boardID, categorySlug, windowStart, windowEnd)
		if err != nil {
			return 0, err
		}
		n, _ := res.RowsAffected()
		return int(n), nil
	})
}

// recomputeTx wraps the delete-then-insert pattern. The PK on
// leaderboard_snapshots (board_id, user_id, window_start) keeps duplicate
// users out — but because windowStart slides on rolling boards, we also
// delete older rows for the same board when window_start changes.
func (r *PredictSQLRepo) recomputeTx(ctx context.Context, boardID string, windowStart, windowEnd time.Time, insert func(tx *sql.Tx) (int, error)) (int, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer func() { _ = tx.Rollback() }()

	// Clear any previous snapshot for this board (any window). Per plan we
	// only serve the latest window — keeping history would require different
	// read queries and a retention policy neither of which are in scope.
	if _, err := tx.ExecContext(ctx, `DELETE FROM leaderboard_snapshots WHERE board_id = $1`, boardID); err != nil {
		return 0, fmt.Errorf("clear %s: %w", boardID, err)
	}

	n, err := insert(tx)
	if err != nil {
		return 0, fmt.Errorf("insert %s: %w", boardID, err)
	}
	if err := tx.Commit(); err != nil {
		return 0, err
	}
	return n, nil
}

package loyalty

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"
)

// DB-backed loyalty tier configuration. Mirrors the GW-1 admin-repo pattern
// (prediction/sql_admin_repository.go): concrete methods on the existing
// *PredictSQLRepo, reached by the HTTP layer through a narrow reader/writer
// interface (not the shared PredictRepo interface, so test fakes stay simple).
//
// Backed by migration 021_loyalty_tier_config.sql, seeded from the tiers.go
// constants so behavior is unchanged until an admin edits a row.
//
// SCOPE: tier config only. Leaderboard config is intentionally not modeled here
// (computed boards = separate design question).

// ErrTierConfigUnsupported is returned when the wired repo doesn't implement the
// tier-config queries (e.g. an in-memory fake). Real deployments use
// *PredictSQLRepo, which does.
var ErrTierConfigUnsupported = errors.New("loyalty: tier config not supported by this repo")

// ErrTierConfigNotFound signals "no loyalty_tier_config row / unknown tier_code".
var ErrTierConfigNotFound = errors.New("loyalty: tier config row not found")

// PredictTierConfigRow mirrors one row of loyalty_tier_config. Benefits is the
// raw JSONB (either a {"k":"v"} object or a ["a","b"] array — both shapes are
// accepted; the service normalizes to the office object shape on read).
type PredictTierConfigRow struct {
	Tier                PredictTier
	TierCode            string
	DisplayName         string
	PointsThreshold     int64
	MinRolling30dPoints int64
	PointsMultiplier    float64
	Benefits            json.RawMessage
	Active              bool
	CreatedAt           time.Time
	UpdatedAt           time.Time
}

const tierConfigColumns = `tier, tier_code, display_name, points_threshold,
	min_rolling_30d_points, points_multiplier, benefits, active, created_at, updated_at`

// GetLoyaltyTierConfig returns all configured tiers ordered by rank (tier asc),
// including the Hidden (tier 0) row. The service filters Hidden out of the
// editable list. Returns an empty slice (not nil) when the table is empty so
// callers can fall back to constants.
func (r *PredictSQLRepo) GetLoyaltyTierConfig(ctx context.Context) ([]PredictTierConfigRow, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT `+tierConfigColumns+`
		FROM loyalty_tier_config
		ORDER BY tier ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []PredictTierConfigRow{}
	for rows.Next() {
		row, err := scanTierConfigRow(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, row)
	}
	return out, rows.Err()
}

// UpdateLoyaltyTierConfig upserts a single tier by tier_code and returns the
// stored row. The tier rank (PRIMARY KEY) is derived from tier_code via the
// constant mapping so the office can address rows by their stable code without
// knowing the numeric rank. Returns (nil, ErrTierConfigNotFound) when tier_code is
// not a known tier.
//
// This is an UPSERT (mirrors UpdatePunterStatus' RETURNING pattern but with
// INSERT ... ON CONFLICT) so a config that was never seeded — or a tier_code
// added later in code — can still be written.
func (r *PredictSQLRepo) UpdateLoyaltyTierConfig(ctx context.Context, in PredictTierConfigRow) (*PredictTierConfigRow, error) {
	if in.Benefits == nil || len(in.Benefits) == 0 {
		in.Benefits = json.RawMessage(`{}`)
	}
	if in.PointsMultiplier == 0 {
		in.PointsMultiplier = 1.0
	}
	row := r.db.QueryRowContext(ctx, `
		INSERT INTO loyalty_tier_config
			(tier, tier_code, display_name, points_threshold,
			 min_rolling_30d_points, points_multiplier, benefits, active, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, now(), now())
		ON CONFLICT (tier) DO UPDATE SET
			tier_code              = EXCLUDED.tier_code,
			display_name           = EXCLUDED.display_name,
			points_threshold       = EXCLUDED.points_threshold,
			min_rolling_30d_points = EXCLUDED.min_rolling_30d_points,
			points_multiplier      = EXCLUDED.points_multiplier,
			benefits               = EXCLUDED.benefits,
			active                 = EXCLUDED.active,
			updated_at             = now()
		RETURNING `+tierConfigColumns,
		int16(in.Tier), in.TierCode, in.DisplayName, in.PointsThreshold,
		in.MinRolling30dPoints, in.PointsMultiplier, string(in.Benefits), in.Active,
	)
	stored, err := scanTierConfigRow(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrTierConfigNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("loyalty: upsert tier config: %w", err)
	}
	return &stored, nil
}

func scanTierConfigRow(s interface{ Scan(...any) error }) (PredictTierConfigRow, error) {
	var (
		row      PredictTierConfigRow
		tier     int16
		benefits []byte
	)
	if err := s.Scan(
		&tier,
		&row.TierCode,
		&row.DisplayName,
		&row.PointsThreshold,
		&row.MinRolling30dPoints,
		&row.PointsMultiplier,
		&benefits,
		&row.Active,
		&row.CreatedAt,
		&row.UpdatedAt,
	); err != nil {
		return PredictTierConfigRow{}, err
	}
	row.Tier = PredictTier(tier)
	if len(benefits) > 0 {
		row.Benefits = json.RawMessage(benefits)
	} else {
		row.Benefits = json.RawMessage(`{}`)
	}
	return row, nil
}

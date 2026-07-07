package wallet

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log/slog"
)

// WageringContributionRecord represents a single point-play contribution toward
// bonus play-through completion. Field names preserve the inherited storage
// contract; launch-facing responses expose point-native aliases.
type WageringContributionRecord struct {
	PlayerBonusID      int64
	BetID              string
	BetType            string // "single", "parlay", "system"
	StakePoints        int64
	ContributionPoints int64 // after multiplier; caller is responsible for calculation
	OddsDecimal        float64
	LegCount           int
}

// WageringResult reports the outcome of recording a wagering contribution,
// including whether the bonus was completed as a result.
type WageringResult struct {
	ContributionPoints      int64 `json:"contributionPoints"`
	WageringCompletedPoints int64 `json:"wageringCompletedPoints"`
	WageringRequiredPoints  int64 `json:"wageringRequiredPoints"`
	BonusCompleted          bool  `json:"bonusCompleted"`
	ConvertedAmountPoints   int64 `json:"convertedAmountPoints"`
}

// RecordWageringContribution records a point-play contribution toward a player
// bonus. If the contribution pushes play-through past the required threshold,
// the bonus is automatically completed and remaining bonus points are converted
// to regular gameplay points.
func (s *Service) RecordWageringContribution(ctx context.Context, record WageringContributionRecord) (WageringResult, error) {
	if s.db == nil {
		return WageringResult{}, nil
	}
	if record.PlayerBonusID <= 0 || record.BetID == "" || record.ContributionPoints <= 0 {
		return WageringResult{}, ErrInvalidMutationRequest
	}
	if record.BetType == "" {
		record.BetType = "single"
	}
	if record.LegCount <= 0 {
		record.LegCount = 1
	}

	ctx, cancel := context.WithTimeout(ctx, walletDBTimeout)
	defer cancel()

	tx, err := s.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return WageringResult{}, err
	}
	defer func() { _ = tx.Rollback() }()

	// Idempotency: check if this bet's contribution was already recorded
	var existingID int64
	err = tx.QueryRowContext(ctx, `
SELECT id FROM wagering_contributions
WHERE player_bonus_id = $1 AND bet_id = $2`,
		record.PlayerBonusID, record.BetID).Scan(&existingID)
	if err == nil {
		// Already recorded — read current state and return
		return s.readWageringState(ctx, tx, record.PlayerBonusID)
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return WageringResult{}, err
	}

	// Read and lock the player bonus
	var userID, status string
	var wageringRequired, wageringCompleted, remainingAmount int64
	err = tx.QueryRowContext(ctx, `
SELECT user_id, status, wagering_required_points, wagering_completed_points, remaining_amount_points
FROM player_bonuses
WHERE id = $1
FOR UPDATE`,
		record.PlayerBonusID).Scan(&userID, &status, &wageringRequired, &wageringCompleted, &remainingAmount)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return WageringResult{}, fmt.Errorf("player bonus %d not found", record.PlayerBonusID)
		}
		return WageringResult{}, err
	}

	if status != "active" {
		return WageringResult{}, ErrBonusNotActive
	}

	// Insert the contribution record
	_, err = tx.ExecContext(ctx, `
INSERT INTO wagering_contributions (player_bonus_id, bet_id, bet_type, stake_points, contribution_points, odds_decimal, leg_count)
VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		record.PlayerBonusID, record.BetID, record.BetType,
		record.StakePoints, record.ContributionPoints,
		record.OddsDecimal, record.LegCount)
	if err != nil {
		return WageringResult{}, err
	}

	// Update cumulative wagering
	wageringCompleted += record.ContributionPoints
	_, err = tx.ExecContext(ctx, `
UPDATE player_bonuses SET wagering_completed_points = $2, updated_at = NOW()
WHERE id = $1`,
		record.PlayerBonusID, wageringCompleted)
	if err != nil {
		return WageringResult{}, err
	}

	result := WageringResult{
		ContributionPoints:      record.ContributionPoints,
		WageringCompletedPoints: wageringCompleted,
		WageringRequiredPoints:  wageringRequired,
	}

	// Check if wagering is now complete
	if wageringRequired > 0 && wageringCompleted >= wageringRequired {
		// Mark bonus as completed
		_, err = tx.ExecContext(ctx, `
UPDATE player_bonuses SET status = 'completed', completed_at = NOW(), updated_at = NOW()
WHERE id = $1`,
			record.PlayerBonusID)
		if err != nil {
			return WageringResult{}, err
		}

		if err := tx.Commit(); err != nil {
			return WageringResult{}, err
		}

		// Convert bonus points to regular gameplay points outside the inner tx
		// because ConvertBonusToReal starts its own transaction.
		idempKey := fmt.Sprintf("wagering-complete:%d", record.PlayerBonusID)
		creditEntry, err := s.ConvertBonusToReal(ctx, userID, remainingAmount, idempKey)
		if err != nil {
			slog.Error("bonus conversion failed after wagering completion",
				"playerBonusId", record.PlayerBonusID,
				"userId", userID,
				"error", err)
		} else {
			result.ConvertedAmountPoints = creditEntry.AmountPoints
		}
		result.BonusCompleted = true
		return result, nil
	}

	if err := tx.Commit(); err != nil {
		return WageringResult{}, err
	}

	return result, nil
}

func (s *Service) readWageringState(ctx context.Context, tx *sql.Tx, playerBonusID int64) (WageringResult, error) {
	var wageringRequired, wageringCompleted int64
	var status string
	err := tx.QueryRowContext(ctx, `
SELECT status, wagering_required_points, wagering_completed_points
FROM player_bonuses WHERE id = $1`,
		playerBonusID).Scan(&status, &wageringRequired, &wageringCompleted)
	if err != nil {
		return WageringResult{}, err
	}
	return WageringResult{
		WageringCompletedPoints: wageringCompleted,
		WageringRequiredPoints:  wageringRequired,
		BonusCompleted:          status == "completed",
	}, nil
}

package wallet

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log/slog"
)

// WageringContributionRecord represents a single bet's contribution toward
// bonus wagering completion.
type WageringContributionRecord struct {
	PlayerBonusID    int64
	BetID            string
	BetType          string  // "single", "parlay", "system"
	StakeCents       int64
	ContributionCents int64  // after multiplier; caller is responsible for calculation
	OddsDecimal      float64
	LegCount         int
}

// WageringResult reports the outcome of recording a wagering contribution,
// including whether the bonus was completed as a result.
type WageringResult struct {
	ContributionCents        int64 `json:"contributionCents"`
	WageringCompletedCents   int64 `json:"wageringCompletedCents"`
	WageringRequiredCents    int64 `json:"wageringRequiredCents"`
	BonusCompleted           bool  `json:"bonusCompleted"`
	ConvertedAmountCents     int64 `json:"convertedAmountCents"`
}

// RecordWageringContribution records a bet's wagering contribution toward a
// player bonus. If the contribution pushes wagering past the required
// threshold, the bonus is automatically completed and remaining bonus funds
// are converted to real money.
func (s *Service) RecordWageringContribution(record WageringContributionRecord) (WageringResult, error) {
	if s.db == nil {
		return WageringResult{}, nil
	}
	if record.PlayerBonusID <= 0 || record.BetID == "" || record.ContributionCents <= 0 {
		return WageringResult{}, ErrInvalidMutationRequest
	}
	if record.BetType == "" {
		record.BetType = "single"
	}
	if record.LegCount <= 0 {
		record.LegCount = 1
	}

	ctx, cancel := context.WithTimeout(context.Background(), walletDBTimeout)
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
SELECT user_id, status, wagering_required_cents, wagering_completed_cents, remaining_amount_cents
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
INSERT INTO wagering_contributions (player_bonus_id, bet_id, bet_type, stake_cents, contribution_cents, odds_decimal, leg_count)
VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		record.PlayerBonusID, record.BetID, record.BetType,
		record.StakeCents, record.ContributionCents,
		record.OddsDecimal, record.LegCount)
	if err != nil {
		return WageringResult{}, err
	}

	// Update cumulative wagering
	wageringCompleted += record.ContributionCents
	_, err = tx.ExecContext(ctx, `
UPDATE player_bonuses SET wagering_completed_cents = $2, updated_at = NOW()
WHERE id = $1`,
		record.PlayerBonusID, wageringCompleted)
	if err != nil {
		return WageringResult{}, err
	}

	result := WageringResult{
		ContributionCents:      record.ContributionCents,
		WageringCompletedCents: wageringCompleted,
		WageringRequiredCents:  wageringRequired,
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

		// Convert bonus to real money (outside the inner TX since ConvertBonusToReal starts its own)
		idempKey := fmt.Sprintf("wagering-complete:%d", record.PlayerBonusID)
		creditEntry, err := s.ConvertBonusToReal(userID, remainingAmount, idempKey)
		if err != nil {
			slog.Error("bonus conversion failed after wagering completion",
				"playerBonusId", record.PlayerBonusID,
				"userId", userID,
				"error", err)
		} else {
			result.ConvertedAmountCents = creditEntry.AmountCents
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
SELECT status, wagering_required_cents, wagering_completed_cents
FROM player_bonuses WHERE id = $1`,
		playerBonusID).Scan(&status, &wageringRequired, &wageringCompleted)
	if err != nil {
		return WageringResult{}, err
	}
	return WageringResult{
		WageringCompletedCents: wageringCompleted,
		WageringRequiredCents:  wageringRequired,
		BonusCompleted:         status == "completed",
	}, nil
}

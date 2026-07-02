package main

import (
	"context"
	"database/sql"
	"fmt"
)

const (
	demoActiveBonusName                 = "Demo Point-Play Bonus"
	demoActiveBonusBudgetPointsCents    = int64(1_000_000)
	demoActiveBonusGrantedPointsCents   = int64(20_000)
	demoActiveBonusRemainingPointsCents = int64(15_000)
	demoActiveBonusPlayRequiredCents    = int64(100_000)
	demoActiveBonusPlayCompletedCents   = int64(25_000)
)

// RunPhase5BonusDemo seeds one active point-play bonus grant for the demo user
// so /rewards can show the real active-bonus progress panel immediately after
// demo data is loaded.
func RunPhase5BonusDemo(ctx context.Context, db *sql.DB) (int64, error) {
	var count int64
	err := db.QueryRowContext(ctx, `
WITH campaign AS (
  INSERT INTO campaigns (
    name, description, campaign_type, status,
    start_at, end_at, budget_cents, spent_cents, max_claims,
    claim_count, rules, created_by
  )
  VALUES (
    $7,
    'Demo campaign for active point-play progress on the rewards page.',
    'custom',
    'active',
    NOW() - INTERVAL '1 day',
    NOW() + INTERVAL '14 days',
    $1,
    $2,
    500,
    1,
    '[]'::jsonb,
    'demo-seed'
  )
  RETURNING id
),
reward_rule AS (
  INSERT INTO campaign_rules (campaign_id, rule_type, rule_config)
  SELECT id, 'reward', jsonb_build_object(
    'type', 'fixed',
    'fixed_amount_cents', $2,
    'expiry_days', 14
  )
  FROM campaign
),
play_rule AS (
  INSERT INTO campaign_rules (campaign_id, rule_type, rule_config)
  SELECT id, 'wagering', jsonb_build_object(
    'multiplier', 5,
    'max_stake_contribution_cents', 5000
  )
  FROM campaign
),
grant_row AS (
  INSERT INTO player_bonuses (
    user_id, campaign_id, bonus_type, status,
    granted_amount_cents, remaining_amount_cents,
    wagering_required_cents, wagering_completed_cents,
    expires_at, metadata
  )
  SELECT
    $3,
    id,
    'custom',
    'active',
    $2,
    $4,
    $5,
    $6,
    NOW() + INTERVAL '14 days',
    jsonb_build_object(
      'campaign_name', $7,
      'granted_by', 'demo-seed',
      'reason', 'demo active bonus progress',
      'demo_seed', true
    )
  FROM campaign
  RETURNING id
)
SELECT COUNT(*) FROM grant_row`,
		demoActiveBonusBudgetPointsCents,
		demoActiveBonusGrantedPointsCents,
		demoUserID,
		demoActiveBonusRemainingPointsCents,
		demoActiveBonusPlayRequiredCents,
		demoActiveBonusPlayCompletedCents,
		demoActiveBonusName,
	).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("seed demo active bonus: %w", err)
	}
	return count, nil
}

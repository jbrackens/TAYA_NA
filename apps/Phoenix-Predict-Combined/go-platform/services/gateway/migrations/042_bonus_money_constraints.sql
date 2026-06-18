-- +goose Up
-- 042_bonus_money_constraints.sql
--
-- SECURITY-REVIEW finding #11: the bonus money columns added in
-- 011_campaigns_bonuses.sql carry no non-negativity guarantees. A bug or a
-- mis-bounded admin grant could write a negative grant/remaining/wagering
-- amount, or drive campaign budget/spend negative. These funds become
-- withdrawable real money via ConvertBonusToReal, so the DB should be the
-- last line of defence even after the service-layer bounds are in place.
--
-- We add CHECK (... >= 0) constraints on the bonus money columns in
-- player_bonuses and campaigns. PostgreSQL has no ADD CONSTRAINT IF NOT
-- EXISTS, so each constraint is wrapped in a guarded DO block keyed on
-- pg_constraint, making this migration safe to re-run on installs that may
-- already carry some of the constraints. goose still tracks it and will not
-- normally re-run it; the guards are belt-and-braces.

-- player_bonuses money columns
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'player_bonuses_granted_amount_nonneg_check'
    ) THEN
        ALTER TABLE player_bonuses
            ADD CONSTRAINT player_bonuses_granted_amount_nonneg_check
            CHECK (granted_amount_cents >= 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'player_bonuses_remaining_amount_nonneg_check'
    ) THEN
        ALTER TABLE player_bonuses
            ADD CONSTRAINT player_bonuses_remaining_amount_nonneg_check
            CHECK (remaining_amount_cents >= 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'player_bonuses_wagering_required_nonneg_check'
    ) THEN
        ALTER TABLE player_bonuses
            ADD CONSTRAINT player_bonuses_wagering_required_nonneg_check
            CHECK (wagering_required_cents >= 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'player_bonuses_wagering_completed_nonneg_check'
    ) THEN
        ALTER TABLE player_bonuses
            ADD CONSTRAINT player_bonuses_wagering_completed_nonneg_check
            CHECK (wagering_completed_cents >= 0);
    END IF;
END $$;

-- campaigns budget/spend columns (budget_cents is nullable; the CHECK passes
-- on NULL, so an uncapped campaign is unaffected).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'campaigns_budget_cents_nonneg_check'
    ) THEN
        ALTER TABLE campaigns
            ADD CONSTRAINT campaigns_budget_cents_nonneg_check
            CHECK (budget_cents IS NULL OR budget_cents >= 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'campaigns_spent_cents_nonneg_check'
    ) THEN
        ALTER TABLE campaigns
            ADD CONSTRAINT campaigns_spent_cents_nonneg_check
            CHECK (spent_cents >= 0);
    END IF;
END $$;

-- +goose Down

ALTER TABLE campaigns
    DROP CONSTRAINT IF EXISTS campaigns_spent_cents_nonneg_check;
ALTER TABLE campaigns
    DROP CONSTRAINT IF EXISTS campaigns_budget_cents_nonneg_check;
ALTER TABLE player_bonuses
    DROP CONSTRAINT IF EXISTS player_bonuses_wagering_completed_nonneg_check;
ALTER TABLE player_bonuses
    DROP CONSTRAINT IF EXISTS player_bonuses_wagering_required_nonneg_check;
ALTER TABLE player_bonuses
    DROP CONSTRAINT IF EXISTS player_bonuses_remaining_amount_nonneg_check;
ALTER TABLE player_bonuses
    DROP CONSTRAINT IF EXISTS player_bonuses_granted_amount_nonneg_check;

-- +goose Up
-- 042_bonus_money_constraints.sql
--
-- SECURITY-REVIEW finding #11: the bonus money columns added in
-- 011_campaigns_bonuses.sql carry no non-negativity guarantees. A bug or a
-- mis-bounded admin grant could write a negative grant/remaining/wagering
-- amount, or drive campaign budget/spend negative. These funds become
-- withdrawable real money via ConvertBonusToReal, so the DB is the last line of
-- defence behind the service-layer bounds.
--
-- Plain ALTER statements (NOT a DO $$ block): goose splits SQL on ';' and cannot
-- parse a dollar-quoted block without -- +goose StatementBegin/End, and these
-- need no re-run guard since goose tracks the applied version.

ALTER TABLE player_bonuses
    ADD CONSTRAINT player_bonuses_granted_amount_nonneg_check CHECK (granted_amount_cents >= 0);
ALTER TABLE player_bonuses
    ADD CONSTRAINT player_bonuses_remaining_amount_nonneg_check CHECK (remaining_amount_cents >= 0);
ALTER TABLE player_bonuses
    ADD CONSTRAINT player_bonuses_wagering_required_nonneg_check CHECK (wagering_required_cents >= 0);
ALTER TABLE player_bonuses
    ADD CONSTRAINT player_bonuses_wagering_completed_nonneg_check CHECK (wagering_completed_cents >= 0);

-- campaigns.budget_cents is nullable; the CHECK passes on NULL, so an uncapped
-- campaign is unaffected.
ALTER TABLE campaigns
    ADD CONSTRAINT campaigns_budget_cents_nonneg_check CHECK (budget_cents IS NULL OR budget_cents >= 0);
ALTER TABLE campaigns
    ADD CONSTRAINT campaigns_spent_cents_nonneg_check CHECK (spent_cents >= 0);

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

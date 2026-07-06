-- +goose Up
-- 021_loyalty_tier_config.sql
-- DB-backed loyalty tier configuration so the backoffice /loyalty/settings page
-- can edit tier names / point thresholds / benefits without a code deploy.
--
-- Until now the Predict tier table + display copy lived only as Go constants
-- (internal/loyalty/tiers.go), so the office settings page could read them
-- (GET /api/v1/admin/loyalty/config) but its save controls were inert. This
-- table makes the config persisted + admin-writable. It is seeded below with
-- the EXACT current constant values, so behavior is unchanged until an admin
-- edits a row.
--
-- SCOPE: tier config only. Leaderboard config (computed boards) is intentionally
-- out of scope — that's a separate design question (computed, not configured).
--
-- The live points-accrual runtime (settlement → loyalty.AccrueWithTx) still
-- reads the Go constants for the tier-from-balance mapping + the points formula;
-- this migration + the admin CRUD persist and serve the config for the settings
-- page. See internal/loyalty/predict_repo.go (PredictTierForPoints) and
-- predict_service.go (PredictAccrualPoints) for where the runtime still reads
-- constants — wiring those to the DB is a follow-up.

CREATE TABLE loyalty_tier_config (
    -- tier rank 0..5 matching loyalty.PredictTier. Tier 0 (Hidden) is stored so
    -- the table is the complete source of truth, but the admin API filters it
    -- out of the editable list (no display name).
    tier               SMALLINT PRIMARY KEY
        CHECK (tier BETWEEN 0 AND 5),
    -- stable machine code for the tier (the constant name, lower-cased). The
    -- office addresses tiers by tierCode in PUT /admin/loyalty/tiers/{tierCode}.
    tier_code          TEXT NOT NULL UNIQUE,
    display_name       TEXT NOT NULL DEFAULT '',
    -- lifetime points needed to reach this tier (the threshold). Maps to the
    -- office "Min Lifetime Points" field + loyalty.PredictTierThreshold* consts.
    points_threshold   BIGINT NOT NULL DEFAULT 0
        CHECK (points_threshold >= 0),
    -- optional rolling-30d points gate the office surfaces (not yet enforced at
    -- runtime; persisted so the setting round-trips).
    min_rolling_30d_points BIGINT NOT NULL DEFAULT 0
        CHECK (min_rolling_30d_points >= 0),
    -- points-formula multiplier applied when this tier's holder settles a trade.
    -- Reserved/forward-looking: the runtime formula (PredictAccrualPoints) is
    -- not yet tier-aware, so this defaults to 1.0 and is persisted for when it
    -- is wired. Kept here so all points-formula params live in one config table.
    points_multiplier  NUMERIC(6,3) NOT NULL DEFAULT 1.000
        CHECK (points_multiplier >= 0),
    -- benefit copy shown in the tier pill / rewards page. JSONB object of
    -- key→value strings (the office benefits editor) OR a JSON array of strings
    -- (the legacy constant shape). The admin reader accepts both.
    benefits           JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- whether the tier is live. Persisted so the office "Tier is active" toggle
    -- round-trips; runtime tier mapping currently treats all configured tiers as
    -- active (the constants have no active flag).
    active             BOOLEAN NOT NULL DEFAULT true,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed with the CURRENT hardcoded values from internal/loyalty/tiers.go so the
-- table reproduces today's behavior exactly. Idempotent: ON CONFLICT DO NOTHING
-- means re-running (or running after a manual edit) never clobbers admin edits.
-- Tier 0 (Hidden) has no display name and is filtered out of the editable list.
INSERT INTO loyalty_tier_config
    (tier, tier_code, display_name, points_threshold, points_multiplier, benefits, active)
VALUES
    (0, 'hidden',   '',         0,     1.000, '[]'::jsonb, true),
    (1, 'newcomer', 'Newcomer', 1,     1.000,
        '["Tier pill visible in header","Accuracy + rank tracking"]'::jsonb, true),
    (2, 'trader',   'Trader',   500,   1.000,
        '["Priority queue on new-market push notifications"]'::jsonb, true),
    (3, 'sharp',    'Sharp',    2500,  1.000,
        '["Tier-3 pill color (visual distinction)"]'::jsonb, true),
    (4, 'whale',    'Whale',    10000, 1.000,
        '["Name highlighted on Whale Ticker when you trade"]'::jsonb, true),
    (5, 'legend',   'Legend',   50000, 1.000,
        '["Legend pill color","Reserved: future perks land here"]'::jsonb, true)
ON CONFLICT (tier) DO NOTHING;

-- +goose Down
DROP TABLE IF EXISTS loyalty_tier_config;

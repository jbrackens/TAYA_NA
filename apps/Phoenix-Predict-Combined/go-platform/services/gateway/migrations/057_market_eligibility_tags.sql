-- +goose Up
-- GAP-20 (PAM spec §15 Prediction Market Account Functions): per-market
-- eligibility — a restricted market may require the trader to hold one or more
-- CRM segment tags. The invariant is "restricted players cannot access
-- restricted markets": a market with >=1 required tag is tradeable only by a
-- user who holds ALL of those tags. This table records the requirement; the
-- user-tag membership lives in the store-owned crm_user_tags (segmentation).
-- No FK to prediction_markets or crm_tags: crm_tags is created at runtime by
-- the segmentation store (not a migration), and market_id is validated at the
-- admin-write layer — an orphan requirement simply makes a market un-tradeable
-- until fixed, never opens access. A market with no rows here is unrestricted.
CREATE TABLE IF NOT EXISTS market_eligibility_tags (
    market_id UUID   NOT NULL,
    tag_id    BIGINT NOT NULL,
    PRIMARY KEY (market_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_market_eligibility_tags_market ON market_eligibility_tags (market_id);

-- +goose Down
DROP TABLE IF EXISTS market_eligibility_tags;

-- Migration: 037_add_promo_linkage_to_bets.sql
-- Purpose: Persist freebet and odds-boost linkage on sportsbook bets for truthful promo usage reporting

ALTER TABLE bets
    ADD COLUMN IF NOT EXISTS freebet_id TEXT REFERENCES freebets(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS freebet_applied_cents BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS odds_boost_id TEXT REFERENCES odds_boosts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bets_freebet_id ON bets(freebet_id);
CREATE INDEX IF NOT EXISTS idx_bets_odds_boost_id ON bets(odds_boost_id);

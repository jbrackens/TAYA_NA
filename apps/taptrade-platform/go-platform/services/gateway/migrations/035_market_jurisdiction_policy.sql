-- 035_market_jurisdiction_policy.sql
-- Audit G-matrix (per-market jurisdiction rules ABSENT, P3-07). Adds an optional
-- per-market country allow/deny overlay, evaluated AFTER the global geo gate
-- (P1-07). The global allowlist is the floor — a market policy can only further
-- restrict (deny more countries), never widen, because it runs only once the
-- global gate has already allowed the request.
--
-- Shape (JSONB), NULL = no overlay (global gate only):
--   {"mode": "deny",  "countries": ["US", "FR"]}   -- block these (on top of global)
--   {"mode": "allow", "countries": ["GB", "PH"]}   -- restrict to this subset
-- Country codes are ISO-3166 alpha-2, matched case-insensitively.

-- +goose Up
ALTER TABLE prediction_markets
  ADD COLUMN jurisdiction_policy JSONB;

-- +goose Down
ALTER TABLE prediction_markets
  DROP COLUMN IF EXISTS jurisdiction_policy;

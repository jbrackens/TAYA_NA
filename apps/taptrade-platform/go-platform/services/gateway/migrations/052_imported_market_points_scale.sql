-- +goose Up
-- 052: Imported-market volume/liquidity 100× repair (2026-07-12).
--
-- marketSelectQuery() overlaid imported catalog stats as ROUND(im.volume * 100)
-- / ROUND(im.liquidity * 100) — a cents-era conversion that survived the
-- whole-Points rename (migration 050; imported_markets.volume/liquidity are
-- already whole Points). Every read of a promoted IMP-* market therefore came
-- back 100× inflated, and the synthetic market maker's read-modify-write
-- cycle persisted the inflated read into prediction_markets (observed:
-- IMP-402FD0BF stored volume_points 15857011867 vs catalog volume
-- 158570118.67 — the frontend showed "15857.1M pts" for a 158.57M-pt market).
--
-- The query fix ships in the same release (internal/prediction/
-- sql_repository.go). This migration rescales the stored rows that carry the
-- laundering signature: promoted imports whose stored value is at least the
-- inflated catalog overlay. Native (non-IMP) markets are never touched.

UPDATE prediction_markets pm
   SET volume_points = ROUND(pm.volume_points / 100.0)::bigint,
       updated_at    = now()
 WHERE pm.ticker LIKE 'IMP-%'
   AND EXISTS (
         SELECT 1
           FROM imported_markets im
          WHERE upper(substr(im.external_hash, 1, 8)) = upper(substr(pm.ticker, 5, 8))
            AND im.volume > 0
            AND pm.volume_points >= ROUND(im.volume * 100)::bigint
       );

UPDATE prediction_markets pm
   SET liquidity_points = ROUND(pm.liquidity_points / 100.0)::bigint,
       updated_at       = now()
 WHERE pm.ticker LIKE 'IMP-%'
   AND EXISTS (
         SELECT 1
           FROM imported_markets im
          WHERE upper(substr(im.external_hash, 1, 8)) = upper(substr(pm.ticker, 5, 8))
            AND im.liquidity > 0
            AND pm.liquidity_points >= ROUND(im.liquidity * 100)::bigint
       );

-- +goose Down
-- Best-effort inverse: re-inflate promoted imports whose stored value sits at
-- catalog scale (only meaningful if rolling back to the pre-fix query).
UPDATE prediction_markets pm
   SET volume_points = pm.volume_points * 100,
       updated_at    = now()
 WHERE pm.ticker LIKE 'IMP-%'
   AND EXISTS (
         SELECT 1
           FROM imported_markets im
          WHERE upper(substr(im.external_hash, 1, 8)) = upper(substr(pm.ticker, 5, 8))
            AND im.volume > 0
            AND pm.volume_points >= ROUND(im.volume)::bigint
            AND pm.volume_points < ROUND(im.volume * 100)::bigint
       );

UPDATE prediction_markets pm
   SET liquidity_points = pm.liquidity_points * 100,
       updated_at       = now()
 WHERE pm.ticker LIKE 'IMP-%'
   AND EXISTS (
         SELECT 1
           FROM imported_markets im
          WHERE upper(substr(im.external_hash, 1, 8)) = upper(substr(pm.ticker, 5, 8))
            AND im.liquidity > 0
            AND pm.liquidity_points >= ROUND(im.liquidity)::bigint
            AND pm.liquidity_points < ROUND(im.liquidity * 100)::bigint
       );

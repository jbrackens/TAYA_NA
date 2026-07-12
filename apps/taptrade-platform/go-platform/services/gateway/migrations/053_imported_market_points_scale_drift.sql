-- +goose Up
-- 053: Imported-market 100× repair, round 2 — catalog-drift escapees
-- (2026-07-12, follow-up to 052).
--
-- 052's guard compared the stored value against the CURRENT catalog
-- (`pm.volume_points >= ROUND(im.volume * 100)`), but the laundering
-- happened against the catalog value AT WRITE TIME. Rows whose upstream
-- catalog volume grew between the laundering and the repair fell below
-- the guard and escaped (observed on the demo box: IMP-3A9130E3 stored
-- 12,309,161,502 vs catalog ~123.5M — exactly 100× an older catalog
-- reading; 2 of 50 top markets carried the signature).
--
-- This pass uses a drift-tolerant RATIO guard instead: a promoted import
-- whose stored value is 50×–200× its live catalog value can only be a
-- laundered row (organic local trading cannot multiply upstream volume
-- by 50×; a legitimately busier market tracks its catalog within single
-- digits). Native (non-IMP) markets are never touched. Idempotent: after
-- division the ratio leaves the window.

UPDATE prediction_markets pm
   SET volume_points = ROUND(pm.volume_points / 100.0)::bigint,
       updated_at    = now()
 WHERE pm.ticker LIKE 'IMP-%'
   AND EXISTS (
         SELECT 1
           FROM imported_markets im
          WHERE upper(substr(im.external_hash, 1, 8)) = upper(substr(pm.ticker, 5, 8))
            AND im.volume > 0
            AND pm.volume_points >= ROUND(im.volume * 50)::bigint
            AND pm.volume_points <= ROUND(im.volume * 200)::bigint
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
            AND pm.liquidity_points >= ROUND(im.liquidity * 50)::bigint
            AND pm.liquidity_points <= ROUND(im.liquidity * 200)::bigint
       );

-- +goose Down
-- Best-effort inverse (mirrors 052's Down): re-inflate rows that now sit
-- close to their catalog value. Only meaningful immediately after Up.
UPDATE prediction_markets pm
   SET volume_points = pm.volume_points * 100,
       updated_at    = now()
 WHERE pm.ticker LIKE 'IMP-%'
   AND EXISTS (
         SELECT 1
           FROM imported_markets im
          WHERE upper(substr(im.external_hash, 1, 8)) = upper(substr(pm.ticker, 5, 8))
            AND im.volume > 0
            AND pm.volume_points >= ROUND(im.volume * 0.5)::bigint
            AND pm.volume_points <= ROUND(im.volume * 2)::bigint
       );

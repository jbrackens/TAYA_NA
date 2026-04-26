-- +goose Up
-- 018_prediction_market_image.sql
-- Adds image_path to prediction_markets so AMM cards can render the rehosted
-- images already on disk under public/images/markets/<uuid>.<ext>. Same column
-- name as imported_markets.image_path so the promote step is a straight copy.
--
-- Also adds is_synthetic to prediction_events (lets ops distinguish synthetic
-- catalog-host events from real ones via metadata, without leaking source
-- names in the UI) and inserts a "general" category for classifier misfits.

ALTER TABLE prediction_markets
    ADD COLUMN image_path TEXT;

ALTER TABLE prediction_events
    ADD COLUMN is_synthetic BOOLEAN NOT NULL DEFAULT false;

INSERT INTO prediction_categories (id, slug, name, sort_order, active)
VALUES (
    md5('category-general')::uuid,
    'general',
    'General',
    99,
    true
)
ON CONFLICT (slug) DO NOTHING;

-- +goose Down
ALTER TABLE prediction_markets DROP COLUMN IF EXISTS image_path;
ALTER TABLE prediction_events DROP COLUMN IF EXISTS is_synthetic;
DELETE FROM prediction_categories WHERE slug = 'general';

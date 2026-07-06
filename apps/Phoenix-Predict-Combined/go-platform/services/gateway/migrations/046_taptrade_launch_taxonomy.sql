-- +goose Up
-- TapTrade launch taxonomy: keep inherited crypto records inactive and seed a
-- launch-safe esports category for fresh and migrated databases.

UPDATE prediction_categories
SET active = false,
    name = 'Legacy Crypto',
    sort_order = 98,
    updated_at = now()
WHERE slug = 'crypto';

INSERT INTO prediction_categories (id, slug, name, icon, sort_order, active)
VALUES (
    md5('category-esports')::uuid,
    'esports',
    'Esports',
    'gamepad-2',
    2,
    true
)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order,
    active = true,
    updated_at = now();

-- +goose Down
DELETE FROM prediction_categories WHERE slug = 'esports';

UPDATE prediction_categories
SET active = true,
    name = 'Crypto',
    icon = 'bitcoin',
    sort_order = 2,
    updated_at = now()
WHERE slug = 'crypto';

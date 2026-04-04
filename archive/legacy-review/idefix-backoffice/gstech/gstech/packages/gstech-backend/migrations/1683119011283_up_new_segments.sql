-- VIE brand segments
INSERT INTO segments ("brandId", "name")
SELECT
    'VB',
    a.name
FROM segments a
WHERE a."brandId" = 'LD'
ON CONFLICT DO NOTHING;

-- Freshspins brand segments
INSERT INTO segments ("brandId", "name")
SELECT
    'SN',
    a.name
FROM segments a
WHERE a."brandId" = 'LD'
ON CONFLICT DO NOTHING;

-- Hipspin brand segments
INSERT INTO segments ("brandId", "name")
SELECT
    'FK',
    a.name
FROM segments a
WHERE a."brandId" = 'LD'
ON CONFLICT DO NOTHING;

WITH brands_to_insert AS (
    SELECT id
    FROM brands
),
new_segments AS (
    SELECT unnest(ARRAY['active', 'lapsed', 'long_term_lapsed']) AS new_segment
)
INSERT INTO segments ("brandId", "name")
SELECT id, new_segment
FROM brands_to_insert, new_segments;

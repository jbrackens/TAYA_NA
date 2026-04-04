INSERT INTO currencies ("id", "brandId", "isActive") VALUES ('EUR', 'OS', true) ON CONFLICT DO NOTHING;

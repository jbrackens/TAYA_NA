-- Phoenix Platform Database Migrations
-- Migration: 028_add_external_id_to_markets.sql
-- Purpose: Track provider market identifiers for supplier sync parity
-- Dependencies: 005_create_markets.sql
-- Date: 2026-03-12

ALTER TABLE markets
ADD COLUMN IF NOT EXISTS external_id VARCHAR(128);

CREATE UNIQUE INDEX IF NOT EXISTS idx_markets_external_id
ON markets(external_id)
WHERE external_id IS NOT NULL;

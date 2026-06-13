-- Phoenix Platform Database Migrations
-- Migration: 001_create_extensions.sql
-- Purpose: Create required PostgreSQL extensions
-- Date: 2026-03-07

-- Up
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Down
DROP EXTENSION IF EXISTS "pgcrypto" CASCADE;
DROP EXTENSION IF EXISTS "uuid-ossp" CASCADE;

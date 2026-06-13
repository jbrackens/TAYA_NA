-- Phoenix Platform Database Migrations
-- Migration: 041_add_session_limit_types.sql
-- Purpose: Add periodized session-limit storage to compliance limits
-- Dependencies: 012_create_compliance.sql
-- Date: 2026-03-17

-- Up
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_enum e ON e.enumtypid = t.oid
        WHERE t.typname = 'compliance_limit_type'
          AND e.enumlabel = 'daily_session'
    ) THEN
        ALTER TYPE compliance_limit_type ADD VALUE 'daily_session';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_enum e ON e.enumtypid = t.oid
        WHERE t.typname = 'compliance_limit_type'
          AND e.enumlabel = 'weekly_session'
    ) THEN
        ALTER TYPE compliance_limit_type ADD VALUE 'weekly_session';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_enum e ON e.enumtypid = t.oid
        WHERE t.typname = 'compliance_limit_type'
          AND e.enumlabel = 'monthly_session'
    ) THEN
        ALTER TYPE compliance_limit_type ADD VALUE 'monthly_session';
    END IF;
END $$;

-- Down
-- Enum values are intentionally left in place because PostgreSQL does not support dropping individual enum values safely.

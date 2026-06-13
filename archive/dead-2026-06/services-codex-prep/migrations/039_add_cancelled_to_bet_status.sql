-- Phoenix Platform Database Migrations
-- Migration: 039_add_cancelled_to_bet_status.sql
-- Purpose: Align sportsbook bet enums with the delivered admin cancel lifecycle
-- Dependencies: 006_create_bets.sql
-- Date: 2026-03-17

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_enum e ON e.enumtypid = t.oid
        WHERE t.typname = 'bet_status'
          AND e.enumlabel = 'cancelled'
    ) THEN
        ALTER TYPE bet_status ADD VALUE 'cancelled';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_enum e ON e.enumtypid = t.oid
        WHERE t.typname = 'bet_leg_status'
          AND e.enumlabel = 'cancelled'
    ) THEN
        ALTER TYPE bet_leg_status ADD VALUE 'cancelled';
    END IF;
END $$;

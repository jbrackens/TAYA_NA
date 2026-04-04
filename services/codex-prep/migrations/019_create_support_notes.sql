-- Phoenix Platform Database Migrations
-- Migration: 019_create_support_notes.sql
-- Purpose: Create support notes table for backoffice/operator timelines
-- Dependencies: 001_create_extensions.sql, 002_create_users.sql
-- Date: 2026-03-10

-- Up
CREATE TYPE support_note_type AS ENUM ('manual', 'system');

CREATE TABLE support_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    author_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    note_type support_note_type NOT NULL,
    note_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_support_notes_owner_created_at ON support_notes(owner_user_id, created_at DESC);
CREATE INDEX idx_support_notes_author ON support_notes(author_user_id);
CREATE INDEX idx_support_notes_type ON support_notes(note_type);

-- Down
DROP TABLE IF EXISTS support_notes CASCADE;
DROP TYPE IF EXISTS support_note_type CASCADE;

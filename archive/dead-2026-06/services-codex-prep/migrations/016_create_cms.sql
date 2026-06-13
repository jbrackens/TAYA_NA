-- Phoenix Platform Database Migrations
-- Migration: 016_create_cms.sql
-- Purpose: Create CMS pages, promotions, and banners tables
-- Dependencies: 002_create_users.sql, 010_create_event_store.sql
-- Date: 2026-03-08

-- Up
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'content_editor';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'marketing';

CREATE TABLE cms_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    content TEXT NOT NULL,
    meta_title VARCHAR(255) NOT NULL,
    published BOOLEAN NOT NULL DEFAULT FALSE,
    published_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cms_promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    promotion_type VARCHAR(64) NOT NULL,
    rules JSONB NOT NULL DEFAULT '{}'::jsonb,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    active BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cms_banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    image_url TEXT NOT NULL,
    link TEXT NOT NULL,
    position VARCHAR(64) NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cms_pages_published ON cms_pages(published, published_at DESC, created_at DESC);
CREATE INDEX idx_cms_promotions_active ON cms_promotions(active, start_date, end_date);
CREATE INDEX idx_cms_banners_position_active ON cms_banners(position, active, start_date, end_date);

-- Down
DROP TABLE IF EXISTS cms_banners CASCADE;
DROP TABLE IF EXISTS cms_promotions CASCADE;
DROP TABLE IF EXISTS cms_pages CASCADE;

-- Phoenix Platform Database Migrations
-- Migration: 007_create_notifications.sql
-- Purpose: Create notification templates and logs
-- Dependencies: 002_create_users.sql
-- Date: 2026-03-07

-- Up
CREATE TYPE notification_channel AS ENUM ('email', 'push', 'sms', 'in_app');
CREATE TYPE notification_status AS ENUM ('sent', 'failed', 'pending', 'bounced', 'unsubscribed');

CREATE TABLE notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(64) NOT NULL UNIQUE,
    channel notification_channel NOT NULL,
    subject_template TEXT,
    body_template TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notification_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES notification_templates(id) ON DELETE RESTRICT,
    channel notification_channel NOT NULL,
    status notification_status NOT NULL DEFAULT 'pending',
    sent_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_notification_templates_type ON notification_templates(type);
CREATE INDEX idx_notification_templates_is_active ON notification_templates(is_active);
CREATE INDEX idx_notification_log_user_id ON notification_log(user_id);
CREATE INDEX idx_notification_log_template_id ON notification_log(template_id);
CREATE INDEX idx_notification_log_channel ON notification_log(channel);
CREATE INDEX idx_notification_log_status ON notification_log(status);
CREATE INDEX idx_notification_log_created_at ON notification_log(created_at);
CREATE INDEX idx_notification_log_sent_at ON notification_log(sent_at);

-- Down
DROP TABLE IF EXISTS notification_log CASCADE;
DROP TABLE IF EXISTS notification_templates CASCADE;
DROP TYPE IF EXISTS notification_status CASCADE;
DROP TYPE IF EXISTS notification_channel CASCADE;

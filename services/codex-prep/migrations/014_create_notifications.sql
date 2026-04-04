-- Phoenix Platform Database Migrations
-- Migration: 014_create_notifications.sql
-- Purpose: Create notification tables, preferences, and templates
-- Dependencies: 002_create_users.sql, 010_create_event_store.sql
-- Date: 2026-03-08

-- Up
ALTER TABLE notification_templates
    ADD COLUMN IF NOT EXISTS name VARCHAR(200),
    ADD COLUMN IF NOT EXISTS push_title VARCHAR(200),
    ADD COLUMN IF NOT EXISTS push_body TEXT,
    ADD COLUMN IF NOT EXISTS sms_body TEXT;

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(100) NOT NULL,
    template_id VARCHAR(64) REFERENCES notification_templates(type) ON DELETE SET NULL,
    variables JSONB NOT NULL DEFAULT '{}'::jsonb,
    priority VARCHAR(32) NOT NULL DEFAULT 'normal',
    status VARCHAR(32) NOT NULL DEFAULT 'queued',
    queued_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notification_channel_statuses (
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    channel VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL,
    delivered_at TIMESTAMPTZ,
    error_message TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (notification_id, channel)
);

CREATE TABLE notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    marketing_emails BOOLEAN NOT NULL DEFAULT TRUE,
    bet_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    promotional_sms BOOLEAN NOT NULL DEFAULT FALSE,
    push_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    quiet_hours_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id, queued_at DESC);
CREATE INDEX idx_notifications_status ON notifications(status, queued_at DESC);
CREATE INDEX idx_notifications_type ON notifications(notification_type, queued_at DESC);
CREATE INDEX idx_notification_channel_statuses_status ON notification_channel_statuses(status, updated_at DESC);

INSERT INTO notification_templates (type, channel, name, subject_template, body_template, push_title, push_body, sms_body, is_active)
VALUES
    ('bet_settled_win', 'email', 'Bet Won', 'Congratulations! Your bet won!', 'Your bet on {market} has won. You earned {profit}.', 'Bet Won', 'You won {profit} on {market}.', 'Bet won! +{profit} in your account.', TRUE),
    ('bet_settled_loss', 'email', 'Bet Lost', 'Your bet has settled', 'Your bet on {market} has settled without profit.', 'Bet Settled', 'Your bet on {market} has settled.', 'Bet settled on {market}.', TRUE),
    ('verification_email', 'email', 'Verify Email', 'Verify your Phoenix account', 'Use code {code} to verify your Phoenix account.', 'Verify Account', 'Verify your Phoenix account with code {code}.', 'Phoenix verification code: {code}', TRUE)
ON CONFLICT (type) DO UPDATE SET
    name = EXCLUDED.name,
    subject_template = EXCLUDED.subject_template,
    body_template = EXCLUDED.body_template,
    push_title = EXCLUDED.push_title,
    push_body = EXCLUDED.push_body,
    sms_body = EXCLUDED.sms_body,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- Down
DROP TABLE IF EXISTS notification_preferences CASCADE;
DROP TABLE IF EXISTS notification_channel_statuses CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;

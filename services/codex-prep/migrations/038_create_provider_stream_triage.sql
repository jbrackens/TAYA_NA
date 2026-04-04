-- Phoenix Platform Database Migrations
-- Migration: 038_create_provider_stream_triage.sql
-- Purpose: Persist provider stream triage acknowledgements and SLA settings for ops backoffice parity
-- Dependencies: 009_create_audit_log.sql
-- Date: 2026-03-16

CREATE TABLE IF NOT EXISTS provider_stream_acknowledgements (
    stream_key TEXT PRIMARY KEY,
    adapter TEXT NOT NULL,
    stream TEXT NOT NULL,
    operator TEXT NOT NULL,
    note TEXT NOT NULL,
    status TEXT NOT NULL,
    last_action TEXT NOT NULL,
    acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_provider_stream_acknowledgements_adapter_stream
    ON provider_stream_acknowledgements(adapter, stream);

CREATE INDEX IF NOT EXISTS idx_provider_stream_acknowledgements_status
    ON provider_stream_acknowledgements(status, updated_at DESC);

CREATE TABLE IF NOT EXISTS provider_acknowledgement_sla_settings (
    adapter TEXT PRIMARY KEY,
    warning_minutes INTEGER NOT NULL,
    critical_minutes INTEGER NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by TEXT NOT NULL DEFAULT ''
);

INSERT INTO provider_acknowledgement_sla_settings (
    adapter,
    warning_minutes,
    critical_minutes,
    updated_at,
    updated_by
)
VALUES ('', 15, 30, NOW(), 'migration:038')
ON CONFLICT (adapter) DO NOTHING;

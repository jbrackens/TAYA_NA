-- Phoenix Platform Database Migrations
-- Migration: 009_create_audit_log.sql
-- Purpose: Create audit log table partitioned by created_at for operational compliance
-- Dependencies: 002_create_users.sql
-- Date: 2026-03-07

-- Up
CREATE TABLE audit_log (
    id UUID NOT NULL,
    user_id UUID,
    action VARCHAR(128) NOT NULL,
    entity_type VARCHAR(128) NOT NULL,
    entity_id VARCHAR(255),
    old_value JSONB,
    new_value JSONB,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create initial monthly partitions
CREATE TABLE audit_log_2026_01 PARTITION OF audit_log
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE audit_log_2026_02 PARTITION OF audit_log
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

CREATE TABLE audit_log_2026_03 PARTITION OF audit_log
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

CREATE TABLE audit_log_2026_04 PARTITION OF audit_log
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

-- Create partitions for future months
CREATE TABLE audit_log_2026_05 PARTITION OF audit_log
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

CREATE TABLE audit_log_2026_06 PARTITION OF audit_log
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

CREATE TABLE audit_log_2026_07 PARTITION OF audit_log
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

CREATE TABLE audit_log_2026_08 PARTITION OF audit_log
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');

CREATE TABLE audit_log_2026_09 PARTITION OF audit_log
    FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');

CREATE TABLE audit_log_2026_10 PARTITION OF audit_log
    FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');

CREATE TABLE audit_log_2026_11 PARTITION OF audit_log
    FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');

CREATE TABLE audit_log_2026_12 PARTITION OF audit_log
    FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');

-- Create indexes on partitions
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_entity_type ON audit_log(entity_type);
CREATE INDEX idx_audit_log_entity_id ON audit_log(entity_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);

-- Function to automatically create new monthly partitions
CREATE OR REPLACE FUNCTION audit_log_create_partition()
RETURNS void AS $$
DECLARE
    v_year INTEGER;
    v_month INTEGER;
    v_start_date DATE;
    v_end_date DATE;
    v_partition_name TEXT;
BEGIN
    -- Get next month
    v_year := EXTRACT(YEAR FROM CURRENT_DATE);
    v_month := EXTRACT(MONTH FROM CURRENT_DATE) + 1;

    IF v_month > 12 THEN
        v_month := 1;
        v_year := v_year + 1;
    END IF;

    v_start_date := to_date(v_year || '-' || LPAD(v_month::text, 2, '0') || '-01', 'YYYY-MM-DD');
    v_end_date := v_start_date + INTERVAL '1 month';
    v_partition_name := 'audit_log_' || to_char(v_start_date, 'YYYY_MM');

    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF audit_log FOR VALUES FROM (%L) TO (%L)',
        v_partition_name,
        v_start_date::timestamp with time zone,
        v_end_date::timestamp with time zone
    );
END;
$$ LANGUAGE plpgsql;

-- Down
DROP FUNCTION IF EXISTS audit_log_create_partition();
DROP TABLE IF EXISTS audit_log CASCADE;

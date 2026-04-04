--liquibase formatted sql
--changeset author:flipsports.com id:init
-- Copied from https://github.com/akka/akka-persistence-jdbc/blob/v5.0.4/core/src/main/resources/schema/postgres/postgres-create-schema.sql
CREATE TABLE IF NOT EXISTS public.durable_state (
    global_offset BIGSERIAL,
    persistence_id VARCHAR(255) NOT NULL,
    revision BIGINT NOT NULL,
    state_payload BYTEA NOT NULL,
    state_serial_id INTEGER NOT NULL,
    state_serial_manifest VARCHAR(255),
    tag VARCHAR,
    state_timestamp BIGINT NOT NULL,
    PRIMARY KEY(persistence_id)
    );
CREATE INDEX state_tag_idx on public.durable_state (tag);
CREATE INDEX state_global_offset_idx on public.durable_state (global_offset);

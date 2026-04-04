CREATE TABLE audit_log_entries (
    id          bigserial       NOT NULL PRIMARY KEY,
    created_at  timestamptz     NOT NULL,
    entry       jsonb           NOT NULL
);
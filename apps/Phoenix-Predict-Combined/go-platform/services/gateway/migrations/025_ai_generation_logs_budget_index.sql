-- +goose Up
-- 025_ai_generation_logs_budget_index.sql
-- The per-admin AI budget pre-flight (Service.AIUsage / CheckAIBudget) filters
-- prediction_ai_generation_logs by (created_by, created_at) on EVERY draft.
-- Migration 024 indexed only the foreign keys (article_source_id, market_id),
-- leaving that hot query to sequential-scan. Add a covering composite index.

CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_created_by_at
    ON prediction_ai_generation_logs (created_by, created_at);

-- +goose Down
DROP INDEX IF EXISTS idx_ai_generation_logs_created_by_at;

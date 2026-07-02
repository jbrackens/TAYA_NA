-- 036_audit_append_only.sql
-- Audit CMP-02/03 (P3-06). DB-enforce append-only on the compliance audit
-- tables: once written, an audit entry can never be altered or removed — not
-- even by the table owner. A BEFORE UPDATE/DELETE/TRUNCATE trigger fires for
-- every role (only a superuser toggling session_replication_role could bypass
-- it), which is strictly stronger than REVOKE (the owner keeps all privileges).
--
-- Verified before shipping: both tables are INSERT-only across the gateway —
-- no UPDATE/DELETE/TRUNCATE references in internal/, cmd/, or tests. INSERTs are
-- unaffected (the triggers fire only on mutation).
--
-- provider_ops_audit_log is created lazily by the app (internal/http/
-- provider_ops_audit_store.go ensureSchema), so this migration CREATEs it
-- IF NOT EXISTS first — mirroring that schema — to guarantee the trigger can
-- attach on a fresh database where the gateway has not yet booted.

-- +goose Up

CREATE TABLE IF NOT EXISTS provider_ops_audit_log (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  details TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_provider_ops_audit_occurred_at ON provider_ops_audit_log(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_provider_ops_audit_action ON provider_ops_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_provider_ops_audit_actor_id ON provider_ops_audit_log(actor_id);

-- +goose StatementBegin
CREATE OR REPLACE FUNCTION audit_log_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit table % is append-only: % is not permitted', TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

CREATE TRIGGER provider_ops_audit_log_no_mutate
  BEFORE UPDATE OR DELETE ON provider_ops_audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_append_only();
CREATE TRIGGER provider_ops_audit_log_no_truncate
  BEFORE TRUNCATE ON provider_ops_audit_log
  FOR EACH STATEMENT EXECUTE FUNCTION audit_log_append_only();

CREATE TRIGGER alpha_cashier_audit_events_no_mutate
  BEFORE UPDATE OR DELETE ON alpha_cashier_audit_events
  FOR EACH ROW EXECUTE FUNCTION audit_log_append_only();
CREATE TRIGGER alpha_cashier_audit_events_no_truncate
  BEFORE TRUNCATE ON alpha_cashier_audit_events
  FOR EACH STATEMENT EXECUTE FUNCTION audit_log_append_only();

-- +goose Down
DROP TRIGGER IF EXISTS alpha_cashier_audit_events_no_truncate ON alpha_cashier_audit_events;
DROP TRIGGER IF EXISTS alpha_cashier_audit_events_no_mutate ON alpha_cashier_audit_events;
DROP TRIGGER IF EXISTS provider_ops_audit_log_no_truncate ON provider_ops_audit_log;
DROP TRIGGER IF EXISTS provider_ops_audit_log_no_mutate ON provider_ops_audit_log;
DROP FUNCTION IF EXISTS audit_log_append_only();

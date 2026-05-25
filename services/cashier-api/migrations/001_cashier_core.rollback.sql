-- Rollback for 001_cashier_core.sql.
-- Local/test rollback artifact only. Production rollback requires explicit
-- incident approval, data-retention review, and a point-in-time backup.

DROP TRIGGER IF EXISTS cashier_runtime_flags_touch_updated_at ON cashier_runtime_flags;
DROP TRIGGER IF EXISTS recovery_cases_touch_updated_at ON recovery_cases;
DROP TRIGGER IF EXISTS relayer_submissions_touch_updated_at ON relayer_submissions;
DROP TRIGGER IF EXISTS withdrawal_intents_touch_updated_at ON withdrawal_intents;
DROP TRIGGER IF EXISTS deposit_intents_touch_updated_at ON deposit_intents;
DROP TRIGGER IF EXISTS cashier_wallets_touch_updated_at ON cashier_wallets;

DROP TRIGGER IF EXISTS recovery_cases_status_transition_guard ON recovery_cases;
DROP TRIGGER IF EXISTS relayer_submissions_status_transition_guard ON relayer_submissions;
DROP TRIGGER IF EXISTS withdrawal_intents_status_transition_guard ON withdrawal_intents;
DROP TRIGGER IF EXISTS deposit_intents_status_transition_guard ON deposit_intents;

DROP INDEX IF EXISTS reconciliation_items_status_idx;
DROP INDEX IF EXISTS recovery_cases_assignee_idx;
DROP INDEX IF EXISTS recovery_cases_queue_idx;
DROP INDEX IF EXISTS relayer_submissions_pending_idx;
DROP INDEX IF EXISTS relayer_submissions_user_created_at_idx;
DROP INDEX IF EXISTS withdrawal_intents_pending_idx;
DROP INDEX IF EXISTS withdrawal_intents_user_created_at_idx;
DROP INDEX IF EXISTS bridge_events_provider_request_idx;
DROP INDEX IF EXISTS bridge_events_deposit_intent_idx;
DROP INDEX IF EXISTS deposit_intents_provider_request_idx;
DROP INDEX IF EXISTS deposit_intents_non_terminal_idx;
DROP INDEX IF EXISTS deposit_intents_user_created_at_idx;
DROP INDEX IF EXISTS deposit_intents_source_tx_hash_unique;

DROP TABLE IF EXISTS reconciliation_items;
DROP TABLE IF EXISTS reconciliation_reports;
DROP TABLE IF EXISTS recovery_approvals;
DROP TABLE IF EXISTS cashier_runtime_flags;
DROP TABLE IF EXISTS cashier_audit_events;
DROP TABLE IF EXISTS recovery_cases;
DROP TABLE IF EXISTS compliance_decisions;
DROP TABLE IF EXISTS relayer_submissions;
DROP TABLE IF EXISTS withdrawal_intents;
DROP TABLE IF EXISTS bridge_events;
DROP TABLE IF EXISTS deposit_intents;
DROP TABLE IF EXISTS cashier_wallets;

DROP FUNCTION IF EXISTS enforce_recovery_case_status_transition();
DROP FUNCTION IF EXISTS enforce_relayer_submission_status_transition();
DROP FUNCTION IF EXISTS enforce_withdrawal_intent_status_transition();
DROP FUNCTION IF EXISTS set_cashier_updated_at();
DROP FUNCTION IF EXISTS enforce_deposit_intent_status_transition();

-- Hula Na! Cashier core schema.
-- Provider-independent and safe for local/test environments.
-- Production rollout needs a migration framework wrapper and rollback policy.

CREATE TABLE IF NOT EXISTS cashier_wallets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  embedded_wallet_address TEXT NOT NULL,
  smart_wallet_address TEXT NOT NULL,
  settlement_chain TEXT NOT NULL,
  smart_wallet_provider TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (embedded_wallet_address ~ '^0x[a-fA-F0-9]{40}$'),
  CHECK (smart_wallet_address ~ '^0x[a-fA-F0-9]{40}$'),
  UNIQUE (settlement_chain, smart_wallet_address)
);

CREATE TABLE IF NOT EXISTS deposit_intents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  rail TEXT NOT NULL,
  status TEXT NOT NULL,
  source_chain TEXT NOT NULL,
  source_asset TEXT NOT NULL,
  source_decimals INTEGER NOT NULL,
  settlement_chain TEXT NOT NULL,
  settlement_asset TEXT NOT NULL,
  destination_wallet_address TEXT NOT NULL,
  provider TEXT,
  provider_request_id TEXT,
  deposit_address TEXT,
  expected_source_units TEXT,
  actual_source_units TEXT,
  settled_units TEXT,
  source_tx_hash TEXT,
  destination_tx_hash TEXT,
  recovery_reason TEXT,
  idempotency_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (status IN ('created', 'address_issued', 'source_detected', 'bridging', 'settled', 'recovery_required', 'failed')),
  CHECK (rail IN ('tron-usdt-deposit-address', 'evm-stablecoin-direct', 'manual-recovery')),
  CHECK (source_asset IN ('USDT', 'USDC', 'hUSD')),
  CHECK (settlement_asset IN ('USDT', 'USDC', 'hUSD')),
  CHECK (source_decimals IN (6, 18)),
  CHECK (source_chain <> 'tron' OR source_asset <> 'USDT' OR source_decimals = 6),
  CHECK (source_chain <> 'bsc' OR source_asset <> 'USDT' OR source_decimals = 18),
  CHECK (source_chain <> 'polygon' OR source_asset <> 'USDC' OR source_decimals = 6),
  CHECK (expected_source_units IS NULL OR expected_source_units ~ '^(0|[1-9][0-9]*)$'),
  CHECK (actual_source_units IS NULL OR actual_source_units ~ '^(0|[1-9][0-9]*)$'),
  CHECK (settled_units IS NULL OR settled_units ~ '^(0|[1-9][0-9]*)$'),
  CHECK (destination_wallet_address ~ '^0x[a-fA-F0-9]{40}$'),
  CHECK (destination_tx_hash IS NULL OR destination_tx_hash ~ '^0x[a-fA-F0-9]{64}$'),
  UNIQUE (user_id, idempotency_key),
  UNIQUE (provider, provider_request_id),
  UNIQUE (settlement_chain, destination_tx_hash)
);

CREATE UNIQUE INDEX IF NOT EXISTS deposit_intents_source_tx_hash_unique
  ON deposit_intents (source_chain, source_tx_hash)
  WHERE source_tx_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS deposit_intents_user_created_at_idx
  ON deposit_intents (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS deposit_intents_non_terminal_idx
  ON deposit_intents (status, updated_at)
  WHERE status NOT IN ('settled', 'recovery_required', 'failed');

CREATE INDEX IF NOT EXISTS deposit_intents_provider_request_idx
  ON deposit_intents (provider, provider_request_id)
  WHERE provider_request_id IS NOT NULL;

CREATE OR REPLACE FUNCTION enforce_deposit_intent_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status <> OLD.status THEN
    IF OLD.status IN ('settled', 'recovery_required', 'failed') THEN
      RAISE EXCEPTION 'deposit_intent % is terminal and cannot transition from % to %', OLD.id, OLD.status, NEW.status;
    END IF;

    IF OLD.status = 'created' AND NEW.status NOT IN ('address_issued', 'recovery_required', 'failed') THEN
      RAISE EXCEPTION 'invalid deposit_intent transition from % to %', OLD.status, NEW.status;
    END IF;
    IF OLD.status = 'address_issued' AND NEW.status NOT IN ('source_detected', 'recovery_required', 'failed') THEN
      RAISE EXCEPTION 'invalid deposit_intent transition from % to %', OLD.status, NEW.status;
    END IF;
    IF OLD.status = 'source_detected' AND NEW.status NOT IN ('bridging', 'recovery_required', 'failed') THEN
      RAISE EXCEPTION 'invalid deposit_intent transition from % to %', OLD.status, NEW.status;
    END IF;
    IF OLD.status = 'bridging' AND NEW.status NOT IN ('settled', 'recovery_required', 'failed') THEN
      RAISE EXCEPTION 'invalid deposit_intent transition from % to %', OLD.status, NEW.status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS deposit_intents_status_transition_guard ON deposit_intents;
CREATE TRIGGER deposit_intents_status_transition_guard
  BEFORE UPDATE OF status ON deposit_intents
  FOR EACH ROW
  EXECUTE FUNCTION enforce_deposit_intent_status_transition();

CREATE TABLE IF NOT EXISTS bridge_events (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  provider_request_id TEXT,
  deposit_intent_id TEXT REFERENCES deposit_intents(id),
  status TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  source_chain TEXT,
  source_tx_hash TEXT,
  source_address TEXT,
  deposit_address TEXT,
  destination_chain TEXT,
  destination_tx_hash TEXT,
  destination_wallet_address TEXT,
  amount_units TEXT,
  asset TEXT,
  decimals INTEGER,
  recovery_reason TEXT,
  raw_body_sha256 TEXT,
  signature_version TEXT,
  verifier_key_id TEXT,
  observed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (status IN ('received', 'signature_verified', 'source_confirmed', 'destination_confirmed', 'ignored_duplicate', 'quarantined', 'failed')),
  CHECK (decimals IS NULL OR decimals IN (6, 18)),
  CHECK (source_chain <> 'tron' OR asset <> 'USDT' OR decimals = 6),
  CHECK (source_chain <> 'bsc' OR asset <> 'USDT' OR decimals = 18),
  CHECK (source_chain <> 'polygon' OR asset <> 'USDC' OR decimals = 6),
  CHECK (amount_units IS NULL OR amount_units ~ '^(0|[1-9][0-9]*)$'),
  CHECK (raw_body_sha256 IS NULL OR raw_body_sha256 ~ '^[a-fA-F0-9]{64}$'),
  CHECK (destination_wallet_address IS NULL OR destination_wallet_address ~ '^0x[a-fA-F0-9]{40}$'),
  CHECK (destination_tx_hash IS NULL OR destination_tx_hash ~ '^0x[a-fA-F0-9]{64}$'),
  UNIQUE (provider, raw_body_sha256)
);

CREATE INDEX IF NOT EXISTS bridge_events_deposit_intent_idx
  ON bridge_events (deposit_intent_id, observed_at DESC)
  WHERE deposit_intent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS bridge_events_provider_request_idx
  ON bridge_events (provider, provider_request_id, observed_at DESC)
  WHERE provider_request_id IS NOT NULL;

CREATE OR REPLACE FUNCTION set_cashier_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS withdrawal_intents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL,
  settlement_chain TEXT NOT NULL,
  source_wallet_address TEXT NOT NULL,
  destination_address TEXT NOT NULL,
  asset TEXT NOT NULL,
  decimals INTEGER NOT NULL,
  amount_units TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  user_authorization_hash TEXT,
  user_authorization_nonce TEXT,
  user_authorization_expires_at TIMESTAMPTZ,
  policy_decision_id TEXT,
  relayer_submission_id TEXT,
  recovery_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (status IN ('created', 'user_authorized', 'policy_approved', 'submitted', 'confirmed', 'recovery_required', 'failed')),
  CHECK (decimals IN (6, 18)),
  CHECK (settlement_chain <> 'bsc' OR asset <> 'USDT' OR decimals = 18),
  CHECK (settlement_chain <> 'polygon' OR asset <> 'USDC' OR decimals = 6),
  CHECK (asset <> 'hUSD' OR decimals = 6),
  CHECK (amount_units ~ '^(0|[1-9][0-9]*)$'),
  CHECK (source_wallet_address ~ '^0x[a-fA-F0-9]{40}$'),
  CHECK (destination_address ~ '^0x[a-fA-F0-9]{40}$'),
  CHECK (user_authorization_hash IS NULL OR user_authorization_hash ~ '^0x[a-fA-F0-9]{64}$'),
  CHECK (user_authorization_hash IS NULL OR (user_authorization_nonce IS NOT NULL AND user_authorization_expires_at IS NOT NULL)),
  UNIQUE (user_id, idempotency_key),
  UNIQUE (user_authorization_hash),
  UNIQUE (user_id, user_authorization_nonce)
);

CREATE TABLE IF NOT EXISTS relayer_submissions (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  settlement_chain TEXT NOT NULL,
  user_id TEXT NOT NULL,
  smart_wallet_address TEXT NOT NULL,
  target_contract TEXT NOT NULL,
  calldata_sha256 TEXT NOT NULL,
  user_authorization_hash TEXT NOT NULL UNIQUE,
  user_authorization_nonce TEXT NOT NULL,
  user_authorization_expires_at TIMESTAMPTZ NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  submitted_tx_hash TEXT,
  included_tx_hash TEXT,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (status IN ('queued', 'submitted', 'included', 'replaced', 'dropped', 'failed')),
  CHECK (user_authorization_expires_at > created_at),
  CHECK (smart_wallet_address ~ '^0x[a-fA-F0-9]{40}$'),
  CHECK (target_contract ~ '^0x[a-fA-F0-9]{40}$'),
  CHECK (calldata_sha256 ~ '^[a-fA-F0-9]{64}$'),
  CHECK (user_authorization_hash ~ '^0x[a-fA-F0-9]{64}$'),
  CHECK (submitted_tx_hash IS NULL OR submitted_tx_hash ~ '^0x[a-fA-F0-9]{64}$'),
  CHECK (included_tx_hash IS NULL OR included_tx_hash ~ '^0x[a-fA-F0-9]{64}$'),
  UNIQUE (settlement_chain, included_tx_hash)
);

CREATE INDEX IF NOT EXISTS withdrawal_intents_user_created_at_idx
  ON withdrawal_intents (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS withdrawal_intents_pending_idx
  ON withdrawal_intents (status, updated_at)
  WHERE status NOT IN ('confirmed', 'recovery_required', 'failed');

CREATE INDEX IF NOT EXISTS relayer_submissions_user_created_at_idx
  ON relayer_submissions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS relayer_submissions_pending_idx
  ON relayer_submissions (status, updated_at)
  WHERE status NOT IN ('included', 'failed');

CREATE OR REPLACE FUNCTION enforce_withdrawal_intent_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status <> OLD.status THEN
    IF OLD.status IN ('confirmed', 'recovery_required', 'failed') THEN
      RAISE EXCEPTION 'withdrawal_intent % is terminal and cannot transition from % to %', OLD.id, OLD.status, NEW.status;
    END IF;
    IF OLD.status = 'created' AND NEW.status NOT IN ('user_authorized', 'recovery_required', 'failed') THEN
      RAISE EXCEPTION 'invalid withdrawal_intent transition from % to %', OLD.status, NEW.status;
    END IF;
    IF OLD.status = 'user_authorized' AND NEW.status NOT IN ('policy_approved', 'recovery_required', 'failed') THEN
      RAISE EXCEPTION 'invalid withdrawal_intent transition from % to %', OLD.status, NEW.status;
    END IF;
    IF OLD.status = 'policy_approved' AND NEW.status NOT IN ('submitted', 'recovery_required', 'failed') THEN
      RAISE EXCEPTION 'invalid withdrawal_intent transition from % to %', OLD.status, NEW.status;
    END IF;
    IF OLD.status = 'submitted' AND NEW.status NOT IN ('confirmed', 'recovery_required', 'failed') THEN
      RAISE EXCEPTION 'invalid withdrawal_intent transition from % to %', OLD.status, NEW.status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS withdrawal_intents_status_transition_guard ON withdrawal_intents;
CREATE TRIGGER withdrawal_intents_status_transition_guard
  BEFORE UPDATE OF status ON withdrawal_intents
  FOR EACH ROW
  EXECUTE FUNCTION enforce_withdrawal_intent_status_transition();

CREATE OR REPLACE FUNCTION enforce_relayer_submission_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status <> OLD.status THEN
    IF OLD.status IN ('included', 'failed') THEN
      RAISE EXCEPTION 'relayer_submission % is terminal and cannot transition from % to %', OLD.id, OLD.status, NEW.status;
    END IF;
    IF OLD.status = 'queued' AND NEW.status NOT IN ('submitted', 'failed') THEN
      RAISE EXCEPTION 'invalid relayer_submission transition from % to %', OLD.status, NEW.status;
    END IF;
    IF OLD.status = 'submitted' AND NEW.status NOT IN ('included', 'replaced', 'dropped', 'failed') THEN
      RAISE EXCEPTION 'invalid relayer_submission transition from % to %', OLD.status, NEW.status;
    END IF;
    IF OLD.status = 'replaced' AND NEW.status NOT IN ('submitted', 'included', 'dropped', 'failed') THEN
      RAISE EXCEPTION 'invalid relayer_submission transition from % to %', OLD.status, NEW.status;
    END IF;
    IF OLD.status = 'dropped' AND NEW.status NOT IN ('submitted', 'failed') THEN
      RAISE EXCEPTION 'invalid relayer_submission transition from % to %', OLD.status, NEW.status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS relayer_submissions_status_transition_guard ON relayer_submissions;
CREATE TRIGGER relayer_submissions_status_transition_guard
  BEFORE UPDATE OF status ON relayer_submissions
  FOR EACH ROW
  EXECUTE FUNCTION enforce_relayer_submission_status_transition();

CREATE TABLE IF NOT EXISTS compliance_decisions (
  id TEXT PRIMARY KEY,
  subject_type TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  decision TEXT NOT NULL,
  reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  decided_at TIMESTAMPTZ NOT NULL,
  decided_by TEXT NOT NULL,
  actor_id TEXT,
  CHECK (decision IN ('allow', 'manual_review', 'quarantine', 'deny')),
  UNIQUE (subject_type, subject_id, id)
);

CREATE TABLE IF NOT EXISTS recovery_cases (
  id TEXT PRIMARY KEY,
  subject_type TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  status TEXT NOT NULL,
  recovery_reason TEXT NOT NULL,
  user_id TEXT,
  provider TEXT,
  provider_request_id TEXT,
  source_tx_hash TEXT,
  destination_tx_hash TEXT,
  assigned_operator_id TEXT,
  opened_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  closed_at TIMESTAMPTZ,
  CHECK (status IN ('triage', 'waiting_on_provider', 'waiting_on_user', 'compliance_hold', 'ready_for_release', 'closed')),
  CHECK (destination_tx_hash IS NULL OR destination_tx_hash ~ '^0x[a-fA-F0-9]{64}$'),
  UNIQUE (subject_type, subject_id)
);

CREATE INDEX IF NOT EXISTS recovery_cases_queue_idx
  ON recovery_cases (status, updated_at);

CREATE INDEX IF NOT EXISTS recovery_cases_assignee_idx
  ON recovery_cases (assigned_operator_id, updated_at)
  WHERE assigned_operator_id IS NOT NULL;

CREATE OR REPLACE FUNCTION enforce_recovery_case_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status <> OLD.status THEN
    IF OLD.status = 'closed' THEN
      RAISE EXCEPTION 'recovery_case % is terminal and cannot transition from % to %', OLD.id, OLD.status, NEW.status;
    END IF;
    IF OLD.status = 'triage' AND NEW.status NOT IN ('waiting_on_provider', 'waiting_on_user', 'compliance_hold', 'ready_for_release', 'closed') THEN
      RAISE EXCEPTION 'invalid recovery_case transition from % to %', OLD.status, NEW.status;
    END IF;
    IF OLD.status = 'waiting_on_provider' AND NEW.status NOT IN ('triage', 'waiting_on_user', 'compliance_hold', 'ready_for_release', 'closed') THEN
      RAISE EXCEPTION 'invalid recovery_case transition from % to %', OLD.status, NEW.status;
    END IF;
    IF OLD.status = 'waiting_on_user' AND NEW.status NOT IN ('triage', 'waiting_on_provider', 'compliance_hold', 'ready_for_release', 'closed') THEN
      RAISE EXCEPTION 'invalid recovery_case transition from % to %', OLD.status, NEW.status;
    END IF;
    IF OLD.status = 'compliance_hold' AND NEW.status NOT IN ('triage', 'ready_for_release', 'closed') THEN
      RAISE EXCEPTION 'invalid recovery_case transition from % to %', OLD.status, NEW.status;
    END IF;
    IF OLD.status = 'ready_for_release' AND NEW.status <> 'closed' THEN
      RAISE EXCEPTION 'invalid recovery_case transition from % to %', OLD.status, NEW.status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS recovery_cases_status_transition_guard ON recovery_cases;
CREATE TRIGGER recovery_cases_status_transition_guard
  BEFORE UPDATE OF status ON recovery_cases
  FOR EACH ROW
  EXECUTE FUNCTION enforce_recovery_case_status_transition();

CREATE TABLE IF NOT EXISTS cashier_audit_events (
  id TEXT PRIMARY KEY,
  subject_type TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_payload JSONB NOT NULL,
  payload_sha256 TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  actor_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (payload_sha256 ~ '^[a-fA-F0-9]{64}$')
);

CREATE TABLE IF NOT EXISTS cashier_runtime_flags (
  flag_key TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL,
  reason TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO cashier_runtime_flags (flag_key, enabled, reason, updated_by)
VALUES
  ('tron_deposits_enabled', FALSE, 'default fail-closed until provider testnet evidence is complete', 'migration'),
  ('evm_deposits_enabled', FALSE, 'default fail-closed until settlement chain is selected', 'migration'),
  ('withdrawals_enabled', FALSE, 'default fail-closed until relayer policy and testnet withdrawal pass', 'migration'),
  ('relayer_enabled', FALSE, 'default fail-closed until paymaster and policy checks are configured', 'migration'),
  ('provider_callbacks_enabled', FALSE, 'default fail-closed until callback signature verification is configured', 'migration')
ON CONFLICT (flag_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS recovery_approvals (
  id TEXT PRIMARY KEY,
  recovery_case_id TEXT NOT NULL REFERENCES recovery_cases(id),
  operator_id TEXT NOT NULL,
  approval_type TEXT NOT NULL,
  decision TEXT NOT NULL,
  evidence_sha256 TEXT NOT NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (decision IN ('approve', 'deny')),
  CHECK (evidence_sha256 ~ '^[a-fA-F0-9]{64}$'),
  UNIQUE (recovery_case_id, operator_id, approval_type)
);

CREATE TABLE IF NOT EXISTS reconciliation_reports (
  id TEXT PRIMARY KEY,
  business_date DATE NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL,
  generated_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_date, id)
);

CREATE TABLE IF NOT EXISTS reconciliation_items (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL REFERENCES reconciliation_reports(id),
  subject_type TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  expected_units TEXT NOT NULL,
  observed_units TEXT NOT NULL,
  asset TEXT NOT NULL,
  chain TEXT NOT NULL,
  status TEXT NOT NULL,
  provider_request_id TEXT,
  source_tx_hash TEXT,
  destination_tx_hash TEXT,
  notes TEXT,
  CHECK (status IN ('matched', 'missing_provider', 'missing_chain', 'amount_mismatch', 'quarantined')),
  CHECK (expected_units ~ '^(0|[1-9][0-9]*)$'),
  CHECK (observed_units ~ '^(0|[1-9][0-9]*)$'),
  UNIQUE (report_id, subject_type, subject_id)
);

CREATE INDEX IF NOT EXISTS reconciliation_items_status_idx
  ON reconciliation_items (report_id, status);

DROP TRIGGER IF EXISTS cashier_wallets_touch_updated_at ON cashier_wallets;
CREATE TRIGGER cashier_wallets_touch_updated_at
  BEFORE UPDATE ON cashier_wallets
  FOR EACH ROW
  EXECUTE FUNCTION set_cashier_updated_at();

DROP TRIGGER IF EXISTS deposit_intents_touch_updated_at ON deposit_intents;
CREATE TRIGGER deposit_intents_touch_updated_at
  BEFORE UPDATE ON deposit_intents
  FOR EACH ROW
  EXECUTE FUNCTION set_cashier_updated_at();

DROP TRIGGER IF EXISTS withdrawal_intents_touch_updated_at ON withdrawal_intents;
CREATE TRIGGER withdrawal_intents_touch_updated_at
  BEFORE UPDATE ON withdrawal_intents
  FOR EACH ROW
  EXECUTE FUNCTION set_cashier_updated_at();

DROP TRIGGER IF EXISTS relayer_submissions_touch_updated_at ON relayer_submissions;
CREATE TRIGGER relayer_submissions_touch_updated_at
  BEFORE UPDATE ON relayer_submissions
  FOR EACH ROW
  EXECUTE FUNCTION set_cashier_updated_at();

DROP TRIGGER IF EXISTS recovery_cases_touch_updated_at ON recovery_cases;
CREATE TRIGGER recovery_cases_touch_updated_at
  BEFORE UPDATE ON recovery_cases
  FOR EACH ROW
  EXECUTE FUNCTION set_cashier_updated_at();

DROP TRIGGER IF EXISTS cashier_runtime_flags_touch_updated_at ON cashier_runtime_flags;
CREATE TRIGGER cashier_runtime_flags_touch_updated_at
  BEFORE UPDATE ON cashier_runtime_flags
  FOR EACH ROW
  EXECUTE FUNCTION set_cashier_updated_at();

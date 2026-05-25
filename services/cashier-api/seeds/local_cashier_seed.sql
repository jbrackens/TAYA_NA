-- Deterministic local cashier seed data.
-- No secrets, no live provider credentials, and all runtime flags remain
-- fail-closed by default.

INSERT INTO cashier_wallets (
  id,
  user_id,
  embedded_wallet_address,
  smart_wallet_address,
  settlement_chain,
  smart_wallet_provider,
  created_at,
  updated_at
) VALUES (
  'wallet_test_001',
  'user_maria_001',
  '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  '0x1111111111111111111111111111111111111111',
  'polygon',
  'erc4337',
  '2026-05-25T00:00:00Z',
  '2026-05-25T00:00:00Z'
) ON CONFLICT (user_id) DO NOTHING;

INSERT INTO cashier_runtime_flags (flag_key, enabled, reason, updated_by)
VALUES
  ('tron_deposits_enabled', FALSE, 'local seed keeps Tron deposits fail-closed', 'local_seed'),
  ('evm_deposits_enabled', FALSE, 'local seed keeps EVM deposits fail-closed', 'local_seed'),
  ('withdrawals_enabled', FALSE, 'local seed keeps withdrawals fail-closed', 'local_seed'),
  ('relayer_enabled', FALSE, 'local seed keeps relayer fail-closed', 'local_seed'),
  ('provider_callbacks_enabled', FALSE, 'local seed keeps callbacks fail-closed', 'local_seed')
ON CONFLICT (flag_key) DO UPDATE
SET enabled = EXCLUDED.enabled,
    reason = EXCLUDED.reason,
    updated_by = EXCLUDED.updated_by;

INSERT INTO deposit_intents (
  id,
  user_id,
  rail,
  status,
  source_chain,
  source_asset,
  source_decimals,
  settlement_chain,
  settlement_asset,
  destination_wallet_address,
  provider,
  provider_request_id,
  deposit_address,
  expected_source_units,
  idempotency_key,
  created_at,
  updated_at
) VALUES (
  'dep_test_001',
  'user_maria_001',
  'tron-usdt-deposit-address',
  'address_issued',
  'tron',
  'USDT',
  6,
  'polygon',
  'hUSD',
  '0x1111111111111111111111111111111111111111',
  'relay',
  'relay_req_test_001',
  'TMockDepositAddressForMaria11111111111111',
  '24900000',
  'deposit-intent:user_maria_001:tron-usdt-deposit-address:polygon:2026-05-25T00:00:00.000Z',
  '2026-05-25T00:00:00Z',
  '2026-05-25T00:00:00Z'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO bridge_events (
  id,
  provider,
  provider_request_id,
  deposit_intent_id,
  status,
  idempotency_key,
  source_chain,
  source_tx_hash,
  deposit_address,
  destination_chain,
  destination_tx_hash,
  destination_wallet_address,
  amount_units,
  asset,
  decimals,
  raw_body_sha256,
  signature_version,
  verifier_key_id,
  observed_at
) VALUES (
  'bridge_evt_test_001',
  'relay',
  'relay_req_test_001',
  'dep_test_001',
  'source_confirmed',
  'relay:relay_req_test_001:tron_tx_test_001',
  'tron',
  'tron_tx_test_001',
  'TMockDepositAddressForMaria11111111111111',
  'polygon',
  '0x2222222222222222222222222222222222222222222222222222222222222222',
  '0x1111111111111111111111111111111111111111',
  '24900000',
  'USDT',
  6,
  'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'hmac-sha256-v1',
  'relay-test-key-001',
  '2026-05-25T00:09:31Z'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO withdrawal_intents (
  id,
  user_id,
  status,
  settlement_chain,
  source_wallet_address,
  destination_address,
  asset,
  decimals,
  amount_units,
  idempotency_key,
  user_authorization_hash,
  user_authorization_nonce,
  user_authorization_expires_at,
  created_at,
  updated_at
) VALUES (
  'wd_test_001',
  'user_maria_001',
  'user_authorized',
  'polygon',
  '0x1111111111111111111111111111111111111111',
  '0x7777777777777777777777777777777777777777',
  'hUSD',
  6,
  '10000000',
  'withdrawal:user_maria_001:0x7777777777777777777777777777777777777777:10000000:0x8888888888888888888888888888888888888888888888888888888888888888',
  '0x8888888888888888888888888888888888888888888888888888888888888888',
  'withdrawal:user_maria_001:000001',
  '2026-05-25T00:30:00Z',
  '2026-05-25T00:20:00Z',
  '2026-05-25T00:20:00Z'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO recovery_cases (
  id,
  subject_type,
  subject_id,
  status,
  recovery_reason,
  user_id,
  provider,
  provider_request_id,
  source_tx_hash,
  destination_tx_hash,
  opened_at,
  updated_at
) VALUES (
  'rec_test_001',
  'deposit',
  'dep_test_001',
  'triage',
  'ambiguous_source',
  'user_maria_001',
  'relay',
  'relay_req_test_001',
  'tron_tx_test_001',
  '0x5555555555555555555555555555555555555555555555555555555555555555',
  '2026-05-25T00:09:31Z',
  '2026-05-25T00:09:31Z'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO recovery_approvals (
  id,
  recovery_case_id,
  operator_id,
  approval_type,
  decision,
  evidence_sha256,
  note,
  created_at
) VALUES (
  'approval_test_001',
  'rec_test_001',
  'ops_ana',
  'release_above_beta_cap',
  'approve',
  'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  'Fixture approval for local recovery API testing.',
  '2026-05-25T00:15:00Z'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO reconciliation_reports (
  id,
  business_date,
  generated_at,
  generated_by
) VALUES (
  'recon_2026_05_25',
  '2026-05-25',
  '2026-05-25T23:59:00Z',
  'local_seed'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO reconciliation_items (
  id,
  report_id,
  subject_type,
  subject_id,
  expected_units,
  observed_units,
  asset,
  chain,
  status,
  provider_request_id,
  source_tx_hash,
  destination_tx_hash
) VALUES (
  'recon_item_001',
  'recon_2026_05_25',
  'deposit',
  'dep_test_001',
  '24900000',
  '24900000',
  'hUSD',
  'settlement',
  'matched',
  'relay_req_test_001',
  'tron_tx_test_001',
  '0x2222222222222222222222222222222222222222222222222222222222222222'
) ON CONFLICT (id) DO NOTHING;

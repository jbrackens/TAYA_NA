> **Abandoned workstream — specification only.** `services/cashier-api/` is not a running
> service and this document describes nothing that exists. The product moved to
> non-redeemable points; the gateway's cashier, crypto and payment routes are
> unmounted by default and refuse to boot in production or staging. See
> `services/cashier-api/README.md` for why this tree is still in the repository, and
> `docs/archive/cashier/` for the design record.

# Cashier API Schema Sketch

**Status:** SUPERSEDED 2026-09-06 — abandoned workstream (was: "Draft.").
**Date:** 2026-05-25.

This is the storage contract the implementation should preserve. Names can change,
but the uniqueness and transition rules should not.

## `cashier_wallets`

- `id`
- `user_id` unique
- `embedded_wallet_address`
- `smart_wallet_address`
- `settlement_chain`
- `smart_wallet_provider`
- `created_at`
- `updated_at`

Unique constraints:

- `user_id`
- `(settlement_chain, smart_wallet_address)`

Validation constraints:

- Wallet addresses must be EVM addresses.

## `deposit_intents`

- `id`
- `user_id`
- `rail`
- `status`
- `source_chain`
- `source_asset`
- `source_decimals`
- `settlement_chain`
- `settlement_asset`
- `destination_wallet_address`
- `provider`
- `provider_request_id`
- `deposit_address`
- `expected_source_units`
- `actual_source_units`
- `settled_units`
- `source_tx_hash`
- `destination_tx_hash`
- `recovery_reason`
- `idempotency_key`
- `created_at`
- `updated_at`

Unique constraints:

- `(user_id, idempotency_key)`
- `(provider, provider_request_id)` where `provider_request_id` is not null
- `(source_chain, source_tx_hash)` where `source_tx_hash` is not null and the
  provider emits one source tx per route
- `(settlement_chain, destination_tx_hash)` where `destination_tx_hash` is not null

Validation constraints:

- Amount columns are base-unit integer strings.
- Decimal metadata is limited to known V1 values: 6 or 18.
- Chain/asset decimal constraints are explicit for known V1 combinations: Tron
  USDT = 6, BSC USDT = 18, Polygon USDC = 6, hUSD = 6.
- Destination wallet and destination tx hash use EVM formats.

## `bridge_events`

- `id`
- `provider`
- `provider_request_id`
- `deposit_intent_id`
- `status`
- `idempotency_key`
- `source_chain`
- `source_tx_hash`
- `source_address`
- `deposit_address`
- `destination_chain`
- `destination_tx_hash`
- `destination_wallet_address`
- `amount_units`
- `asset`
- `decimals`
- `recovery_reason`
- `raw_body_sha256`
- `signature_version`
- `verifier_key_id`
- `observed_at`
- `created_at`

Unique constraints:

- `idempotency_key`
- `(provider, raw_body_sha256)` for callback dedupe

Validation constraints:

- `amount_units` is a base-unit integer string when present.
- `decimals` is limited to known V1 values when present.
- `raw_body_sha256` is a SHA-256 hex string when present.
- Destination wallet and destination tx hash use EVM formats when present.

## `withdrawal_intents`

- `id`
- `user_id`
- `status`
- `settlement_chain`
- `source_wallet_address`
- `destination_address`
- `asset`
- `decimals`
- `amount_units`
- `idempotency_key`
- `user_authorization_hash`
- `user_authorization_nonce`
- `user_authorization_expires_at`
- `policy_decision_id`
- `relayer_submission_id`
- `recovery_reason`
- `created_at`
- `updated_at`

Unique constraints:

- `(user_id, idempotency_key)`
- `user_authorization_hash` where not null
- `(user_id, user_authorization_nonce)` where not null

Validation constraints:

- `amount_units` is a base-unit integer string.
- `decimals` is limited to known V1 values.
- Any persisted user authorization hash must have a nonce and expiry.
- Source and destination wallet addresses must be EVM addresses for V1.
- User authorization hashes must be 32-byte hex strings when present.

## `relayer_submissions`

- `id`
- `status`
- `settlement_chain`
- `user_id`
- `smart_wallet_address`
- `target_contract`
- `calldata_sha256`
- `user_authorization_hash`
- `user_authorization_nonce`
- `user_authorization_expires_at`
- `idempotency_key`
- `submitted_tx_hash`
- `included_tx_hash`
- `failure_reason`
- `created_at`
- `updated_at`

Unique constraints:

- `idempotency_key`
- `user_authorization_hash`
- `(settlement_chain, included_tx_hash)` where not null

Validation constraints:

- Smart wallet and target contract must be EVM addresses.
- Calldata and user authorization hashes must be hex hashes.
- Submitted/included tx hashes must be EVM tx hashes when present.

## `compliance_decisions`

- `id`
- `subject_type`
- `subject_id`
- `decision`
- `reasons`
- `decided_at`
- `decided_by`
- `actor_id`

## `recovery_cases`

- `id`
- `subject_type`
- `subject_id`
- `status`
- `recovery_reason`
- `user_id`
- `provider`
- `provider_request_id`
- `source_tx_hash`
- `destination_tx_hash`
- `assigned_operator_id`
- `opened_at`
- `updated_at`
- `closed_at`

Unique constraints:

- `(subject_type, subject_id)`

## `cashier_runtime_flags`

- `flag_key`
- `enabled`
- `reason`
- `updated_by`
- `updated_at`

## `cashier_audit_events`

- `id`
- `subject_type`
- `subject_id`
- `event_type`
- `event_payload`
- `payload_sha256`
- `actor_type`
- `actor_id`
- `created_at`

Validation constraints:

- `payload_sha256` is a SHA-256 hex string.

Default flags:

- `tron_deposits_enabled = false`
- `evm_deposits_enabled = false`
- `withdrawals_enabled = false`
- `relayer_enabled = false`
- `provider_callbacks_enabled = false`

## `recovery_approvals`

- `id`
- `recovery_case_id`
- `operator_id`
- `approval_type`
- `decision`
- `evidence_sha256`
- `note`
- `created_at`

Unique constraints:

- `(recovery_case_id, operator_id, approval_type)`

Validation constraints:

- `evidence_sha256` is a SHA-256 hex string.

## `reconciliation_reports`

- `id`
- `business_date`
- `generated_at`
- `generated_by`
- `created_at`

Unique constraints:

- `(business_date, id)`

## `reconciliation_items`

- `id`
- `report_id`
- `subject_type`
- `subject_id`
- `expected_units`
- `observed_units`
- `asset`
- `chain`
- `status`
- `provider_request_id`
- `source_tx_hash`
- `destination_tx_hash`
- `notes`

Unique constraints:

- `(report_id, subject_type, subject_id)`

Validation constraints:

- `expected_units` and `observed_units` are base-unit integer strings.

## State Rules

- `settled`, `failed`, and `recovery_required` are terminal for deposit intents.
- No terminal deposit may be mutated by a later callback.
- `deposit_intents_status_transition_guard` enforces allowed deposit status
  transitions in the database.
- `withdrawal_intents_status_transition_guard` enforces allowed withdrawal status
  transitions in the database.
- `relayer_submissions_status_transition_guard` enforces allowed relayer status
  transitions in the database.
- `recovery_cases_status_transition_guard` enforces allowed recovery queue
  transitions and prevents reopening a closed case.
- `set_cashier_updated_at` keeps mutable cashier state timestamps current at the
  database boundary.
- Every bridge event must be insertable independently before it mutates an intent.
- A provider callback with invalid signature creates no row except security logs.
- A valid but unmatched callback creates a quarantined bridge event.

## Query Indexes

The migration includes indexes for:

- User-facing deposit and withdrawal history by `user_id, created_at`.
- Bridge watcher scans of non-terminal deposits.
- Provider request lookup across deposit intents and bridge events.
- Pending withdrawal and relayer queues.
- Recovery queue and operator-assignee views.
- Reconciliation item status summaries.

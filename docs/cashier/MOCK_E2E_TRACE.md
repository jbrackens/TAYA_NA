# Mock E2E Trace: Maria TRC-20 Deposit to EVM Withdrawal

**Status:** Credential-independent trace.
**Date:** 2026-05-25.

This trace is the provider-free rehearsal path. Every referenced fixture is checked
by `scripts/check-cashier-all.sh` through the SDK runtime validators.

## 1. Deposit Intent Created

Fixture:

- `services/cashier-api/fixtures/deposit-intent.created.json`

Expected state:

- `address_issued`
- source chain: `tron`
- source asset: `USDT`
- source decimals: `6`
- settlement chain: `polygon`
- settlement asset: `hUSD`

Invariant:

- The deposit is address-only. No fiat-style amount submit is allowed.

## 2. Source Detected

Fixture:

- `services/bridge-watcher/fixtures/relay-source-detected.json`

Expected transition:

- `address_issued -> source_detected`

Invariant:

- Idempotency key is stable for provider, source chain, source tx, and event index.
- Replaying this event must not create a second state transition.

## 3. Destination Confirmed

Fixture:

- `services/bridge-watcher/fixtures/relay-destination-confirmed.json`

Expected transitions:

- `source_detected -> bridging`
- replay/poll with destination evidence: `bridging -> settled`

Invariant:

- Destination wallet must match Maria's smart wallet.
- Amount is base units with explicit decimals.

## 4. Recovery Branch: Destination Mismatch

Fixtures:

- `services/bridge-watcher/fixtures/relay-quarantined-destination-mismatch.json`
- `services/cashier-api/fixtures/recovery-case.destination-mismatch.json`
- `services/cashier-api/fixtures/compliance-decision.quarantine.json`
- `services/cashier-api/fixtures/audit-event.recovery-created.json`

Expected transition:

- non-terminal deposit state -> `recovery_required`

Invariant:

- Quarantine creates a recovery case and audit event. It never credits funds.

## 5. Recovery Branch: Expired Quote

Fixture:

- `services/bridge-watcher/fixtures/relay-failed-expired-quote.json`

Expected transition:

- non-terminal deposit state -> `recovery_required`

Invariant:

- Late source funds do not auto-refund to sender because sender may be a CEX hot
  wallet.

## 6. Withdrawal Intent

Before withdrawal, the mock trace runs the provider-independent compliance policy
for the deposit amount, beta cap, daily cap, geo decision, and address screening
status.

Fixture:

- `services/cashier-api/fixtures/withdrawal-intent.created.json`

Expected state:

- `user_authorized`

Invariant:

- Any withdrawal past `created` must include a user authorization hash.
- Any withdrawal authorization must include a single-use nonce and future expiry.

## 7. Relayer Submission

Fixture:

- `services/relayer/fixtures/policy-approved-withdrawal.json`

Expected state:

- `queued`

Invariant:

- Relayer submissions require a target contract, calldata hash, smart-wallet
  address, user authorization hash, nonce, expiry, and idempotency key.

## Verification

Run:

```bash
scripts/check-cashier-all.sh
PATH="$PWD/apps/taptrade-platform/frontend/node_modules/.bin:$PATH" npm --prefix packages/cashier-sdk run build
node scripts/replay-cashier-mock-e2e.mjs
```

The check verifies:

- Legacy custodial rails remain blocked.
- SQL schema still contains required money-system tables and uniqueness guards.
- SDK state transitions reject terminal mutations.
- Fixtures satisfy runtime contracts.
- Unsafe fixture mutations are rejected.
- Compliance policy produces stable allow/manual-review/quarantine/deny outcomes.

The replay script prints the mock deposit status path, settled amount, generated
recovery case summary, deposit compliance decision, withdrawal state, and relayer
policy decision.

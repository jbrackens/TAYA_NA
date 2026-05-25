# Hula Na! Cashier: What Remains

**Date:** 2026-05-25
**Status:** Paused pending provider credentials and final stack decisions.

## Completed Without Provider Credentials

- Fail-closed cashier API handler stubs.
- Repository interfaces around the cashier SQL schema.
- Deterministic local/in-memory provider adapter and mock E2E replay.
- Recovery queue and admin API stubs with operator-auth placeholders.
- Frontend status views for non-custodial deposit and withdrawal states.
- Fixture-backed canary and reconciliation dashboard rendering.
- Go and TypeScript parity tests for state machines, reconciliation, recovery,
  idempotency, provider callbacks, decimal handling, and relayer policy.
- Local SQL migration, rollback artifact, and deterministic seed data.
- TronGrid authenticated smoke check script.

Primary verification:

```bash
make cashier-check
```

Last known result: `cashier checks passed`.

## Partially Unblocked

### TronGrid

Temporary test key was used only from the shell, not committed. The smoke check
confirmed:

- Authenticated TronGrid mainnet reads work.
- TRC-20 USDT contract reports 6 decimals on Tron.

Re-run locally with:

```bash
TRONGRID_API_KEY=... node scripts/check-trongrid-smoke.mjs
```

## Remaining Hard Blockers

### 1. Passive Tron Deposit-Address Provider

This is the main blocker.

We need one provider that can support Maria's V1 flow:

1. Show a TRC-20 USDT deposit address.
2. User sends USDT from an exchange or Tron wallet.
3. Provider detects the source transaction.
4. Provider bridges/routes funds into the user's EVM settlement wallet or
   collateral account.
5. Hula Na! receives signed status callbacks and can replay status by request ID.

Recommended first provider to pursue: **Relay**.

Needed from Relay or selected provider:

- API key or sandbox credentials.
- Webhook signing secret or public verification key.
- Confirmation that passive TRC-20 USDT deposit-address routing is supported.
- Supported EVM destination chains for stablecoin settlement.
- Request/status API docs for polling and replay.
- Callback schema and duplicate/replay behavior.
- Limits, fees, minimum deposit, expiry, and failure behavior.

Key questions to ask:

```text
1. Do you support TRON / TRC-20 USDT as an origin chain for deposit-address flows?
2. Can deposit addresses be scoped per user or per request?
3. Can funds route to a specific EVM recipient address?
4. Which destination chains are best supported for stablecoin settlement?
5. Is webhook signing done with the API key as the HMAC secret?
6. Can we get sandbox/testnet access before production?
```

### 2. Wallet and Smart Account Provider

We still need to select and credential the embedded wallet / smart-account stack.

Options:

- thirdweb embedded wallets + account abstraction.
- Privy or Web3Auth for embedded wallets plus Pimlico for ERC-4337 infra.
- Safe or a custom Polymarket-style proxy pattern if provider evidence demands it.

Needed credentials:

- Frontend client ID.
- Backend secret key.
- Bundler endpoint/key.
- Paymaster/sponsor key or policy configuration.
- Supported settlement-chain list.
- Testnet project/environment.

### 3. Settlement Chain Decision

Open decision: Polygon vs BSC vs Base/Arbitrum.

Current recommendation:

- Prefer **Polygon** if Relay/provider support is good because it is closest to
  Polymarket's posture and has mature prediction-market precedent.
- Prefer another EVM chain only if bridge, paymaster, liquidity, and direct-deposit
  evidence is materially better.

Decision inputs needed:

- Provider support for TRC-20 USDT route into destination chain.
- Gas sponsorship reliability.
- Stablecoin liquidity and decimals.
- Exchange withdrawal UX for Philippine and SEA users.
- Compliance/risk posture.

### 4. Real Provider Callback Verification

Implemented today: fixture/HMAC-style callback verification and fail-closed API
stubs.

Still needed:

- Real provider signature headers.
- Raw-body verification against provider key/secret.
- Timestamp tolerance.
- Replay protection keyed by provider request ID, tx hash, log/event index, and
  raw-body hash.
- Invalid-signature security logging.
- Duplicate-callback transcript.

### 5. Testnet E2E Evidence

Required before beta:

- Create a deposit route.
- Send source-chain test funds, or provider sandbox equivalent.
- Receive and verify provider callback.
- Insert bridge event.
- Advance deposit status without mutating terminal states.
- Reconcile cashier state against provider and chain evidence.
- Exercise recovery cases:
  - wrong token
  - wrong chain
  - under-minimum
  - expired quote
  - destination mismatch
  - duplicate callback
  - invalid signature

### 6. Relayer and Paymaster Integration

Implemented today: relayer policy model and tests.

Still needed:

- Real bundler/paymaster credentials.
- Chain-specific gas sponsorship policy.
- Nonce and expiry enforcement against live smart-account transactions.
- Withdrawal submission and confirmation tracking.
- Policy-denial integration tests against service implementation.

### 7. Operator Auth for Recovery/Admin APIs

Implemented today: operator-auth placeholders.

Still needed:

- Staff IAM/session provider.
- `cashier_operator` role mapping.
- Two-person approval enforcement in the service layer.
- Audit event persistence for every recovery/admin mutation.
- Break-glass runbook and access review.

### 8. Compliance and Production Controls

Needed before public funds:

- KYT/address-screening provider credentials.
- Geo policy approval.
- Rate limits on cashier and provider-callback endpoints.
- Secrets manager integration and rotation runbook.
- Dashboard and alert deployment.
- Canary schedule using live provider credentials.
- Backup and rollback rehearsal.
- Incident drill for stuck bridge, invalid callback spike, and provider outage.
- External contract/security review before mainnet funds.

## Secrets We Still Need

Do not commit these. Store them in an ignored `.env.local`, deploy-platform
secret store, or dedicated secret manager.

```bash
TRONGRID_API_KEY=
RELAY_API_KEY=
RELAY_WEBHOOK_SECRET_OR_PUBLIC_KEY=
THIRDWEB_CLIENT_ID=
THIRDWEB_SECRET_KEY=
PIMLICO_API_KEY=
SETTLEMENT_RPC_URL=
DATABASE_URL=
KYT_PROVIDER_API_KEY=
```

Provider names may change if we choose Privy/Web3Auth/Symbiosis/LI.FI/deBridge
instead of the current shortlist.

## Next Best Step

Request Relay API access and explicit TRC-20 USDT passive deposit-address support.
If Relay cannot support that flow, evaluate Symbiosis, LI.FI, deBridge, or a custom
provider mix against the same Maria UX bar.

The cashier should remain fail-closed until a provider passes the callback,
replay, recovery, reconciliation, and testnet E2E gates.

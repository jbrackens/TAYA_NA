# Hula Na! Cashier Phase 0-10 Execution Board

**Status:** Active.
**Date:** 2026-05-25.

Hard launch blockers are tracked in `docs/cashier/LAUNCH_BLOCKERS.md`.
Machine-readable launch readiness is tracked in
`docs/cashier/LAUNCH_READINESS_MATRIX.json`.

## Phase 0: Freeze Legacy Custody

Status: complete.

- Production startup blocks legacy `CRYPTO_*` custodial rail env vars.
- Crypto UI no longer posts fiat-style crypto deposits.
- Crypto UI no longer calls the legacy deposit-address endpoint.
- Legacy payment watcher code is labeled prototype-only.
- Local guard script checks the frontend and gateway guard regressions.
- Cashier-specific frontend typecheck filters TypeScript errors in modified
  cashier/API-client files while ignoring unrelated legacy baseline debt.

Artifact: `scripts/check-cashier-guards.sh`.
Artifact: `scripts/check-cashier-schema.mjs`.
Artifact: `scripts/check-cashier-openapi.mjs`.
Artifact: `scripts/check-cashier-all.sh`.
Artifact: `scripts/check-cashier-frontend-types.sh`.

## Phase 1: ADRs and Provider Spikes

Status: ADR pass complete; live provider transcripts pending credentials.

- ADR-001 accepted: non-custodial boundary.
- ADR-002 proposed: Relay-first Tron deposit-provider spike.
- ADR-003 proposed: Privy/thirdweb embedded-wallet shortlist.
- ADR-004 proposed: Polygon/BSC settlement shortlist.
- Provider spike transcript template created.
- Provider scorecard template created.
- Settlement-chain scorecard template created.
- Wallet-provider scorecard template created.

Exit gate still open: provider transcripts and quote/status samples must be
captured before any mainnet credential integration.

Artifact: `docs/cashier/PROVIDER_SPIKE_TRANSCRIPT_TEMPLATE.md`.
Artifact: `docs/cashier/PROVIDER_SCORECARD.md`.
Artifact: `docs/cashier/SETTLEMENT_CHAIN_SCORECARD.md`.
Artifact: `docs/cashier/WALLET_PROVIDER_SCORECARD.md`.

## Phase 2: Module Skeleton

Status: complete.

- `contracts/`: collateral, factory, and market-spend approval contracts.
- Contract guard prevents pre-audit deployable Solidity contracts from being
  introduced under the cashier contract boundary.
- `services/cashier-api/`: wallet resolution, deposit intents, status APIs, and
  signed provider callbacks.
- `services/bridge-watcher/`: provider and chain status reconciliation.
- Provider adapter scenario manifest covers duplicate callbacks, invalid
  signatures, unknown requests, under-minimum deposits, expired quotes,
  destination mismatch, missing chain evidence, provider failure, and sanctions
  quarantine.
- `services/relayer/`: gas sponsorship and signed user-operation submission.
- `packages/cashier-sdk/`: typed contract consumed by frontend and services.
- Cashier API schema migration, OpenAPI skeleton, and deterministic fixtures exist.
- SDK state-machine/idempotency tests exist.
- Go backend cashier state-machine package exists for gateway/service handlers
  that need the same fail-closed transition rules.
- Go backend cashier compliance policy package mirrors SDK cap, geo, pause, and
  address-screening decisions for future gateway handlers.
- Withdrawal and relayer authorization contracts include nonce and expiry so
  replay prevention is present before service implementation.
- Go backend runtime flag helper fails closed for missing or unknown cashier flags.
- Go backend bridge-event reducer mirrors SDK deposit transition behavior for
  callback and poll handlers.
- Go backend idempotency-key builders mirror SDK key scopes for deposits,
  withdrawals, and relayer submissions.
- Go backend decimal metadata mirrors SDK known rails and rejects ambiguous
  USDT decimal assumptions.
- Go backend provider callback helper verifies HMAC against raw body bytes and
  hashes raw payloads for callback audit evidence.
- Go backend two-person recovery approval helper requires distinct approving
  operators.
- Go backend relayer policy evaluator mirrors SDK target/selector allowlists,
  amount caps, paymaster runway, duplicate submission, pause, compliance, and
  authorization expiry denials.
- SDK runtime validators check service fixtures and reject unsafe shapes.
- Provider callback signature verification is raw-body sensitive and tested.
- Relayer policy evaluator is provider-independent and tested.
- Observability event contract exists and is checked.
- Frontend has a typed non-custodial cashier API client targeting `/v1/cashier/*`.

Exit gate: complete. Module boundaries exist and no live money movement exists.

Artifact: `services/cashier-api/migrations/001_cashier_core.sql`.
Artifact: `services/cashier-api/openapi.yaml`.
Artifact: `services/cashier-api/observability-events.json`.
Artifact: `scripts/check-cashier-contracts.mjs`.
Artifact: `packages/cashier-sdk/test/cashier-sdk.test.mjs`.
Artifact: `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/cashier/state.go`.
Artifact: `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/cashier/policy.go`.
Artifact: `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/cashier/flags.go`.
Artifact: `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/cashier/bridge.go`.
Artifact: `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/cashier/idempotency.go`.
Artifact: `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/cashier/decimals.go`.
Artifact: `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/cashier/callback.go`.
Artifact: `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/cashier/approval.go`.
Artifact: `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/cashier/relayer_policy.go`.
Artifact: `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/lib/api/noncustodial-cashier-client.ts`.

## Phase 3: Testnet Deposit Path

Status: acceptance plan written; live run blocked on provider credentials.

Build one path only: TRC-20 USDT deposit address to EVM user smart wallet/collateral.
Require 10/10 successful test deposits and restart-safe idempotency.

Artifact: `docs/cashier/TESTNET_E2E_ACCEPTANCE.md`.
Artifact: `docs/cashier/MOCK_E2E_TRACE.md`.
Artifact: `services/bridge-watcher/PROVIDER_ADAPTER_CONTRACT.md`.
Artifact: `services/bridge-watcher/fixtures/provider-scenarios.manifest.json`.
Artifact: `services/bridge-watcher/fixtures/relay-source-detected.json`.
Artifact: `services/bridge-watcher/fixtures/relay-destination-confirmed.json`.

## Phase 4: Testnet Trading Path

Status: acceptance plan written; implementation blocked on wallet/smart-account
selection.

Build gasless approve/wrap/trade/redeem flows using the selected smart-account
provider. Market contracts may be mocks until product-market contracts are final.

Artifact: `docs/cashier/TESTNET_E2E_ACCEPTANCE.md`.
Artifact: `services/relayer/fixtures/policy-approved-withdrawal.json`.
Artifact: `services/relayer/fixtures/policy-approved-market-trade.json`.

## Phase 5: Withdrawals

Status: acceptance plan written.

Implement gasless EVM withdrawal first. Tron withdrawal is fast-follow unless the
selected bridge supports a one-step non-confusing route.

Artifact: `docs/cashier/TESTNET_E2E_ACCEPTANCE.md`.

## Phase 6: Recovery and Support

Status: runbook draft written.

Recovery queues must cover wrong token, wrong chain, under-minimum deposits,
expired quotes, stuck bridge requests, duplicate callbacks, and sanctioned sources.

Artifact: `docs/cashier/RECOVERY_AND_SUPPORT_RUNBOOK.md`.
Artifact: `services/cashier-api/RECOVERY_API_CONTRACT.md`.
Artifact: `services/cashier-api/fixtures/recovery-case.destination-mismatch.json`.

## Phase 7: Compliance Controls

Status: control plan draft written; provider-independent policy evaluator added.

Add address screening, geo policy, deposit caps, manual review thresholds, and
auditable freeze/release workflows.

Artifact: `docs/cashier/COMPLIANCE_CONTROLS.md`.
Artifact: `packages/cashier-sdk/src/index.ts`.

## Phase 8: Security Hardening

Status: threat model draft written.

Threat model contracts, relayers, provider callbacks, replay protection, policy
engine, and operational credentials. No public beta before external contract audit.

Artifact: `docs/cashier/SECURITY_THREAT_MODEL.md`.
Artifact: `docs/cashier/INCIDENT_RESPONSE.md`.
Artifact: `contracts/INVARIANTS.md`.

## Phase 9: Beta Launch

Status: launch/reconciliation gate drafted.

Invite-only launch with low caps, daily reconciliation, canary dashboards, and
manual support coverage during deposit/withdrawal windows.

Artifact: `docs/cashier/BETA_LAUNCH_AND_RECONCILIATION.md`.
Artifact: `docs/cashier/OBSERVABILITY_AND_CANARIES.md`.
Artifact: `services/cashier-api/observability-events.json`.

## Phase 10: Scale-Out

Status: cap-increase criteria drafted.

Raise caps only after reconciliation, support burden, provider SLAs, and bridge
failure metrics are boring for multiple weeks.

Artifact: `docs/cashier/BETA_LAUNCH_AND_RECONCILIATION.md`.
Artifact: `docs/cashier/OBSERVABILITY_AND_CANARIES.md`.

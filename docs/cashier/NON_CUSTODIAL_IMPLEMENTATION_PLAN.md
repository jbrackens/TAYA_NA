# Tiangge Cashier — non-custodial implementation kickoff

**Status:** Kickoff plan.
**Approved direction:** non-custodial EVM smart wallet with TRC-20 USDT as the
primary deposit rail.
**Created:** 2026-05-25.

---

## Phase 0 — Guardrails

Objective: stop the custodial prototype from becoming production by accident.

- [x] Mark custodial BSC runbooks and overnight summary as superseded.
- [x] Make `docs/cashier/README.md` the non-custodial source of truth.
- [x] Add production startup guard that blocks legacy `CRYPTO_*` custodial rail env.
- [x] Remove legacy fiat/card amount-submit UX from the crypto cashier route.
- [x] Add a visible code comment/banner in `internal/payments` that the crypto rail
  is prototype-only.
- [x] Confirm deployment configs do not set `CRYPTO_RPC_URL`,
  `CRYPTO_ASSET_CONTRACT`, or `CRYPTO_DEPOSIT_ADDRESS_SOURCE`.

Exit gate: production cannot hand out old custodial deposit addresses.

---

## Phase 1 — Decision Spikes

Each spike should produce a short ADR with recommendation, rejection notes, and a
test transcript or vendor-doc evidence.

Status: vendor-doc ADR pass is complete. Live API transcripts remain open until
provider credentials and sandbox/mainnet-safe accounts are available.

### Spike 1: Smart Wallet

Candidates:
- Safe smart accounts.
- ERC-4337 account.
- Polymarket-style proxy fork.

Decision criteria:
- Deterministic address before deployment.
- Lazy deployment.
- ERC-1271 compatibility.
- Gas sponsorship support.
- Audit surface.
- Compatibility with markets contracts and order signing.

Status: ADR-003 created with Privy and thirdweb as the first embedded-wallet /
smart-account shortlist.

### Spike 2: Embedded Wallet

Candidates:
- Thirdweb.
- Privy.
- Web3Auth.

Decision criteria:
- Email login and cross-device recovery.
- Exportability and user control.
- Smart-account integration.
- Regional reliability in PH/VN/ID.
- Pricing and vendor lock-in risk.

Status: ADR-003 created.

### Spike 3: Tron Deposit Provider

Candidates:
- Symbiosis.
- Relay.
- deBridge.
- LI.FI.
- Direct provider/API pattern.

Hard requirement:
- Passive per-user TRC-20 USDT deposit address, or equivalent one-step send flow.
- If Maria must sign a multi-step TronLink bridge transaction, the provider fails V1.

Decision criteria:
- Tron source tx attribution.
- EVM destination tx attribution.
- Webhook/callback signing.
- Partial-fill/failure semantics.
- Recovery tooling.
- Fees and minimum deposit.

Status: ADR-002 created. Relay deposit addresses are the first provider to spike
because official docs support a passive address flow with no wallet connection or
signing. Symbiosis, LI.FI, and deBridge remain fallback infrastructure until they
prove the same UX.

### Spike 4: Settlement Chain

Candidates:
- Polygon.
- BSC.
- Base / Arbitrum as backups.

Decision criteria:
- Best bridge route from TRC-20 USDT.
- Direct exchange withdrawal support for SEA users.
- Stablecoin liquidity.
- Account abstraction/paymaster support.
- Monitoring and RPC quality.
- Compliance and sanctions tooling.

Status: ADR-004 created. Polygon and BSC remain finalists; Base/Arbitrum are
backups.

---

## Phase 2 — Skeleton

Create the real cashier as a separate module boundary, not a custodial extension of
the legacy Go payments package.

```text
contracts/
  src/
  test/
  script/
services/cashier-api/
services/bridge-watcher/
services/relayer/
packages/cashier-sdk/
```

Initial deliverables:
- [x] Create module boundary READMEs for contracts, cashier API, bridge watcher,
  relayer, and cashier SDK.
- [x] Add typed SDK domain model for users, wallets, deposit intents, callbacks,
  decimal metadata, and terminal status helpers.
- [x] No real money movement.
- [x] Every mutating API shape starts with idempotency keys.
- [x] Every external callback shape includes signature-verification inputs before
  state transition.

Exit gate: module boundaries exist and no live money movement exists.

---

## Phase 3 — Testnet End-to-End

Build the first complete path:

1. Email sign-in resolves a smart wallet.
2. User requests a Tron USDT deposit address.
3. Bridge provider maps deposit to user smart wallet.
4. EVM destination transaction creates tradeable collateral.
5. UI shows detected → bridging → available.
6. User performs a gasless withdrawal to an EVM address.

Exit gate:
- 10/10 deposits complete on testnet.
- Restarting each service mid-flow does not double-credit or lose attribution.
- Wrong token, duplicate callback, delayed EVM tx, and provider failure are all
  covered by tests.

---

## Phase 4 — Security Review

Required before mainnet beta:

- Contract audit.
- Relayer threat model.
- Bridge-provider failure mode review.
- Sanctions/quarantine policy.
- Recovery runbooks.
- Game-day drills for bridge outage, relayer outage, duplicate callback, wrong-token
  deposit, and RPC outage.

Launch cap recommendation:
- Invite-only.
- $100-$500 user deposit cap.
- Manual review above threshold.
- Daily reconciliation against bridge/provider and chain data.

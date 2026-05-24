# Hula Na! Cashier — design & decision record

**Status:** Approved approach, pre-implementation (2026-05-23). Branch `feat/hula-na-cashier`.
**Owner:** (founder) John Brackens.
**Supersedes:** the external "Hula Na! Cashier" build package (non-custodial / TypeScript), see [Provenance](#provenance).

---

## TL;DR

The cashier lets SE-Asian users (Maria from Manila) deposit **USDT** and withdraw it, with email sign-in and no gas/seed-phrase friction. The external build package specced this as a **non-custodial** system (per-user smart wallets, on-chain hUSD collateral, gasless relayer, Thirdweb, Pimlico) built as a **standalone TypeScript monorepo**.

This repo is a **custodial** prediction-market platform (Go gateway + Next 16) that already has the money stack: a cents ledger, a payments service, KYC-gated withdrawals, and a **fail-closed `CryptoRail` seam built for exactly this**. So we are implementing the cashier **natively, custodial**, by filling that seam — and dropping the non-custodial machinery, which would duplicate our wallet/ledger/auth and cannot integrate with the custodial markets engine (LMSR + settlement spend the cents ledger, not on-chain collateral).

**Custody decision (founder-confirmed 2026-05-23): custodial.** This is a deliberate override of the build package's locked "Custody: Non-custodial."

---

## What we reuse / build / drop

| Capability (build package) | This repo | Action |
|---|---|---|
| Email sign-in (Thirdweb in-app wallet) | Go auth service (email + session cookie) | **Drop Thirdweb** — reuse existing auth |
| Non-custodial smart wallet (Polymarket proxy / Safe) | custodial cents ledger (`internal/wallet`) | **Drop** |
| hUSD wrapper + CollateralOnramp (Solidity) | markets spend the cents ledger via `prediction.WalletAdapter` | **Drop** — no Solidity, no contract audit |
| Gasless relayer / Pimlico / EIP-712 / ERC-1271 | n/a (custodial; no user on-chain ops) | **Drop** |
| BEP-20 USDT deposit | `payments.CryptoRail.DepositAddress` + new **deposit-watcher** → `payments.HandleWebhook` → `wallet.Credit` | **Build (core)** |
| TRC-20 USDT via Symbiosis bridge | bridged BEP-20 lands → same watcher/credit path | **Build (spike-gated fast-follow)** |
| Balance (single live USD number) | `wallet.Balance` (cents) + existing WS hub | **Reuse** |
| Withdraw to external BSC address | `payments.CryptoRail.PrepareWithdrawal` (KMS signer + RPC) via the existing KYC-gated, hold-based withdrawal flow | **Build** |
| Admin pause / blacklist / view | existing admin routes + backoffice | **Extend** |
| Compliance: geo-block, sanctions screen | existing geo-gate + KYC; add address sanctions screen | **Extend** |
| 18-decimal USDT vs 2-dp cents | ledger is cents | **Convert at the rail boundary: USDT 1e18 ↔ cents** |

**Net new work:** a real `bscUSDTRail` (deposit-address derivation + withdrawal signer) behind the existing `CryptoRail` interface, a Go deposit-watcher, USDT↔cents conversion, the Symbiosis TRC-20 intake (fast-follow), and the Next deposit UI. No Solidity, no Thirdweb, no relayer, no separate monorepo.

---

## Where it lives

- `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/payments/` — `crypto_rail.go` (replace the `evmUSDCRail` reference with a `bscUSDTRail`), plus the deposit-watcher (new file/package) and webhook credit path (existing `HandleWebhook`).
- `internal/wallet/` — **unchanged**; we call `Credit`/`Debit`/holds via the existing service + idempotency keys.
- Next player app (`talon-backoffice/packages/app/`) — deposit UI (address + QR + live state) extending `wallet-client.ts`, `DepositThresholdModal`, `WalletBreakdown`; live balance via the existing WS hub.
- New goose migration (`024_*.sql`) for any cashier-specific tables (e.g. on-chain deposit tracking / sweep state) — `crypto_deposit_addresses` already exists.

---

## Money-path requirements (non-negotiable)

Carried over from the independent Codex review; these apply to any on-chain rail:

1. **Exactly-once deposit credit.** Dedupe on `(chainId, txHash, logIndex, blockHash)`. Credit the ledger via the existing idempotency-keyed `wallet.Credit` (key e.g. `crypto_deposit:<chainId>:<txHash>:<logIndex>`). Never credit by amount alone.
2. **Finality + reorg safety.** Treat a deposit as creditable only after N confirmations (rail default 12 ≈ 36s on BSC). On a removed/reorged log, roll back the pending state. Optimistic "detected → confirming → available" UI; spendable only at finality.
3. **Decimals.** USDT on BSC is **18 decimals**. Convert `USDT(1e18) ↔ cents` at the rail boundary; truncate sub-cent dust explicitly and account for it (never round silently). Assert `decimals()==18` on-chain at startup.
4. **Withdrawal safety.** Reuse the existing **KYC-gated, hold-based** withdrawal flow (TOCTOU already closed under a per-user lock). Signer key in **KMS** (never in process). Per-tx and per-window limits.
5. **Webhook/watcher auth.** Validate the deposit source (RPC provider webhook signature / our own watcher); the bridge path must verify Symbiosis callbacks (`PAYMENTS_WEBHOOK_SECRET` pattern).
6. **Sanctions on deposit AND withdrawal.** Screen both deposit-source and withdrawal-destination addresses. Define the on-receipt policy for a sanctioned inbound deposit (you cannot un-receive it): freeze / reject-credit / quarantine.
7. **Bridge-receiver hot wallet (TRC-20 path).** Smallest custodial surface; sweep aggressively; alarm on balance; handle stuck/duplicate/wrong-token bridge outcomes and user attribution.

---

## Implementation status (updated 2026-05-24)

The deposit **detect → credit** path is built and tested (unit + Postgres
integration + real-ledger E2E). Everything stays **fail-closed** until ops
configure the rail. All Go code is in `internal/payments/`.

**Built:**
- `usdt_conversion.go` — USDT↔cents at the rail boundary (18-dec landmine isolated; truncates sub-cent dust).
- `crypto_deposits.go` / `crypto_deposits_query.go` — `crypto_deposits` table (self-managed in `EnsureCryptoSchema`) + `CryptoDepositStore`; DB-enforced exactly-once via a partial unique index.
- `evm_rpc.go` — std-lib JSON-RPC client (chainId, blockNumber, decimals, getLogs) + ERC-20 Transfer decode (no go-ethereum dependency).
- `deposit_watcher.go` — `DepositWatcher.Sync`: detect → record → credit at finality via `wallet.Credit`, idempotent on `crypto_deposit:<chainId>:<tx>:<log>`; reorged logs roll the pending row back; sub-cent dust credits nothing. `RunCycle` resumes from a persisted cursor (`crypto_watcher_cursor`).
- `token_decimals.go` — `VerifyTokenDecimals` startup guard (fail-closed on a decimals mismatch).
- `deposit_watcher_factory.go` — `NewDepositWatcherFromEnv`, returns disabled when unconfigured.
- `docs/cashier/RUNBOOKS.md`, `docs/cashier/DECISIONS.md`.

**Tests** (integration tests skip cleanly when no DB is set):
```
WALLET_DB_DSN="postgres://predict:localdev@localhost:5434/predict?sslmode=disable" \
  go test ./internal/payments/...
```

**Also built (2026-05-24):**
- Gateway wiring — `RegisterRoutes` mounts the rail, runs `EnsureCryptoSchema`, and starts the watcher (all fail-closed); boot-verified (`/healthz` 200, rail mounted `configured=false network=bsc asset=USDT`, watcher disabled).
- Deposit UI — `CryptoDepositCard` + `crypto-client` wired into the cashier Crypto tab, fail-closed ("coming soon" until configured). **Visual-QA'd in the worktree dev server**: the ready state renders QR (`qrcode.react`) + address + copy + the wrong-token/network warning.

**Not yet built (blocked / deferred):**
- Deposit-address derivation + withdrawal signer — blocked on the custody-source decision below.
- Symbiosis TRC-20 bridge intake — spike-gated.
- Admin pause + sanctions screening — pending.

---

## Open decisions (to confirm before the dependent code)

1. **Deposit-address custody source** (`CRYPTO_DEPOSIT_ADDRESS_SOURCE`):
   - **(Recommended) Self-managed HD wallet** — derive a stable per-user BSC address from an xpub; sign withdrawals with a **KMS**-held key. Crypto-native, low cost, full control. Carries the **sweep-gas problem**: per-user deposit addresses need BNB to forward USDT to treasury (mitigate with a forwarder/sweeper that funds gas just-in-time, or a single receiving address per user that we sweep on a schedule).
   - **Custody / MPC provider** (Fireblocks-style) — provider derives addresses + signs. Lower key-risk and ops, higher cost and a vendor dependency.
2. **Scope order:** ship **BEP-20 deposit + withdraw first**, TRC-20/Symbiosis as a fast-follow (recommended), vs both together.
3. **Verification spikes still relevant** (Thirdweb/Pimlico spikes dropped):
   - **Symbiosis:** does a passive per-user Tron deposit address exist, or must the user sign a Tron contract interaction? (gates the TRC-20 flow; Maria won't tolerate a multi-step bridge). Public docs lean toward wallet-signed swaps — high risk.
   - **BSC RPC provider** choice (server-side, e.g. Alchemy/Ankr) still open. On-chain decimals **confirmed = 18** (chainId 56, symbol `USDT`, contract `0x55d3…955`) via public RPC `bsc-dataseed.binance.org`, 2026-05-23 — wire a startup `decimals()==18` assert into the rail.
   - HD-derivation + **sweep-gas** model feasibility on BSC.

---

## Config (extends existing env knobs)

The rail already reads these (currently fail-closed):

```
CRYPTO_NETWORK=bsc
CRYPTO_ASSET=USDT
CRYPTO_RPC_URL=                 # server-side BSC RPC (provider TBD)
CRYPTO_ASSET_CONTRACT=0x55d398326f99059fF775485246999027B3197955  # BSC USDT (18 decimals)
CRYPTO_DEPOSIT_ADDRESS_SOURCE=  # HD xpub | KMS keyring | custody provider id (decision #1)
CRYPTO_CONFIRMATIONS=12
PAYMENTS_WEBHOOK_SECRET=...
```

The rail must keep failing closed until all chain inputs are set — never hand out an address or broadcast a withdrawal unconfigured.

---

## Consequences / risk posture

- **Custodial:** we hold user USDT (treasury + per-user deposit addresses). Heavier custody/licensing posture than non-custodial; coordinate with the HK legal/gaming-license track.
- **No new Solidity** ⇒ no smart-contract audit (the build package's biggest cost/risk is removed). Remaining on-chain risk is **key custody** (deposit-address derivation + withdrawal signer) and the **bridge hot wallet** — bounded, standard exchange-grade problems.
- Reuses the platform's audited ledger, holds, idempotency, reconciliation, KYC gate, and geo-gate.

---

## Provenance

Original external build package (non-custodial / TS) lives outside the repo at:
`~/Library/Application Support/Claude/local-agent-mode-sessions/.../outputs/hula-na-cashier/` (00-README … 04-CLAUDE) plus `prediction-market-cashier-research.md`. It is the source of the product intent and the USDT/BEP-20/TRC-20/Symbiosis target rails. This document re-platforms that intent to a custodial Go+Next implementation; where the two conflict, **this document wins.**
```

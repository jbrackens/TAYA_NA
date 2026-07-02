# Taya_NA_Predict — Built vs. Missing Gap Analysis

Read-only assessment of the actual prediction-market application at
`/Users/john/Sandbox/Taya_NA_Predict` against the enterprise PAM specification
(`/spec.md`, `/docs/pam-feature-functionality-parity.md`). No code was modified.

## How to read this document

The app is a **sportsbook codebase forked on 2026-04-16 and transformed into a prediction
market**. That history matters: the **trading core is genuinely new and strong**, while many
PAM/back-office breadth features are either inherited-and-dead, partially re-pointed, or not
yet built. Three independent audits (backend/data, back-office UI, contracts/services/
compliance) corroborate the findings below.

## Architecture reality (essential context)

- **Canonical backend = the Go gateway** at
  `apps/Phoenix-Predict-Combined/go-platform/services/gateway`. The Scala `phoenix-backend`
  is the **pre-fork sportsbook backend — dormant, unbuilt, not deployed** (no numbered
  migrations, untouched since the fork date). Don't count it as built capability.
- **Live product is an off-chain, custodial, centralized exchange.** Orders match in a Go
  CLOB engine; money is a single PostgreSQL cents ledger; markets resolve via admin endpoints
  + a worker reading a price feed. **No blockchain runs in the live/demo path.**
- **The on-chain, non-custodial stack is a design seed, not running code.** `contracts/src`
  is Solidity *interface sketches* (no implementations, "do not deploy"); `services/relayer`
  has **zero source**; `services/bridge-watcher` is ~67 LOC + docs; the custodial crypto
  cashier (`internal/alphacashier`, Base L2) exists but is **default-OFF**. The most-built
  standalone piece is `services/cashier-api` (~2,300 LOC) but every money rail flag defaults
  `false` / fail-closed.
- **Back office = `talon-backoffice`** (Next.js 16 / React 19, Lerna monorepo). Active screens
  live in `packages/office/app/(dashboard)/*`; the legacy Pages-Router nav is gutted/dead.
- **Effectively single-brand today.** Multitenancy (`tenant_id`) exists as a dormant
  foundation that nothing reads.

## Scorecard summary (45 spec domains)

- **Built (works, wired, evidenced):** ~16 — dominated by the **prediction trading core**
  (orders/CLOB, trades, positions, exposure/P&L, settlement, disputes), plus RBAC, audit
  logs, player profile basics, notes, dashboards, webhooks/partner API, geofencing,
  responsible-trading enforcement.
- **Partial (backend exists but no admin UI, or weaker than spec):** ~17 — KYC, ledger
  (single-entry not double-entry), payments/withdrawals (backend only), manual adjustments
  (backend only), bonuses (backend only), reporting, jurisdiction (per-market only),
  tenant/brand (dormant), feature flags, market integrity, case management, communications.
- **Missing (absent or retired stub):** ~12 — **AML, sanctions/PEP**, fraud/duplicate
  detection, segmentation, CRM campaigns, documents UI, notification templates, exports,
  withdrawals **AWA** rules engine, dual-approval (maker-checker), operational settings,
  admin **MFA**.

**Headline:** the venue is **far ahead of the legacy reference on the trading engine and
settlement** (a real exchange, not fixed-odds betting) but **behind on regulated-PAM breadth
and compliance depth** — most critically AML and sanctions/PEP screening, and the back-office
money-movement and case/approval surfaces.

## Domain-by-domain gap table

Status legend: **Built** / **Partial** / **Stubbed** / **Missing**. "BE" = backend/data,
"UI" = back-office admin screen.

| # | Domain | BE | UI | Overall | Evidence | Note |
|---|---|---|---|---|---|---|
| 1 | Identity & registration | Built | Built | **Built** | gateway `punters`, auth service; office `users/page.tsx` | Player identity + admin list |
| 2 | Authentication & sessions | Built | Built | **Built** | `services/auth` (tokens, bcrypt, CSRF) | Solid |
| 3 | Admin login + MFA | Built | Built (no MFA) | **Partial** | `app/(auth)/auth/login` | Password-only; **MFA missing** |
| 4 | Admin RBAC | Built | Built | **Built** | mig 027/038/040; `access-control/RoleMatrix.tsx` | Granular perms, role matrix editor |
| 5 | Player search | Built | Built | **Built** | `/admin/punters`; `users/page.tsx` | |
| 6 | Player profile 360 | Built | Partial | **Partial** | `PunterProfile.tsx` (Overview/Bets/Wallet) | **Missing KYC & Limits/self-exclusion tabs** |
| 7 | Account lifecycle / status | Built | Built | **Built** | `AccountActions.tsx` → `/punters/:id/status` | Suspend/activate; password-reset stubbed |
| 8 | KYC | Partial | Missing | **Partial** | `internal/compliance/{idv,kyc_postgres}.go`; gated pre-trade | Enforced + fail-closed, but **default-off**, **mock fallback if no DB**, **no admin KYC UI**, no vendor wired |
| 9 | AML | Missing | Missing | **Missing** | — | **No real-time txn monitoring / SAR** anywhere in live rail |
| 10 | Sanctions / PEP screening | Stubbed | Missing | **Missing** | `alphacashier/screening.go` (observe-only seam) | **No OFAC/SDN list or vendor**; PEP absent in live product |
| 11 | Responsible trading / self-exclusion | Built | Stubbed/dead | **Partial** | `compliance/rg_postgres.go` wired pre-order (`service.go:717`) | Backend genuinely enforced before debit; **admin UI is dead legacy**, no reality-check timer |
| 12 | Wallets | Built | Built | **Built** | `internal/wallet/service.go`; profile Wallet tab | Cents balances, FOR UPDATE, SERIALIZABLE |
| 13 | Balances | Built | Built | **Built** | `wallet_balances` | available/reserved/realized |
| 14 | Ledger (double-entry) | Partial | Built (read) | **Partial** | `wallet_ledger` | **Single-entry running-balance, idempotent — NOT double-entry** (spec invariant gap); per-market collateral ledger is append-only |
| 15 | Transactions | Built | Built | **Built** | `payment_transactions`, `wallet_ledger` | |
| 16 | Payments / deposits | Built | Missing | **Partial** | `payments/db_service.go`; crypto rail default-off | **No cashier/deposit UI** (`/cashier` dir empty) |
| 17 | Withdrawals | Built | Missing | **Partial** | `InitiateGatedWithdrawal`, cumulative cap | **No withdrawal queue/approval UI; no AWA rules engine**; live withdrawals are human-broadcast under two-person control |
| 18 | Manual adjustments | Built | Missing | **Partial** | admin wallet mutation routes (`finances:write`) | Backend ok; **UI only dead sportsbook components** |
| 19 | Prediction-market orders | Built | Partial | **Built** | mig 019; `internal/prediction/exchange.go`,`orderbook.go` | **Real CLOB**: price-time priority, TIF (GTC/IOC/FOK), post-only, idempotency; no admin order-book screen |
| 20 | Trades / fills | Built | Partial | **Built** | `prediction_trades` (immutable; match_id) | Complementary issuance (mint YES+NO pair) — Kalshi/Polymarket model |
| 21 | Positions | Built | Built | **Built** | `prediction_positions`; profile + risk page | Net qty, avg price, realized P&L, share reservation |
| 22 | Exposure & P/L | Built | Built | **Built** | `prediction/risk.go`,`accounting.go`; `prediction-admin/risk` | Money-invariant + concentration + settlement-aging dashboard |
| 23 | Settlement operations | Built | Built | **Built** | mig 014/034; `settlement.go`; `prediction-settlements` UI | **Idempotent** (deterministic keys, CAS guard), resumable batched payouts, **propose→challenge→finalize** |
| 24 | Market integrity monitoring | Partial | Partial | **Partial** | collateral reconciler; risk drift alerts | Drift/exposure only; **no wash/spoof/collusion surveillance** |
| 25 | Fraud & abuse | Missing | Missing | **Missing** | — | No duplicate detection, no fraud cases |
| 26 | Bonus / promotions | Built | Missing (retired) | **Partial** | mig 011/042; `internal/bonus`; office `campaigns`→redirect | Backend wagering engine exists; **no admin bonus UI** |
| 27 | CRM | Partial | Partial | **Partial** | mig 022 user notes | Admin notes only; no journeys |
| 28 | Segmentation | Missing | Missing | **Missing** | — | No tags/segment engine |
| 29 | Communications | Partial | Missing | **Partial** | `internal/notify` (email+log; SMS/push stubs) | No DB templates, no admin comms UI |
| 30 | Internal notes | Built | Built | **Built** | mig 022; `PunterProfile` notes | CRUD on punters |
| 31 | Documents | Partial | Missing | **Partial** | `kyc_documents` table (code-created) | No document-management surface |
| 32 | Case management | Partial | Partial | **Partial** | disputes + notes; no formal case entity | Dispute workflow is the closest thing |
| 33 | Support / disputes | Built | Built | **Built (markets)** | mig 023; `disputes/page.tsx` | Market-resolution disputes built; **general player-support cases missing** |
| 34 | Reporting | Partial | Partial | **Partial** | `reports_handlers.go` (4 aggregates); `reports`→redirect | Minimal; no full reporting module |
| 35 | Exports | Missing | Partial | **Partial** | audit-logs export only | No general CSV/data-export pipeline |
| 36 | Dashboards | Built | Built | **Built** | `/dashboard`, `/prediction-admin/risk` | Volume/markets KPIs, risk dashboard |
| 37 | Audit logs | Built | Built | **Built** | mig 036 append-only triggers; `audit-logs` viewer | **DB-enforced append-only** on cashier/provider-ops tables; mig 009 `audit_logs` mutable; viewer filterable + export |
| 38 | Tenant / brand management | Partial (dormant) | Missing | **Partial** | mig 037; `internal/tenant` | `tenant_id` exists but **nothing reads it**; effectively single-brand ('hula') |
| 39 | Jurisdiction rules | Built | Partial | **Built** | `compliance/geo_gate.go`; mig 035 per-market | Global geo-gate (fail-closed, prod boot-required) + per-market overlay; **no global jurisdiction config screen** |
| 40 | Feature flags / config | Partial | Missing | **Partial** | env-var driven (`GEO_GATE_ENABLED`, `ALPHA_CASHIER_*`) | **No DB-backed flag store**; no config UI |
| 41 | Integrations / API / webhooks | Built | Built | **Built** | mig 038/039; `webhooks`, partner API, `prediction_api_keys` | HMAC webhooks + scoped operator API keys + bot routes |
| 42 | Data privacy / retention | Partial | Missing | **Partial** | mig 016 loyalty opt-out | **No general DSAR/retention/erasure** tooling |
| 43 | Localization | Partial | Unknown | **Partial** | mig 028/029 market translations | Market translation cache; broader i18n unverified |
| 44 | Notification templates | Missing | Missing | **Missing** | `notify.go` hardcodes subjects/bodies | No template store/management |
| 45 | Operational settings | Missing | Missing | **Missing** | `account/settings`→redirect | No password-policy/consents/payment-method/product config screens |
| + | Loyalty (spec defers this) | Built | Built | **Built (bonus)** | mig 015/021/016; `loyalty` UI | Accounts, append-only ledger, tiers, leaderboards — exceeds spec's "defer" |

## What is genuinely built (strengths beyond the legacy reference)

1. **A real binary CLOB matching engine** with price-time priority, partial fills, self-match
   prevention, TIF, post-only, and **complementary issuance** (mints YES+NO pairs on crossing
   opposite sides) — the Kalshi/Polymarket model. Serialized per market via Postgres advisory
   locks. This is the single biggest delta vs. the legacy fixed-odds code, which had no
   trading domain at all.
2. **Idempotent, race-safe settlement** — deterministic per-position keys, status-guarded CAS
   as the first committed statement, resumable batched payouts, and a **propose → challenge →
   finalize** resolution seam with disputes (payouts only at finalize → no clawbacks).
3. **Real positions, collateral pool, and per-market append-only collateral ledger** with a
   drift reconciler.
4. **Deny-by-default production boot guard** that refuses to start unless geofencing, KYC
   posture, screening, and edge-auth are explicitly configured or explicitly acked-off.
5. **Responsible-trading wired into the order path before any debit** (TOCTOU-closed with an
   advisory lock).
6. **Geofencing** with anti-spoof trusted-edge auth, fail-closed on unknown country.
7. **Granular RBAC**, **DB-enforced append-only audit** (on the money-path tables), **HMAC
   webhooks**, and a **scoped partner API** — all things the legacy reference lacked or only
   stubbed.
8. **Back-office screens** that are real and e2e-covered: markets management (lifecycle with
   mandatory reason→audit, per-market jurisdiction), settlement queue, risk/exposure
   dashboard, RBAC editor, audit-log viewer, player profile + notes + status.

## Critical gaps (prioritized for a regulated venue)

**P0 — compliance/financial-integrity blockers**

1. **AML transaction monitoring & SAR — Missing.** No real-time monitoring or suspicious-
   activity blocking in the live product (legacy AML is batch reporting only).
2. **Sanctions/OFAC & PEP screening — Missing/Stubbed.** Only an interface seam, observe-only
   by default, no actual list/vendor; the whole crypto cashier rail is default-off.
3. **KYC has no admin review UI and silently mock-falls-back if no DB is wired** — a
   misconfiguration could neutralize the control without an obvious failure.
4. **Ledger is single-entry, not double-entry** — idempotent and adequate operationally, but
   diverges from the spec's double-entry invariant; reconciliation/audit story is weaker.
5. **No dual-approval (maker-checker)** on settlement or high-value adjustments — mutations
   are single-actor + reason-logged only.

**P1 — back-office money-movement & operations surfaces**

6. **No payments/deposits or withdrawals approval UI** (`/cashier` is empty); no **AWA**
   auto-withdrawal rules engine. Money movement is API/manual today.
7. **No manual-balance-adjustment UI** with reason/approval (backend route exists; UI is dead
   legacy).
8. **Player Profile 360 is missing KYC and Limits/self-exclusion tabs.**
9. **No fraud/duplicate detection; market-integrity surveillance is drift-only** (no wash/
   spoof/collusion detection).
10. **Reporting & exports are minimal**; **notification templates, segmentation, CRM
    campaigns, documents, operational-settings screens** are missing or retired stubs.

**P2 — platform breadth**

11. **Multitenancy is dormant** (`tenant_id` unread) — effectively single-brand; no
    tenant/brand or global-jurisdiction config UI.
12. **Admin MFA missing.** **Feature flags are env-vars, not a DB-backed store.** **Data
    privacy/retention (DSAR) tooling** beyond loyalty opt-out is absent.
13. **On-chain non-custodial settlement is vaporware today** — if non-custodial custody is a
    product goal, contracts (no implementations), the relayer (no source), and the bridge
    watcher are still to be built; the live rail is custodial.

## Net assessment

Against the enterprise PAM spec, Taya_NA_Predict has **inverted the legacy reference's
strengths and weaknesses**. The legacy Idefix/OMEGA lineage had a mature compliance/operations
back office but **no trading core**; Taya has a **production-grade prediction-market trading
core and settlement engine** but a **thinner, partially-inherited compliance/back-office
breadth** — with **AML and sanctions/PEP as the most serious gaps** for any regulated
launch. Most of the financial and trading data model is built; the largest missing work is
(a) compliance depth (AML/sanctions/PEP, KYC UI), (b) back-office money-movement and
case/approval UIs (cashier, withdrawals/AWA, adjustments, dual-approval), and (c) platform
breadth (multitenancy activation, reporting/exports, CRM/segmentation, notification
templates, operational settings).

*Evidence basis: three read-only audits of the Go gateway + migrations, the talon-backoffice
Next.js app, and the contracts/services/compliance layers, cross-checked against the app's
own `ARCHITECTURE.md`, `FEATURE_MANIFEST.json`, and `docs/audit/AUDIT_REPORT.md`. Mapped to
`/spec.md` and `/docs/pam-feature-functionality-parity.md`.*

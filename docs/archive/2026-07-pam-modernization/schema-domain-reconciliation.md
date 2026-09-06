> **ARCHIVED 2026-09-06.** Historical record only — this does not describe the current system.
> Written on branch `pam/p0-modernization` (2026-07-02 → 2026-07-06); never merged. The reference
> implementation (345 commits, migrations 057–061) lives at tag `archive/pam-p0-modernization-2026-07-06`.
> Paths here are PRE-REBRAND (`apps/Phoenix-Predict-Combined/go-platform` = `apps/taptrade-platform/go-platform`;
> `talon-backoffice/packages/app` = `frontend/packages/office`) and units are pre-points ("cents", before
> migration 050). Commit hashes cited inside resolve only at that tag.
> For what of this main still lacks, see `docs/licensability-gaps.md`. See `CLAUDE.md` for current architecture.

# Schema ⇄ Domain-Model Reconciliation (GAP-27)

**Date:** 2026-07-03 · **Spec:** PAM §30 (Data Model) · **Scope:** every entity and state machine in `docs/pam/pam-domain-model.md` reconciled against the *shipped* gateway schema — both goose migrations (`migrations/001–057`) **and** runtime store-owned tables created via `CREATE TABLE IF NOT EXISTS` in Go (which is where most compliance/CRM/audit tables actually live).

**Method:** a six-group parallel reconciliation (identity-rbac · wallet-ledger · compliance · trading-core · integrity-cases · crm-platform). Every classification below is grounded in a migration filename or a Go `path:line`. This document is the §30 evidence and feeds the backlog with the genuine gaps it surfaced.

## Summary

| | matches | diverges | missing / not-enforced | model-only |
|---|---|---|---|---|
| **Entities (34)** | 1 | 27 | 5 (missing) | 1 |
| **State machines (10)** | 0 | 8 | 2 (not-enforced) | — |

**Headline:** the shipped schema is a faithful-but-pragmatic realization of the domain model. The large `diverges` count is **mostly benign** — it is dominated by four non-defect patterns (below), not by missing capability. Only a handful of divergences are genuine gaps, and all of those are either already tracked (P0-7 double-entry, GAP-43 comms-history) or newly filed here (GAP-70 wallet-freeze). No divergence indicates a correctness bug in shipped code.

## Divergence taxonomy (why `diverges` ≠ `defect`)

1. **Relational normalization** — doc array fields (`Role.permissions[]`, `AdminUser.roles[]`, `Player.tags[]`) are realized as join tables (`role_permissions`, `user_roles`, `crm_user_tags`). Faithful, not a gap.
2. **Store-owned runtime tables** — most compliance/CRM/audit tables are created by Go `ensureSchema`, not migrations: `wallet_balances`, `wallet_ledger`, `kyc_*`, `player_{bet,deposit,loss}_limits`, `player_restrictions`, `customer_risk_ratings`, `aml_*`, `surveillance_*`, `crm_*`, `provider_ops_audit_log`, `platform_config`. Present and correct; just not in `migrations/`.
3. **Fragmented aggregate** — the doc's convenience aggregates (`PlayerAccount`, `PlayerProfile`) have no single table; their fields are split across purpose-specific tables or derived at request time (e.g. `allowTrading` is computed by `prediction_status_gate.go`, not stored).
4. **Dead-vs-live duplication** — migration 006 (`wallets`, `ledger_entries`) and migration 009 (`audit_logs`) are **dormant sportsbook-era tables**; the live equivalents are the Go-created `wallet_balances`/`wallet_ledger` and the hash-chained `provider_ops_audit_log`. (Cleanup candidate, not a functional gap.)

## Entity reconciliation

| Entity | Status | Backing table | Note |
|---|---|---|---|
| AdminUser | diverges | `admin_users` (027) | `roles[]`→`user_roles` join; no lockout/failed-login/mfa/brandScope columns (MFA lives in the auth service, not this row) |
| Role | diverges | `roles` (027, +056) | `permissions[]`→`role_permissions`; `isSystemRole`→`is_system`; no `brandScope` (roles are global) |
| Permission | diverges | `permissions` (027 +038/040/050–055) | opaque slug ids (`users:read`); no typed `resource/action/scope/requiresDualApproval` columns (dual-approval is `internal/makerchecker`, not a perm attribute) |
| Player (Trader) | diverges | `punters` (001, +037 tenant_id) | `brandId`→dormant `tenant_id`; no `currencyId` (points-only); DOB/nationalId live in `kyc_identity`, tags in `crm_user_tags` |
| PlayerAccount | diverges | *(fragmented)* | no aggregate table — `status`→`punters.status`, restrictions→`player_restrictions`, verification→`kyc_status`, risk→`customer_risk_ratings`; booleans derived at request time |
| PlayerProfile | **missing** | *(none)* | no `player_profile` table anywhere; only KYC-scoped identity fields exist. Contact/display fields (nickname, phone, address, language, VIP) unpersisted — breadth gap, §10 |
| Wallet | diverges | `wallet_balances` (Go) | migration 006 `wallets` is dead; live table is Go-created |
| Balance | diverges | `wallet_balances` (Go) | `balance_cents` + `bonus_balance_cents` |
| LedgerEntry | diverges | `wallet_ledger` (Go) | **single-entry, not the doc's double-entry** — tracked BLOCKED **P0-7** (design note `docs/pam/designs/p0-7-design.md`) |
| Transaction | diverges | `payment_transactions` + alpha rail | money-path only; two parallel status enums (see FSM) |
| PaymentMethod | **missing** | *(none)* | no stored payment methods — consistent with launch mode (no money paths; Tiangge §2/§19) |
| KYCProfile | diverges | `kyc_status` +`kyc_identity`+`kyc_documents`+`kyc_document_files` (Go) | split across 4 tables; `documents_required` state (GAP-18) |
| AMLScreening | diverges | `aml_rules`+`aml_alerts`+`aml_cases`+`aml_scan_state` (Go) | alert→case model (see FSM) |
| RiskProfile | **matches** | `customer_risk_ratings` (Go) | low/medium/high/prohibited tier (GAP-12) |
| ResponsibleGamingProfile | diverges | `player_{bet,deposit,loss}_limits`+`player_restrictions`+`player_activity_log` (Go) | orthogonal flags, not one profile row |
| Market | diverges | `prediction_markets` (014) | lifecycle FSM in `lifecycle.go` (the one real FSM) |
| Order | diverges | `prediction_orders` (014/019) | `new`→`pending`, `partially_filled`→`partial` (naming) |
| Trade | diverges | `prediction_trades` (014) | immutable fills |
| Position | diverges | `prediction_positions` (014) | mutable net-holding row (see FSM — not_enforced) |
| Settlement | diverges | `prediction_settlements` (014, +023 proposals, +034 progress) | split across 3 mechanisms (see FSM) |
| MarketIntegrityAlert | diverges | `surveillance_alerts` (Go, 051) | kind/severity/subject/dedupe |
| Case | diverges | `surveillance_cases` (Go, 051) | see FSM |
| InternalNote | diverges | `user_notes` (022) | |
| Document | diverges | `kyc_documents`+`kyc_document_files` (Go, BYTEA, 050 era) | binary storage (P0-3) |
| CommunicationEvent | **missing** | *(none)* | no sent-communication history — **tracked GAP-43** (§20); see Findings |
| Segment | diverges | `crm_tags`+`crm_user_tags` (Go) | P2-2 |
| BonusCampaign | diverges | `campaigns`+`campaign_rules` (011) | |
| Reward | diverges | `player_bonuses` (011) | wagering fields |
| AuditLog | diverges | `provider_ops_audit_log` (Go, hash-chained) | **not** the dormant `audit_logs` (009); GAP-13 chain |
| Brand | diverges | `tenants` (037, dormant) | multitenancy BLOCKED P2-1 |
| Jurisdiction | **missing** | *(none)* | realized as `prediction_markets.jurisdiction_policy` JSONB overlay (035) + env `GeoGate` — a deliberate design choice, not a table |
| Report | model-only | *(none)* | computed on-the-fly; no `reports` table by design |
| ExportJob | **missing** | *(none)* | exports are synchronous CSV streams; no async job table (acceptable at current scale) |
| FeatureFlag | diverges | `platform_config` (Go, 053) | key/value flag store |

## State-machine reconciliation

The pattern across the board: states are enforced by **column CHECK constraints + runtime allowlists/gates**, not by declared transition FSMs — **except** the market lifecycle (`internal/prediction/lifecycle.go`, the one true `CanTransition` graph). This is a consistent, defensible choice, but it means most "illegal edges" are prevented by code paths rather than a transition table.

| Machine | Status | Enforcement | Divergence |
|---|---|---|---|
| Player Account State | diverges | `allowedPunterAdminStatuses` allowlist (`prediction_admin_handlers.go:70`) + status gate | flat allowlist, no transition graph; states {active,suspended,self_excluded,deactivated}; doc's `registered`/`closed` absent; no DB CHECK on `punters.status`. Intent (block trading when non-active) IS realized fail-closed by the gate |
| Wallet State | **not-enforced** | *(none)* | **the `active↔frozen→closed` freeze FSM is wholly unimplemented** — `wallet_balances` has no status column; no code blocks a debit/credit for a frozen wallet → **new GAP-70** |
| Transaction State | diverges | `payment_transactions.status` (free TEXT, no CHECK) + alpha-rail CHECK enums | two parallel enums, neither matches the doc's canonical set; `reversed`/`completed` naming gaps; money-path (launch-latent) |
| KYC State | diverges | `kyc_status.status` CHECK (`kyc_postgres.go:62/90`) | value-CHECK not edge-guard; `expired` is computed (not stored); extra `blocked`/`documents_required`; `approved` mintable only via manual `AdminDecision` (fail-closed) |
| AML/Risk Review State | diverges | `aml_cases`/`aml_alerts` CHECK + `UpdateCaseStatus` terminal guard | real terminal guard, but state names/topology differ (open→investigating→closed_* vs doc's clear→flagged→under_review→escalated) |
| RG State | diverges | orthogonal flags on `player_restrictions` + loosen-cooldown | reachable via flags, not an ordered FSM; no explicit `idlePeriod` re-entry guard |
| Order State | diverges | `status` CHECK (014/019) + engine assignment | all 7 states present (`new`→`pending`, `partially_filled`→`partial`); CHECK guards value not edge |
| Position State | **not-enforced** | *(none)* | no status column; open/closed implicit in quantity, settled implied by a payout row. Benign — positions are a projection of trades |
| Settlement State | diverges | proposals CHECK (023) + payout progress (034) + market FSM (lifecycle.go) | split across 3 mechanisms; idempotency via UNIQUE keys, not a status transition |
| Case State | diverges | `surveillance_cases` CHECK + `UpdateCaseStatus` terminal guard (`surveillance.go:267`) | real terminal guard; `in_progress`→`investigating`; **no `pending_approval`/dual-approval step** despite the doc sourcing it to OMEGA Dual Approval |

## Findings → backlog

Only genuine gaps (not benign divergences) are filed:

1. **GAP-70 (NEW) — Wallet-freeze control + freeze/unfreeze audit is unimplemented.** The domain `Wallet State` FSM (`active↔frozen→closed`, frozen blocks debits/credits except authorized adjustments) has no realization: `wallet_balances` has no status column and no code path blocks movement on a frozen wallet. Today a punter-level suspension (`player_restrictions.blocked` + status gate) blocks *new* orders/deposits, so exposure is **launch-latent** (no money paths reach a mutable balance outside orders), but an explicit, audited wallet freeze independent of account suspension is a standard AML/fraud control a licensed operator needs. **Touches `internal/wallet/*` → PROTECTED CORE**, so when picked up it follows the Blocked-Item Protocol (design note, not autonomous code). Escalates to P1 when money paths (P1-1 cashier) are enabled. §14/§18.
2. **GAP-43 (confirmed, already tracked) — no per-player sent-communication history** (`CommunicationEvent` missing). The reconciliation independently confirms the pass-b finding; no new item. §20.
3. **Scenario-evidence correction (GAP-26 refinement):** because sent-communication history is genuinely absent (GAP-43 open), §32 **Scenario 12** (Player Communication & Notes) is downgraded from *Pass* to *Partial* in `scenario-evidence.md` + §36 — notes + templates are built, but the "view communication history" step is not yet satisfiable. (Corrected alongside this reconciliation.)

### Benign-by-design (explicitly NOT gaps)

- `PaymentMethod` / `Transaction` money-path absences — consistent with launch mode (Tiangge §2/§19 prohibits money paths; cashier is flag-gated off).
- `Jurisdiction` as a JSONB overlay + env allowlist rather than a table — a deliberate, working design (035 + `GeoGate`).
- `Report`/`ExportJob` computed synchronously — acceptable at current scale; async job tables are a scaling decision, not a compliance one.
- Dormant `wallets`/`ledger_entries` (006) and `audit_logs` (009) — sportsbook-era dead tables superseded by live Go-created equivalents; a cleanup candidate, tracked separately from correctness.
- Relational normalization of doc arrays and store-owned runtime tables — faithful realizations, not divergences in substance.

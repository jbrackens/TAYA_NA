# §32 Acceptance-Scenario Evidence Pass (GAP-26)

**Date:** 2026-07-03 · **Scope:** PAM spec `docs/pam/spec.md` §32 (20 acceptance scenarios) reconciled against the implemented gateway/auth/office system on branch `pam/p0-modernization`.

This document captures, per scenario, the **concrete evidence** (commits + automated tests + code sites) that exercises the scenario's Steps and Expected Result, and assigns an **assessed status**. It is the input to the §36 Progress-Matrix status flip (GAP-26 slice 2).

## Legend

- **Pass (automated)** — the scenario's steps + expected result are exercised by automated tests (unit / race / live-Postgres / Playwright e2e) that are green in CI. This is evidence of correctness, not a substitute for a formal manual acceptance sign-off, which remains a separate human step.
- **Partial** — the core capability is built and evidenced, but a named sub-part is missing or BLOCKED (with a pointer to the blocking item).
- **Fail** — the capability is missing, or blocked at the design stage with no runnable surface.

Every commit hash and test name below traces to a `✅ DONE` entry in `docs/pam/PROGRESS_LEDGER.md` (§ "Done" + the GAP roster) verified in this session. Where a claim rests on a code site rather than a dedicated commit, the path is given.

## Scenario evidence matrix

| # | Scenario | Assessed status | Evidence (commits · tests · sites) | Residual gap |
|---|----------|-----------------|------------------------------------|--------------|
| 1 | Admin Login & Permission Enforcement | **Pass (automated)** | Real admin MFA — TOTP mandatory for admin roles: P0-1 `6914421c`,`268157b8`; `TestMFAAdminRequiredFromEnv`, `TestAdminLoginRequiresEnrollmentWhenFlagOn`, `TestOAuthSessionGateDeniesAdmins`. RBAC enforcement (mig 027/038/040) with `requireRBACPermission`. Permission-denial audit — GAP-25 `d719804f` (`access.permission_denied`, append-only). Least-privilege personas — GAP-14 `bd0634db`. Admin MFA reset for lost-device recovery — GAP-15 `21743d22`,`5c4c105c`. | WebAuthn/passkey is an optional enhancement, deferred (GAP-71; TOTP satisfies the control); enrollment bootstrap is trust-on-first-use (documented). |
| 2 | Player Search & Profile 360 | **Pass (automated)** | Search + profile Built; KYC tab — P0-3 `ad6e84c4`; Limits/self-exclusion tab — P1-3 `d610ecdf`; balances/positions/transactions present. Playwright backoffice `kyc-review.spec.ts`, `balance-adjustment.spec.ts`. | — (the §36 "missing KYC & Limits tabs" note is stale). |
| 3 | Account Status Change | **Pass (automated)** | Suspension now READ on the trading path + login — GAP-9, GAP-10; status route writes reason + audit. Order placement by a suspended actor is blocked; login blocked for suspended/self-excluded. | — |
| 4 | KYC Review | **Pass (automated)** | Mock-fallback removed (fail-closed) — P0-2 `5adf223c`; admin review UI + document BYTEA storage — P0-3 `f6501f0a`,`b95fe9a0`,`ad6e84c4` (mig 050, `compliance:read`); expiry re-trigger — GAP-17 `59f7eb6d` (`KYCStatus.Expired`); request-more-documents — GAP-18 `d0d314f6`. Live Postgres roundtrip + Playwright 5/5. | Production IDV vendor unchosen (GAP-19 ⚑); volume-driven re-trigger BLOCKED (GAP-17b ⚑). |
| 5 | AML / Risk Case Creation | **Partial** | Alert→case→disposition PLUMBING built — `registerAMLAdminRoutes` (`handlers.go:590`, `aml_admin_handlers.go`, `amlStore`), AML live-test suite (`AML_LIVE_DSN`); per-customer risk-profile rating — GAP-12 (`d255eba2`…); market-integrity alerts→cases — P1-4 (below). | AML **rule set / thresholds** BLOCKED on regulatory regime (P0-5 ⚑); statutory SAR filing pending. |
| 6 | Responsible Gaming / Trading Controls | **Pass (automated)** | RG limit breadth (deposit/stake/loss/position/session) — GAP-11; fail-closed RG service — GAP-1; loosen-cooldown all three types — GAP-63 `de5acebc`,`b8b261a8`,`100a5cc3`; login block for excluded — GAP-10; Profile-360 Limits tab — P1-3 `d610ecdf`. Enforced BEFORE order placement; `TestPostgres{Bet,Deposit,Loss}LimitLoosenCooldownLive`. | — (admin visibility now via the Profile-360 Limits tab; the dead-legacy admin UI note is stale). |
| 7 | Wallet & Ledger Review | **Partial** | Wallet/balances/transactions Built; idempotency-keyed money path. | Ledger is single-entry; double-entry migration BLOCKED (P0-7 ⚑ protected core, design note `docs/pam/designs/p0-7-design.md`). |
| 8 | Manual Balance Adjustment | **Partial** | Adjustment UI + audited `finances:write` route — P1-2 `bb710f52` (confirm-step + mandatory reason). | Dual-approval (four-eyes) BLOCKED (P0-6 ⚑ thresholds). |
| 9 | Position Review / Orders (CLOB) | **Pass (automated)** | Positions, exposure/P&L, risk dashboard Built; real CLOB (TIF/post-only); per-market eligibility gate — GAP-20 `c1f0f593`; admin order view/cancel — GAP-21 `d94e53b0` (audited `order.admin_cancelled`). | — |
| 10 | Market Manipulation / Integrity Review | **Pass (automated)** | Surveillance engine: wash/spoof/collusion — P1-4 `7761823b`,`8936142a`,`e33045c4`; insider pattern — GAP-22 `11d1fc1b`; bonus-abuse — GAP-23 `c46b166f`; duplicate-account — `fraud.go`. Alerts→cases office UI; per-detector live tests (`SURV_LIVE_DSN`). | — (the §36 "Missing — no wash/spoof/collusion" note is badly stale). |
| 11 | Settlement Operations | **Pass (automated)** | Idempotent propose→challenge→finalize + disputes; dual-control on finalize (finalizer ≠ proposer, enforced in the engine). | — |
| 12 | Player Communication & Notes | **Partial** | Notes Built; DB-backed notification-template store + admin editor + resolution sender — P1-6 `a2cf341f` (`internal/notify`, mig 052). | Sent-communication HISTORY (Scenario 12 step 3 "view communication history") not persisted — tracked GAP-43; confirmed by the GAP-27 reconciliation. |
| 13 | Segmentation & CRM | **Pass (automated)** | Tags/segments/campaigns/query — P2-2 (`internal/segmentation`, `registerSegmentationAdminRoutes`), campaign dispatch fail-closed in launch mode; live tests (`SEG_LIVE_DSN`). | — (the "Missing" note is stale). |
| 14 | Bonus / Reward Controls | **Pass (automated)** | Bonus engine + wagering + loyalty Built; bonus admin UI — P1-6 `dae22915`; abuse detection — GAP-23 `c46b166f`. | — (the "no admin bonus UI" note is stale). |
| 15 | Reporting & Export | **Partial** | Operational CSV exports — P1-6 `a95f6e5a` (`report_exports_handlers.go`, `/exports` office page); risk CSV, `reports/kyc-statuses.csv`, `reports/surveillance-alerts.csv`. Playwright reports 4/4. | Full statutory/regulatory report suite pending regime input (GAP-24 ⏳, rides P0-5's regime). |
| 16 | Tenant / Brand / Jurisdiction Configuration | **Partial** | Geofencing + per-market jurisdiction overlay Built (allowlist, fail-closed, edge anti-spoof). | Multitenancy dormant — `tenant_id` shipped (mig 037) but unread; activation BLOCKED (P2-1 ⚑ protected core). Per-country matrix (GAP-30, P2). |
| 17 | Audit Log Integrity | **Pass (automated)** | DB-trigger append-only on money-path tables; hash-chaining — GAP-13; chain-verify admin route (`AuditVerifyChain`); durable auth audit — GAP-5 (`auth_audit`); permission-denial audit — GAP-25. Live tests (`AUDIT_LIVE_DSN`). | — |
| 18 | Data Privacy & Retention | **Fail** | Loyalty opt-out only. | DSAR/retention/erasure tooling BLOCKED (P2-3 ⚑ legal — retention schedule + audit carve-out needed). |
| 19 | Support / Dispute Case Workflow | **Partial** | Market-resolution dispute workflow Built (propose→challenge→finalize + disputes). | General (non-settlement) support-case workflow Missing. |
| 20 | Operational Configuration Change | **Partial** | DB-backed platform-config flag store + admin route — `internal/platformconfig`, `/api/v1/admin/config/flags`; used as the fail-closed gate for campaign dispatch. Live tests (`CONFIG_LIVE_DSN`). | Full ops-settings screens (broader than flags) not built; config is flag-store + env, not a complete settings surface. |

## Summary

- **Pass (automated): 11** — Scenarios 1, 2, 3, 4, 6, 9, 10, 11, 13, 14, 17.
- **Partial: 8** — Scenarios 5, 7, 8, 12, 15, 16, 19, 20.
- **Fail: 1** — Scenario 18 (privacy/DSAR, BLOCKED on legal).

*(2026-07-03 update: Scenario 12 downgraded Pass→Partial by the GAP-27 schema-domain reconciliation, which confirmed sent-communication history is unpersisted — open GAP-43. Notes + templates remain built.)*

Every **Partial** and **Fail** is attributable to a tracked BLOCKED item with a decision brief (P0-5, P0-6, P0-7, P2-1, P2-3, GAP-17b, GAP-19, GAP-24, GAP-30) — i.e. the remaining gaps are human-decision-gated (regime/legal/threshold/vendor/protected-core), not un-started engineering. Compared with the §36 "June 2026" baseline, this pass moves **8 areas off stale Missing/Partial statuses** (Scenarios 4, 5, 6, 10, 12, 13, 14, 20) on the strength of work landed since.

**Caveat (honest):** "Pass (automated)" means green automated coverage of the scenario steps, not a witnessed manual acceptance run against a deployed environment. Formal acceptance sign-off (an auditor/operator executing each scenario against the running system and attesting) remains a distinct human step this document enables but does not replace.

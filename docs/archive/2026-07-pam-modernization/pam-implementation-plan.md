> **ARCHIVED 2026-09-06.** Historical record only — this does not describe the current system.
> Written on branch `pam/p0-modernization` (2026-07-02 → 2026-07-06); never merged. The reference
> implementation (345 commits, migrations 057–061) lives at tag `archive/pam-p0-modernization-2026-07-06`.
> Paths here are PRE-REBRAND (`apps/Phoenix-Predict-Combined/go-platform` = `apps/taptrade-platform/go-platform`;
> `talon-backoffice/packages/app` = `frontend/packages/office`) and units are pre-points ("cents", before
> migration 050). Commit hashes cited inside resolve only at that tag.
> For what of this main still lacks, see `docs/licensability-gaps.md`. See `CLAUDE.md` for current architecture.

# PAM Implementation Plan

## Plan Status

**Revised June 2026 to reconcile with the implemented system.** This is no longer a greenfield
plan. An active implementation exists — `Taya_NA_Predict` (Phoenix-Predict-Combined): a single
**Go gateway** backend (`go-platform/services/gateway`, ~45+ migrations) plus the
**`talon-backoffice`** Next.js admin UI. The trading/settlement core is built and strong; the
remaining work is **remediation of below-bar items** and **net-new compliance and back-office
breadth**. This plan therefore pivots from "build phases" to a **gap-driven, prioritized
roadmap** anchored to `/docs/taya-gap-analysis.md` (independently cross-checked in
`/docs/codex-vs-claude-comparison.md`). Still non-coding: this sequences and scopes work; it
does not implement.

## Current State (what exists — do not rebuild)

- **Backend:** one Go gateway (canonical). The Scala `phoenix-backend` is dead legacy. App was
  forked from a sportsbook codebase on 2026-04-16; expect residual dead sportsbook code.
- **Built & at/above spec bar:** CLOB matching engine (complementary YES/NO issuance), orders/
  trades/positions/exposure & P&L, idempotent settlement (propose→challenge→finalize +
  disputes), wallet money-path (idempotency, row locks, SERIALIZABLE), granular RBAC,
  DB-trigger append-only audit, fail-closed geofencing + per-market jurisdiction, responsible-
  trading limits enforced pre-order, HMAC webhooks + scoped partner API, loyalty, backend
  bonus/wagering engine, player profile + notes + status, markets/settlement/risk/audit admin
  screens.
- **Custody:** custodial off-chain (single treasury, Postgres cents ledger, human-broadcast
  withdrawals, crypto rail default-off). On-chain non-custodial stack (`contracts/`,
  `services/relayer`) = design seed, not runnable.

## Build Principles (carried forward, adjusted)

- **Extend the Go gateway; don't fork it.** New compliance/back-office modules follow the
  existing handler→service→repository pattern and migration discipline.
- **Ledger-first integrity still governs** — but the near-term action is *migrating* the
  single-entry ledger toward double-entry, not building a ledger from scratch.
- **Compliance and audit remain cross-cutting** — reuse the existing RBAC, audit-trigger, and
  geo-gate substrate for every new feature.
- **Treat the MFA stub and KYC mock-fallback as security defects**, fixed before breadth work.
- **Prefer integrate-over-build** for KYC/AML/sanctions vendors.

## Recommended Architecture (as-built + targets)

- **Frontend:** continue `talon-backoffice` App Router (`packages/office/app/(dashboard)/*`);
  the legacy Pages-Router tree is dead and should not be extended.
- **Backend:** continue the single Go gateway; only split into services if scale demands it
  (note: Codex's original 14-service plan, incl. a dedicated compliance service, was collapsed
  into the gateway — that collapse is why AML/notifications/CMS fell out; re-introduce them as
  gateway modules or services per capacity).
- **Data:** existing Postgres; add double-entry ledger tables, AML/screening tables, document
  blob storage, segmentation, notification templates, and a config/flag store.

## Remediation & Gap Roadmap (prioritized)

### P0 — Compliance & financial-integrity blockers (regulatory/security gating)

1. **AML transaction monitoring + SAR workflow** — net-new. Real-time funding/trading pattern
   rules, alerts → cases, SAR generation. (spec §12, §18) — *Missing.*
2. **Sanctions/OFAC + PEP screening** — integrate a real list/vendor; enforce (not observe-
   only) on onboarding, deposit, and withdrawal. (spec §12) — *Stubbed.*
3. **Real admin MFA** — replace the in-memory toggle with enforced TOTP/WebAuthn at login for
   privileged roles. Security defect. (spec §11, §27) — *Stub.*
4. **KYC hardening** — admin review UI, production IDV vendor, **document file/binary storage**
   (today metadata-only), and remove the silent in-memory mock fallback. (spec §12, §20) —
   *Partial.*
5. **Double-entry ledger migration** — move from single-entry running-balance to balanced
   debit/credit postings with a reconciliation/erasure-safe model. (spec §14, §30) — *Partial.*
6. **Dual-approval (maker-checker)** for settlement and high-value adjustments. (spec §7, §25)
   — *Missing.*

### P1 — Back-office money-movement & operations surfaces

7. **Cashier/deposits + withdrawals queue + AWA auto-approval rules engine** (limits,
   thresholds, day schedule, manual-review triggers). `/cashier` is currently empty. (spec §22)
8. **Manual balance-adjustment UI** with reason + approval (backend exists; UI is dead legacy).
   (spec §14, §25)
9. **Player Profile 360 — add KYC and Limits/self-exclusion tabs.** (spec §10)
10. **Market-integrity surveillance** (wash trading, spoofing, collusion) → alerts → cases;
    **fraud/duplicate-account detection.** (spec §18)
11. **Bonus admin UI** over the existing backend engine; **reporting/exports module**;
    **notification templates** (replace hardcoded email bodies). (spec §21, §23, §20)

### P2 — Platform breadth

12. **Activate multitenancy** — make queries/auth scope on `tenant_id` (currently dormant);
    add tenant/brand + global-jurisdiction admin UIs and a DB-backed feature-flag/config store.
    (spec §8, §25)
13. **Segmentation/CRM** (tags/tag-groups + query builder + campaigns). (spec §21)
14. **Data-retention/DSAR tooling** reconciled with immutable audit. (spec §28)
15. **Decision: non-custodial on-chain settlement.** If a product goal, build out the contracts
    (no implementations today), relayer (no source), and bridge-watcher; otherwise formally
    descope and keep the custodial model. (spec §17, §26)

## Dependency Map

- P0 #3 (MFA) and #4 (KYC) gate any compliant launch; do first.
- P0 #1/#2 (AML/sanctions) depend on the existing geo-gate + KYC substrate and feed the case
  system (P1 #10).
- P0 #5 (double-entry) underpins reporting (P1 #11) and adjustments (P1 #8).
- P1 #7 (withdrawals/AWA) depends on #2 (sanctions screening on payout) and dual-approval (#6).
- P2 #12 (multitenancy) is foundational for multi-brand but independent of the trading core.

## Suggested Agent Workstreams

- **Compliance**: AML, sanctions/PEP, KYC UI+vendor+doc storage, DSAR.
- **Security**: real MFA, remove mock fallbacks, dual-approval.
- **Financial Core**: double-entry ledger migration, reporting/exports.
- **Cashier/Payments**: deposits + withdrawals queue + AWA + adjustment UI.
- **Surveillance**: market-integrity + fraud/duplicate detection.
- **Growth/Platform**: bonus UI, segmentation/CRM, notification templates, multitenancy
  activation, config/flag store.

## Risks

- **Compliance perimeter is currently human-manual** (AML missing, MFA stub, screening off,
  KYC mock-fallback) — highest regulatory risk; prioritize P0.
- **Single-entry ledger** complicates reconciliation/audit at scale; migration touches the
  money path and must preserve idempotency invariants.
- **Sportsbook-fork leftovers** (dead Pages-Router screens, legacy components) can mislead — do
  not extend dead code; verify a surface is App-Router-wired before building on it.
- **Multitenancy retrofit** touches every query path once activated.
- **On-chain stack is vaporware** — if promised externally, the gap is large (contracts have no
  implementations, relayer has no source).

## Decisions Required Before Build

1. Regulatory regime + licensing (drives AML/sanctions/reporting/settlement obligations).
2. Build native sanctions/PEP vs. vendor-only; which KYC/AML vendor.
3. Double-entry ledger migration approach (and reconciliation with existing balances).
4. Custodial vs. non-custodial direction (build the on-chain stack or formally descope).
5. Multitenancy activation timing (single-brand launch vs. multi-brand).
6. Dual-approval thresholds and segregation-of-duties boundaries.
7. AWA default rules (limits, thresholds, manual-review triggers).
8. Retention schedules vs. right-to-erasure reconciliation.

*Prior context retained:* the original greenfield phase plan (foundation→player→ledger→trading→
compliance→cases→CRM→reporting→hardening) is superseded by the roadmap above because the
foundation, player, ledger, and trading phases are substantially built. Open questions remain in
`/docs/pam-open-questions.md`.

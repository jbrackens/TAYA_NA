# PAM Modernization — Decisions Needed

> **STATUS 2026-07-02 evening: ALL DECISIONS ANSWERED.** The human answered
> every item interactively (recorded in the ledger's DECISION ROUND section,
> `docs/pam/PROGRESS_LEDGER.md`). This file now records the questions AND the
> answers, for the audit trail. Nothing here is awaiting input anymore; the
> only standing follow-ups for humans are marked ⏳ below (counsel inputs and
> per-phase protected-core reviews).

---

## BOOT-1 — Supply the PAM source-of-truth docs — ✅ RESOLVED

The five PAM docs were never committed; they lived only in the outer non-git
tree. **Decision:** the human authorized copying them in. Landed at commit
`54139c24`; `spec.md` verified (correct title, `## 36. Progress Matrix`,
`## 37. Reconciliation`). Termination pass B is unblocked and running.

## P0-4 — Sanctions/OFAC + PEP screening — ✅ DECIDED: OpenSanctions/yente

Self-hosted matcher over open OFAC/UN/EU data. Enforcement gates onboarding
now; extends to deposit/withdrawal when money rails open. Seam shaped like
`internal/alphacashier/screening.go` (fail-closed). Upgrade path to a
commercial vendor (ComplyAdvantage / World-Check) when rails open.

## P0-5 — AML monitoring + SAR workflow — ✅ DECIDED: regime-agnostic plumbing

Build the wallet/ledger event stream → `aml_alerts` → `aml_cases` →
disposition/SAR-export workflow now; regime rules load as **data** when
compliance counsel names the regime and thresholds. ⏳ Counsel still owes the
regime + threshold sheet; that arrival converts to a normal rules-pack item.

## P0-6 — Dual-approval (maker-checker) — ✅ DECIDED: threshold-based

Manual balance adjustments ≥ 10,000 cents ($100) require a second approver;
settlement finalize ALWAYS requires four-eyes. Implementation:
`pending_admin_actions` table + approve endpoint on a distinct permission,
both legs audited. ⏳ The settlement half touches protected core — it ships
only under human review of the diff.

## P0-7 — Double-entry ledger migration — ✅ APPROVED: phased build under review

Design at `docs/pam/designs/p0-7-design.md` approved as written
(accounts/transactions/postings; shadow-write → backfill → verify → cutover;
idempotency-key mapping preserved). ⏳ Every phase is a protected-core diff:
built on the branch, human-reviewed before merge. Phase 1 (shadow-write, old
path stays authoritative) is zero-risk and first.

## P1-1 — Cashier back office — ✅ DECIDED: build now, flag-gated OFF

Withdrawals queue + AWA auto-approval rules engine + deposits view, launch-safe
per the Two-Spec Precedence Rule: flag default OFF, zero launch navigation,
unreachability test required. AWA thresholds default to the P0-6 class ($100)
as runtime-configurable data. Satisfies PAM §22 for licensing while inert
under Tiangge §2/§19.

## P2-1 core — Tenant query/auth scoping — ✅ DECIDED: DEFERRED

Single-tenant at launch. The dormant `tenant_id` column (migration 037) keeps
the door open; the design note (`docs/pam/designs/p2-1-design.md`) stands as
the approved direction for when a second brand/tenant is actually planned.
Peripherals (feature-flag store, tenant/brand admin) remain DONE.

## P2-3 — Data-retention / DSAR — ✅ DECIDED: build export + pseudonymization

DSAR data export plus a pseudonymization pass that redacts PII while
preserving audit/ledger row integrity (retained under the legal-obligation
basis). Retention periods ship as config placeholders. ⏳ Counsel still owes
the retention schedule + confirmation of the audit/ledger erasure carve-out.

## P2-4 — Non-custodial on-chain settlement — ✅ DECIDED: FORMALLY DESCOPED

Settlement stays off-chain in the existing engine; money moves via the
custodial native-USDT rail. A formal descope note citing PAM §22/on-chain
requirements and Tiangge §2/§19 will be committed (gates ADR-0003/0004).
Revisit only if the venue decision changes.

## GAP decisions — ✅ ALL DECIDED

- **GAP-3 — TOTP secrets at rest:** app-layer AES-GCM via `AUTH_MFA_ENC_KEY`
  now; fail-closed if the key is absent in deployed environments; key-source
  seam kept KMS-ready for production later.
- **GAP-6 — Fraud signals:** capture IP + user-agent at auth events into a new
  `punter_signals` table. No client-side fingerprint SDK. Feeds the P1-5
  duplicate-account detectors.
- **GAP-8 — Jurisdiction config:** runtime **tightening only** — admins can
  remove countries from the geo allowlist at runtime (audited); adding a
  country still requires env change + redeploy + boot validation. The
  fail-closed boot control is never weakenable from the UI.

---

## NEW decisions surfaced by pass B spec reconciliation (2026-07-03) — ⚑ OPEN

Pass B (`docs/pam/pass-b-findings-2026-07-03.md`) confirmed 67 gaps; three
need a human call before their items can build:

### GAP-19 — Production KYC IDV vendor (⚑ vendor)
**Question.** Which identity-verification vendor goes behind the existing
`internal/compliance/idv.go` seam? Today `KYC_IDV_PROVIDER=''/manual` means
back-office manual review is the only real path.
**Options.** (a) Sumsub — crypto-friendly, doc+liveness, bundles some
screening; (b) Onfido/Persona — strong docs+biometrics, US-centric pricing;
(c) stay manual-review until money rails open (current posture, zero cost).
**Recommendation.** (c) for the points-only launch, pick (a) when rails open —
consistent with the P0-4 sanctions decision (open-source now, commercial later).
**Unblock.** Vendor name + API key provisioning, or an explicit "stay manual
until <milestone>".

### GAP-28 — Secrets management beyond the MFA key (⚑ infra)
**Question.** All service secrets are env-vars; GAP-3's decided AES-GCM
covers TOTP secrets only. Where do platform secrets live long-term?
**Options.** (a) stay env-vars with deploy-host hygiene (status quo); (b)
cloud KMS/secrets-manager when infra lands (extends GAP-3's KMS-later seam);
(c) self-hosted Vault.
**Recommendation.** (a) now, (b) at production-infra buildout — matches the
GAP-3 posture. Escalates if ops ever stores credentials in the DB config
store (see GAP-31).
**Unblock.** Confirm (a)-now/(b)-later, or name the target.

### GAP-29 — ISO 27001-grade organizational posture (⚑ org, not code)
**Question.** §27 expects ISMS-class organizational controls (policies,
vendor management, incident process). This is outside what the code loop can
build. Who owns it, and to what timeline (licensing dependency)?
**Unblock.** Named owner + target framework/timeline; the loop records the
answer and closes the item as org-owned.

---

## What was already DONE before this round (no decision needed)

P0-1 admin MFA (enforced TOTP, single-use, OAuth admin denial), P0-2 KYC
fail-closed, P0-3 KYC review UI + document storage; P1-2 balance-adjustment UI,
P1-3 Limits/self-exclusion tab, P1-4 market-integrity surveillance, P1-5
duplicate-account detection, P1-6 bonus admin UI + notification templates + CSV
exports; P2-1 peripherals (feature-flag store, tenant admin), P2-2
segmentation/CRM (tags + query builder + campaigns); and the security-hardening
GAP builds GAP-1 (fail-closed KYC/RG/geo), GAP-2 (TOTP replay protection),
GAP-4 (env fail-closed), GAP-5 (durable auth audit), GAP-7 (bonus-admin RBAC).
All committed on `pam/p0-modernization`, gateway + auth suites green.

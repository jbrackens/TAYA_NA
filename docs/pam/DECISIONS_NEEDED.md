# PAM Modernization — Decisions Needed

Every item below is BLOCKED awaiting a human decision or input. The autonomous
loop has taken all of them as far as it can without that input. Ordered by
priority. Full context for each lives in `docs/pam/PROGRESS_LEDGER.md`; the
protected-core items have full design notes under `docs/pam/designs/`.

The loop's own termination is gated on the FIRST item (BOOT-1): the PAM spec is
absent, so the spec-reconciliation completion check cannot run.

---

## BOOT-1 (blocks loop termination) — Supply the PAM source-of-truth docs

**Question.** The five PAM docs — `spec.md`, `taya-gap-analysis.md`,
`pam-implementation-plan.md`, `pam-domain-model.md`, `pam-open-questions.md` —
were never committed to the repository. They exist only in the outer non-git
tree at `/Users/john/Sandbox/Taya_NA_Predict/docs/pam/`, which the loop is
forbidden to read. Every backlog item this session was therefore implemented
from its inline description + the code, and spec §-citations read "pending
BOOT-1". The loop's termination pass B (walk the spec's acceptance
scenarios / progress matrix) cannot run.

**Unblock (one command):**
```
mkdir -p /Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict/docs/pam
cp /Users/john/Sandbox/Taya_NA_Predict/docs/pam/*.md \
   /Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict/docs/pam/
# then commit on branch pam/p0-modernization
```
`spec.md` must open with `# Enterprise Prediction Market PAM / Back Office Spec`
and contain `## 36. Progress Matrix` and `## 37. Reconciliation`. Once present,
the next loop firing runs pass B, adds spec citations to commits, and either
terminates or appends GAP items for any unmet spec scenario.

---

## P0-4 — Sanctions / OFAC + PEP screening (⚑ vendor)

**Question.** Which screening vendor/data source, and does enforcement
re-screen existing users? Today only crypto WALLET ADDRESSES are screened
(alpha cashier); there is no person-level name/DOB screening at onboarding.

**Options.** (a) ComplyAdvantage / Refinitiv World-Check — commercial, PEP +
adverse media, fastest behind the existing IDV-provider seam, recurring cost.
(b) OpenSanctions/yente — self-hosted over open OFAC/UN/EU data, no per-check
cost, weaker PEP, tuning on us. (c) Bundle into the KYC IDV vendor.

**Recommendation.** (b) now for launch-mode (onboarding gate only), upgrade to
(a) when money rails open.

**Unblock.** Name the vendor/source + the enforcement points.

## P0-5 — AML transaction monitoring + SAR workflow (⚑ regime)

**Question.** Which regulatory regime's rule set and thresholds, and what
filing workflow does the target license expect? No monitoring engine exists.

**Options.** (a) Build rules now with placeholder thresholds — risks the wrong
regime. (b) Build the plumbing now (wallet/ledger event stream →
`aml_alerts`/`aml_cases` + review UI), load regime rules as data later. (c)
Wait.

**Recommendation.** (b) — the alert→case→disposition workflow is
regime-independent.

**Unblock.** Regime + threshold sheet from compliance counsel.

## P0-6 — Dual-approval (maker-checker) for settlement + high-value adjustments (⚑ thresholds)

**Question.** Which actions require four-eyes, above what thresholds? No
maker-checker exists.

**Options.** (a) Universal four-eyes on settlement + any manual adjustment. (b)
Threshold-based (adjustments ≥ X; settlement always). (c) Role-split only.

**Recommendation.** (b), X ≈ 10,000 points-cents until set. NOTE: the
settlement half touches protected core → even after approval, that change needs
human review of the diff.

**Unblock.** Action list + thresholds; confirm the settlement-side change may
proceed under protected-core review.

## P0-7 — Double-entry ledger migration (⚑ PROTECTED CORE)

Full design note: `docs/pam/designs/p0-7-design.md` (current single-entry
`wallet_ledger` verified; target accounts/transactions/postings schema;
four-phase shadow-write→backfill→cutover migration; idempotency-key mapping;
testing gates). **Unblock.** Approve the account taxonomy, goose-vs-runtime
DDL, sequencing vs P1-1, and bonus-history mapping — then implement
phase-by-phase under human review (protected core).

---

## P1-1 — Cashier back office: withdrawals queue + AWA rules engine (⚑ launch-safe / thresholds)

**Question.** PAM §22 requires it; Tiangge §2/§19 forbid user money exposure.
The crypto rail (`internal/alphacashier`) is already flag-gated OFF and
boot-refused in prod. Should the withdrawals-queue + auto-withdrawal-approval
rules-engine back office be built now (flag-gated OFF, unreachability test) or
deferred to a dated money-enabled milestone?

**Options.** (a) Build now, flag-gated OFF — satisfies §22, unused at launch.
(b) Defer to a money-enabled milestone. (c) Build the gateway data model + AWA
rules engine now, UI later.

**Recommendation.** (a) if the licensing timeline needs §22 present; (b) if
launch is near and money is genuinely out of scope. Also needs the AWA
threshold/schedule policy (same class as P0-6).

**Unblock.** (a)/(b)/(c) + the AWA policy.

---

## P2-1 core — Activate tenant query/auth scoping (⚑ PROTECTED CORE)

Design note: `docs/pam/designs/p2-1-design.md`. Migration 037 already shipped
the dormant `tenant_id` column everywhere; nothing reads it. Scoping the
trading/wallet SQL is protected-core. The peripheral admin surfaces
(feature-flag store, tenant/brand admin) are DONE. **Unblock.** Approve the
RLS-plus-explicit-WHERE isolation model + the tenant-claim source; then
implement step-by-step under human review behind `TENANCY_ENFORCED`.

## P2-3 — Data-retention / DSAR tooling (⚑ legal)

**Question.** Retention period per data category (KYC docs, audit log, wallet
ledger, PII), and does DSAR erasure carve out the immutable audit/ledger?

**Recommendation.** Build a DSAR export + a pseudonymization pass that redacts
PII while preserving audit/ledger integrity; needs counsel to set periods +
confirm the audit carve-out (retain financial/audit records under the
legal-obligation basis).

**Unblock.** Retention schedule + erasure-vs-immutability policy from legal.

## P2-4 — Non-custodial on-chain settlement (⚑ major decision — never auto-started)

Build (contracts/relayer/bridge) vs. formal descope. Gates ADR-0003/0004 and
interacts with the launch policy (crypto-native, outside-US, off-chain TBD).
**Unblock.** Founder decision to build (with scope) or formally descope; if
build, a full protected-core design review.

---

## GAP decisions (⚑) — smaller, still need a human call

- **GAP-3 — Encrypt TOTP secrets at rest.** Where does the wrapping key live?
  (a) cloud KMS envelope, (b) `AUTH_MFA_ENC_KEY` app-layer AES-GCM, (c)
  pgcrypto. Recommend (a) for prod, (b) interim. Then a bounded auth-module
  build.
- **GAP-6 — Device/IP fingerprint capture** for stronger fraud detection.
  `punters` stores no IP/device/UA. Capture into a new `punter_signals` table
  from the auth service? Needs a privacy/legal nod. (P1-5 dup-detection works
  today via email normalization.)
- **GAP-8 — Runtime-editable jurisdiction config.** The geo allowlist is
  env-driven + fail-closed by boot validation; a naive runtime editor weakens
  that control. Recommend (b): allow runtime TIGHTENING only. Needs the
  fail-closed-config model decision (relates to the P2-1 feature-flag store).

---

## What is DONE (no decision needed)

P0-1 admin MFA (enforced TOTP, single-use, OAuth admin denial), P0-2 KYC
fail-closed, P0-3 KYC review UI + document storage; P1-2 balance-adjustment UI,
P1-3 Limits/self-exclusion tab, P1-4 market-integrity surveillance, P1-5
duplicate-account detection, P1-6 bonus admin UI + notification templates + CSV
exports; P2-1 peripherals (feature-flag store, tenant admin), P2-2
segmentation/CRM (tags + query builder + campaigns); and the security-hardening
GAP builds GAP-1 (fail-closed KYC/RG/geo), GAP-2 (TOTP replay protection),
GAP-4 (env fail-closed), GAP-5 (durable auth audit), GAP-7 (bonus-admin RBAC).
All committed on `pam/p0-modernization`, gateway + auth suites green.

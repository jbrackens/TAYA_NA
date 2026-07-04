# PAM Modernization — Decisions Needed

> **STATUS 2026-07-04 (loop TERMINATION): 3 NEW decisions open** (see
> "Decisions surfaced by the Termination reconciliation" at the bottom). Every
> other item below was answered by the human on 2026-07-02 (recorded in the
> ledger's DECISION ROUND section, `docs/pam/PROGRESS_LEDGER.md`); this file
> records the questions AND those answers for the audit trail. The 3 new items —
> plus the ⏳ standing follow-ups (counsel inputs, per-phase protected-core
> reviews) and the ⚑ vendor/infra items — are what the loop now hands back to
> humans, because every remaining backlog item is either DONE-with-evidence or
> BLOCKED-on-one-of-these-decisions. Nothing further is autonomously buildable
> without a human call.

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

## Decisions surfaced by the Termination reconciliation (2026-07-04) — ⚑ OPEN

The final Termination pass B (an adversarial reconciliation hunting the
"present-but-unwired" pattern) surfaced three items that need a human call
before their work can proceed. Two are genuine capability gaps the earlier
single-lens evidence pass had scored as Built/Pass; the third is a deferred
policy sub-part. All three are now tracked BLOCKED with design notes.

### D-BONUS-TURNOVER — Bonus turnover → conversion wiring (GAP-77, ⚑ protected-core + balance-path)
**Question.** Bonus turnover accrual (`RecordWageringContribution`) and
conversion to real balance (`ConvertBonusToReal`) exist but have zero
production callers — a granted bonus never accrues turnover from live trading
and never converts (§32 Scenario 14 unreachable). Where may the accrual hook,
and what counts as turnover?
**Options.** (a) post-trade HTTP seam calls `RecordWageringContribution` with
matched notional (keeps the protected trade core untouched — RECOMMENDED); (b)
accrue inside the protected settlement/trade transaction (strongest
consistency, but edits protected core → needs explicit sign-off).
**Also needs.** What volume counts (matched notional; taker-only vs both;
void clawback y/n); per-trade idempotency (reuse the order key); the
`bonus.converted` audit + launch-mode flag gating the real-balance credit.
**Unblock.** Approve the hook point (+ if (b), authorize touching the trade
path), the turnover definition, and the conversion audit/flag. Full design:
`docs/pam/designs/gap-77-bonus-turnover-wiring-design.md`.

### D-CAMPAIGN-DISPATCH — Segmentation campaign send (GAP-79, ⚑ channel + consent + throttle)
**Question.** Campaign targeting/CRUD/preview + the launch-mode 403 gate are
built, but `execute` returns `501 "not yet wired"` — there is no send worker.
What does dispatch send, to whom, and how?
**Options / needs.** (1) **Channel:** email-only now (SMS/push/in-app are
GAP-42 vendor-BLOCKED) vs wait on GAP-42. (2) **Consent (compliance):** a
per-recipient marketing consent/opt-out model that dispatch MUST honor — only
loyalty opt-out exists today; this rides the P2-3 privacy decision. Mass-send
without an enforced opt-out is a compliance risk, so this is the load-bearing
blocker. (3) **Throttle:** batch size + inter-send throttle + per-recipient
idempotency + a `campaign.dispatched` audit.
**Recommendation.** Email-only, gated behind an explicit consent model built
with P2-3; defer other channels to GAP-42.
**Unblock.** Confirm (1)/(2)/(3). Full design:
`docs/pam/designs/gap-79-campaign-dispatch-design.md`.

### D-STEAL-LOCK — Guaranteed single-session enforcement (GAP-76 slice 2, ⚑ policy)
**Question.** GAP-76 slice 1 shipped admin session-revocation ("kick session").
Slice 2 is "steal-lock": should a new login **displace** all prior sessions
(single-session guarantee) or **refuse** the second login? Today the
file-backed session store's `Put` already evicts prior same-user sessions
(de-facto single-session in file mode), but the Redis store does not — so the
behavior is store-dependent, not a guaranteed policy.
**Options.** (a) displace-on-login uniformly (kick the old session — matches
the file store today); (b) refuse the second concurrent login; (c) leave
multi-session allowed and rely on admin kick-session (slice 1) for incident
response.
**Recommendation.** (a) if the venue wants a single-session guarantee; make the
Redis store match the file store and add an enforcement test. Low-risk, but a
UX/security policy call, so not built autonomously.
**Unblock.** Pick (a)/(b)/(c).

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

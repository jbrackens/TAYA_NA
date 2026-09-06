> **ARCHIVED 2026-09-06.** Historical record only — this does not describe the current system.
> See `CLAUDE.md` for current architecture and `docs/licensability-gaps.md` for what still applies.

# PAM back-office modernization — design & decision record

**Status:** TERMINATED 2026-07-06, never merged.
**Reference implementation:** tag `archive/pam-p0-modernization-2026-07-06` (commit `fcb1492c`, 345 commits).

An autonomous loop ran 2026-07-02 → 2026-07-06 to make the back-office licensable: staff MFA, KYC
review, AML screening, maker-checker on money movements, market-integrity surveillance, RBAC
least-privilege, a tamper-evident audit chain, and operator screens for every wired backend. It
terminated cleanly — every item through GAP-105 either DONE with evidence or BLOCKED with a decision
brief — but the work never reached `main` and is now unmergeable as code.

## Why the code cannot be merged

- It was written on the **pre-rebrand tree**: `apps/Phoenix-Predict-Combined/go-platform` is today's
  `apps/taptrade-platform/go-platform`; `talon-backoffice/packages/app` is today's
  `frontend/packages/office`.
- Units are **pre-points** ("cents", before migration `050_points_unit_model.sql`).
- Its migrations are numbered **057–061 and collide with main's numbering** (main is at 056).
- It forked at `a53155c3` (2026-07-02) and is ~260 commits behind `main`.

Treat it as a **specification and reference implementation**, not a source to cherry-pick. Anything
worth having gets re-implemented fresh against current `main`.

## What is here

| File | What it is |
|---|---|
| `spec.md` | The licensability requirements reference. Still the best one in the repo. |
| `pass-b-findings-2026-07-03.md` | Adversarial audit of the platform. Because nothing merged back, most P0/P1 findings still describe `main`. |
| `taya-gap-analysis.md` | Pre-branch gap snapshot — closer to main's posture today than the spec's own status section. |
| `pam-domain-model.md` | Domain model for compliance entities (AdminUser/Role/Permission, KYCProfile, AMLScreening, Case, AuditLog, FeatureFlag) and its invariants. |
| `pam-implementation-plan.md` | Prioritized backlog. Needs re-cutting: its P1 #7 and P2 #15 are cashier-shaped and obsolete under points-only. |
| `DECISIONS_NEEDED.md` | The owner decisions of 2026-07-02 (sanctions provider, AML posture, dual-approval threshold, DSAR approach). |
| `PROGRESS_LEDGER.md` | The 882-line loop ledger. Its Lessons section is the reusable part. |
| `schema-domain-reconciliation.md` | Divergence taxonomy between the schema and the domain model — still true for main. |
| `pam-open-questions.md` | Mostly resolved by the branch; kept for the reasoning. |
| `designs/` | Ten design notes for individual gaps. |

**Deliberately excluded from this copy** (kept only at the tag): `scenario-evidence.md` — a
Pass/Partial status board for a tree `main` does not have, misleading even with a banner — and three
notes that are obsolete under the points-only launch and already superseded by stronger records on
main: `p1-1-awa-auto-approval.md`, `gap-47-fiat-psp-descope.md`, `p2-4-descope.md` (see
`docs/archive/cashier/README.md` and `docs/adr/README.md`).

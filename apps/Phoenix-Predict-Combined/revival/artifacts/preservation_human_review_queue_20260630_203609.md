# Preservation Human Review Queue

- Generated: `2026-06-30T20:36:09Z`
- Scope: `apps/Phoenix-Predict-Combined`
- Current shortstat: `543 files changed, 35443 insertions(+), 14070 deletions(-)`
- Source evidence:
  - `revival/artifacts/preservation_deletion_map_20260630_203007.md`
  - `revival/artifacts/preservation_modification_map_20260630_203008.md`
  - `revival/artifacts/production_preservation_dossier_20260630_203021.md`
  - `revival/artifacts/rc_completion_audit_gate_20260630_203024.md`

## Decision

This worktree is not a total rewrite, but the active diff is large enough that
production preservation is still unproven. Scenario 12 must remain `Partial`
until the high-risk inherited-contract review below is completed or each item
has an accepted remediation.

## Deletion Disposition

| Bucket | Current Evidence | Preservation Decision | Required Review Before RC |
|---|---|---|---|
| Launch-prohibited player cashier routes, payment components, crypto/cashier clients, and cashier/deposit locale bundles | Deletion map classifies these paths; live no-money and route-boundary gates exist as replacement proof. | Keep absent from shipped player routes, client exports, and locale bundles. | Verify a fresh built/runtime route proof remains in the release regression set. |
| Launch-prohibited or launch-adjacent office cashier/provider review and wallet money-action surfaces | Deletion map classifies office cashier route, provider cashier review, transaction modal, and wallet payment table actions. | Keep out of active launch navigation and routable office surfaces. | Ops owner must confirm point-native account review, settlement, ledger, dispute, reward, and export workflows cover required operational work. |
| Retired gateway bet reconciliation command and fixture | Deletion map points to `cmd/prediction-reconciliation-report` and point-native reconciliation fixtures. | Do not restore the old bet/cents replay command unchanged. | Reviewer must confirm the point-native reconciliation report covers the inherited proof intent and is included in release gates. |
| Duplicate seed fixture | Deletion map classifies only duplicate `read-model.seed 2.json`; canonical fixture remains. | Keep deleted if canonical fixture coverage is intact. | Confirm no test or seed script still expects the duplicate path. |
| Retired or relocated tests/helpers | Deletion map identifies point-native or package-level replacement suites. | Accept only where replacement tests prove the launch-valid behavior. | For each retired test class, confirm it was launch-incompatible or has equivalent point-native coverage. |

## High-Risk Modification Review Queue

| Priority | Area | Why It Is Risky | Evidence To Inspect |
|---|---|---|---|
| P0 | Gateway HTTP/admin handlers | 50 changed handler/test files can alter authz, status codes, exports, audit writes, route shape, and launch copy boundaries. | Focus on `internal/http`, especially admin routes, CSV/export paths, error serialization, and unsafe reason/display-copy redaction tests. |
| P0 | Prediction engine and persistence | 24 changed files touch matching, lifecycle, settlement, positions, SQL repositories, and reconciliation assumptions. | Compare point settlement, cancellation, replay, idempotency, and SQL persistence against inherited invariants. |
| P0 | Point wallet ledger contract | 4 changed files touch reservations, captures, releases, ledger rows, and point balance math. | Review idempotency keys, available/locked math, rollback behavior, and ledger reason compatibility. |
| P0 | Auth/session contract | 2 changed auth-service files touch account/session behavior and disclosure acceptance. | Review registration, login, cookie/session compatibility, and starter/disclosure persistence. |
| P0 | Public API/client contracts | OpenAPI and shared API-client files have large additions and compatibility aliases. | Review removed paths, renamed schemas, legacy client aliases, and generated-client import stability. |
| P1 | JVM backend dependency/runtime compatibility | Scala/SBT dependency and compiler-compatibility edits remain high-risk inherited backend changes. | Review resolver-backed classpath evidence, residual OSV policy, and launch-owner/security acceptance. |
| P1 | Office admin operations surface | 62 office files changed or added across admin workflows. | Review navigation, auth, proxy behavior, user/account review, prediction admin, moderation, and audit-display sanitization. |
| P1 | Player launch surface | 255 player files changed or added, including routes, tests, locales, API normalization, and visuals. | Review route manifest, user journey, no-money copy, portfolio/ledger, rewards, social, and market detail behavior. |

## Review Rules

- Do not restore launch-prohibited fiat, crypto, deposit, withdrawal, cashout, or redeemable-prize paths as routable/imported launch surfaces.
- Do restore or explicitly anchor inherited private business logic if deletion or modification removed production value without being required by the points-only launch constraint.
- Prefer compatibility adapters and response-boundary redaction over deep internal renames when private legacy names preserve storage or operational contracts.
- Treat passing tests as evidence only for the behavior they actually cover; they do not replace human review of broad inherited production contracts.

## Current RC Impact

The current RC gate correctly fails with Scenario 12 `Partial`. The remaining
blocker is not the canonical user journey alone; it is final safety,
security, and preservation confidence for the inherited production system after
a large adaptation.

## Post-Queue Gate Refresh

- `make qa-preservation-deletions qa-preservation-modifications qa-preservation-production-dossier`: pass
- Fresh deletion map: `revival/artifacts/preservation_deletion_map_20260630_203720.md`
- Fresh modification map: `revival/artifacts/preservation_modification_map_20260630_203721.md`
- Fresh production dossier: `revival/artifacts/production_preservation_dossier_20260630_203734.md`
- `make qa-rc-completion-audit`: expected fail, Scenario 12 remains `Partial`
- Fresh RC audit: `revival/artifacts/rc_completion_audit_gate_20260630_203744.md`

# Production Contract Review Pack

- Generated: `2026-07-01T08:12:31Z`
- Git root: `/Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict`
- Scope: `apps/Phoenix-Predict-Combined`
- Current tracked diff: `544 files changed, 36222 insertions(+), 14127 deletions(-)`
- Tracked status counts: `490 modified`, `54 deleted`
- Decision: this pack does not claim inherited production contracts are preserved. It exists to make the remaining human review smaller, sharper, and harder to accidentally skip.

## Executive Answer

The inherited production system was not intentionally replaced wholesale, but the current diff is broad enough that it must be treated as a preservation risk until reviewed. The safe interpretation is:

- Launch-prohibited public money surfaces were removed or guarded to satisfy Tiangge's non-redeemable points launch contract.
- Some inherited compatibility names and private adapters remain so existing internal contracts can survive behind point-native launch boundaries.
- High-risk inherited business logic, API contracts, and admin flows were modified in enough places that tests and classification maps are not sufficient signoff.
- Scenario 12 must stay `Partial` until a launch owner/security reviewer accepts the residual policy posture and a human reviewer signs off the high-risk production-contract queue.

## Primary Evidence

| Evidence | Path | What It Proves | What It Does Not Prove |
|---|---|---|---|
| Production preservation dossier | `apps/Phoenix-Predict-Combined/revival/artifacts/production_preservation_dossier_20260701_080533.md` | Broad-diff risk is visible; compatibility anchors are checked; high-risk queue is enumerated. | That every inherited contract still behaves identically or acceptably. |
| Modification map | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_modification_map_20260701_080532.md` | Modified tracked files are classified; high-risk and large-change files are surfaced. | That each modified file has been manually reviewed. |
| Deletion map | `apps/Phoenix-Predict-Combined/revival/artifacts/preservation_deletion_map_20260701_080532.md` | Deleted tracked files are classified with replacement evidence. | That every replacement is behaviorally equivalent to the inherited production proof. |
| RC audit | `apps/Phoenix-Predict-Combined/revival/artifacts/rc_completion_audit_gate_20260701_080837.md` | Release-candidate completion is still blocked with Scenario 12 Partial. | That the remaining blockers are merely documentation work. |

## Highest-Risk Review Buckets

| Bucket | Changed tracked files | Review focus |
|---|---:|---|
| Player launch surface | 255 | Confirm money-path removals are launch-required and that replacement point-native flows cover the canonical journey. |
| Office admin/operations surface | 62 | Confirm removed cashier/payment admin surfaces do not delete required non-money account review, audit, risk, or support workflows. |
| Gateway HTTP/admin handlers | 50 | Confirm route behavior, authz, error envelopes, audit writes, exports, and compatibility payloads remain acceptable. |
| Prediction engine and persistence | 24 | Confirm matching, lifecycle, reservations, settlement, cancellation, and audit invariants survived the migration. |
| Economy/rank/compliance logic | 16 | Confirm rewards, rank, responsible-play, and abuse controls preserve intended production semantics under points-only rules. |
| Public OpenAPI/shared API-client contracts | 6 | Confirm old consumers either still work through compatibility aliases or have explicit launch-safe replacements. |
| Point wallet ledger contract | 4 | Confirm idempotency, available/locked math, reserve/capture/release semantics, and ledger rows remain correct. |
| Auth/session contract | 2 | Confirm registration, login/session, cookie behavior, and disclosure persistence remain production-compatible. |
| Guarded legacy transfer compatibility | 2 | Confirm disabled cashier compatibility routes cannot create fiat/crypto/cash-equivalent behavior and still preserve internal review data. |

## Top Churn Files To Review First

| + | - | Path | Why First |
|---:|---:|---|---|
| 3587 | 106 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/api/openapi.yaml` | Public API contract surface; large schema/copy movement. |
| 1376 | 40 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/wallet_handlers.go` | Active wallet/point-account route behavior and error/copy boundary. |
| 1073 | 181 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/prediction_handlers.go` | Player trading/market API behavior. |
| 1065 | 28 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/api-client/src/prediction-client.ts` | Shared client contract used by player/office callers. |
| 675 | 28 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/rewards/page.tsx` | Reward UX must stay non-redeemable and backed by real points behavior. |
| 615 | 82 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/market/[ticker]/page.tsx` | Canonical market-detail and trading journey surface. |
| 531 | 32 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/wallet/service.go` | Ledger balance invariants and point movement semantics. |
| 471 | 320 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/lib/api/wallet-client.ts` | Frontend wallet/ledger normalization and compatibility payload handling. |
| 450 | 64 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/containers/prediction-markets/index.tsx` | Admin market operations surface. |
| 448 | 9 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/types.go` | Core prediction domain model contract. |
| 387 | 61 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/bonus_handlers.go` | Reward/bonus point-grant behavior. |
| 361 | 37 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/loyalty_handlers.go` | Rank/XP/loyalty behavior and public copy. |
| 324 | 69 | `apps/Phoenix-Predict-Combined/talon-backoffice/packages/api-client/src/prediction-types.ts` | Shared public types for prediction flows. |
| 314 | 80 | `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/service.go` | Core trading, lifecycle, and settlement orchestration. |
| 186 | 59 | `apps/Phoenix-Predict-Combined/go-platform/services/auth/internal/http/handlers.go` | Account/session behavior plus launch disclosures. |

## Deleted Production Artifacts Needing Review

The deletion map classifies all 54 tracked deletions. Reviewers should treat these classes differently:

| Deletion class | Count | Review stance |
|---|---:|---|
| Player launch-prohibited cashier route/component/client/locale files | 32 | Expected for launch if live route-boundary evidence stays green. |
| Office launch-prohibited or launch-adjacent money admin surface | 5 | Expected only if account-review/audit/risk replacements cover non-money ops needs. |
| Retired/replaced tests and relocated test files | 8 | Accept only if point-native replacements cover the inherited behavior that still matters. |
| Retired money/sportsbook helpers | 5 | Accept only if point-ledger and prediction helpers replace all active launch usage. |
| Gateway reconciliation proof files | 3 | Accept only if point-native reconciliation command and fixtures prove equivalent settlement/accounting audit value. |
| Duplicate seed fixture | 1 | Low risk if the canonical read-model seed fixture remains intact. |

## Compatibility Anchors Already Checked

The latest dossier reports these anchors passing:

- Inherited `PhoenixApiClient` class is retained while `TianggeApiClient` is added as an alias.
- Shared API-client entrypoint exports both inherited and launch-facing names.
- Legacy wallet and audit payload reads remain private normalization details.
- Historical reconciliation Make aliases still route to point-native proof commands.
- Discovery QA compatibility naming remains as a launch-safe wrapper.

These anchors reduce accidental rewrite risk, but they do not replace file-by-file signoff on the high-risk queue.

## Required Human Signoff Questions

1. For each high-risk backend domain file, is the production behavior preserved, intentionally adapted for points-only launch, or intentionally retired?
2. For every deleted public money-path file, is the deletion required by the launch constraints and covered by route-boundary evidence?
3. For every deleted operational proof/test file, is there a point-native proof with equivalent coverage?
4. For OpenAPI and shared clients, are compatibility aliases sufficient for inherited consumers, or are breaking changes accepted for launch?
5. For wallet and prediction internals, do focused tests prove point movement, reservation, settlement, and ledger idempotency at the same strength as the inherited system?
6. For office/admin surfaces, are non-money support, audit, risk, and account-review workflows still usable without cashier/payment tools?

## Release Posture

Do not mark Scenario 12 `Pass` from this pack alone. A safe RC transition still requires:

- Passing preservation deletion, modification, production dossier, abuse-boundary, and live no-money-boundary gates.
- A current RC completion audit that no longer reports Scenario 12 Partial.
- Human signoff on the high-risk production-contract queue.
- Launch-owner/security acceptance or remediation of the residual policy posture.

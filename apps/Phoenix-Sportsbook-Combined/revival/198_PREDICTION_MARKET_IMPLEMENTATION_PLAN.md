# Prediction Market Implementation Plan

## Inspection Summary

### Phoenix player app
- Shared shell, auth state, wallet balance, account, transaction history, and websocket plumbing already exist in `phoenix-frontend-brand-viegg/packages/app-core`.
- Current player product identity is sportsbook-first. Native sportsbook routing now lives under `/sports/*` and is rendered through the redesign shell.
- The existing Prediction entry point is the header `ModeToggle`, but it is only local UI state plus a runtime feature flag and does not change routes or module context.
- Account activity and transaction history are shared surfaces today, but their contracts are sportsbook-oriented and do not include an explicit product dimension.
- Runtime config already supports feature gating and multi-surface integration modes, so Prediction can be enabled cleanly through the same configuration path.

### Talon back office
- Talon has a shared admin shell, role-based menu gating, and shared user/account/wallet/audit/reporting foundations.
- Talon is operationally sportsbook-first: the main trading model is fixtures, markets, fixed exotics, provider ops, and sportsbook wallet categories.
- User activity and wallet history are exposed through shared admin paths, but the displayed transaction model does not currently distinguish product identity.
- Talon is the correct place to stay shared, but it needs product-aware navigation, filtering, and labels rather than a second admin app.

### Phoenix backend
- Prediction scaffolding already exists under `phoenix.prediction` with markets, orders, settlement, config, and bot auth foundations.
- Prediction is not yet exposed as a real player/admin product: `PhoenixRestRoutes` currently mounts only sportsbook routes plus prediction bot auth endpoints.
- Wallet transaction and reporting models are shared underneath, but transaction reason/category is still sportsbook/payment oriented with no explicit product field.

## Shared vs Separate Decisions

### Shared
- session/auth
- account identity
- wallet balance infrastructure
- wallet transaction plumbing
- common shell primitives
- websocket/auth lifecycle
- Talon shell and role model
- config/feature-flag path

### Separate
- player module routes
- player module navigation identity
- player module home/landing UX
- prediction market browsing and detail experience
- prediction market state/query keys
- Talon product-aware filtering and labels
- product dimension on account activity / transaction visibility

## Execution Plan

### Phase 1: wire real module identity
1. Introduce a first-class player product context with `sportsbook` and `prediction`.
2. Replace the current `ModeToggle` placeholder behavior with route-driven module switching.
3. Add Prediction routes under `/prediction/*` and keep Sportsbook under `/sports/*`.
4. Normalize duplicate runtime sport aliases so `Esports` remains canonical and redundant `aSports` does not appear.

### Phase 2: build Prediction player module
1. Create a dedicated Prediction module shell using shared auth/account/wallet chrome.
2. Build Prediction landing, featured markets, category exploration, all-markets listing, and market detail flow.
3. Keep the UX distinct from Sportsbook and aligned with the Pariflow benchmark: card-led discovery, featured/live emphasis, category-led browsing, and a prediction-native interaction model.
4. Reuse shared API and common UI primitives only where it does not force sportsbook semantics into Prediction.

### Phase 3: shared account and wallet distinctions
1. Add product identity to player activity models at the frontend contract layer.
2. Extend wallet/activity presentation so sportsbook and prediction activity are labeled and filterable.
3. Add the same distinction to Talon user wallet/activity views.
4. If backend contracts do not supply product identity yet, add the field through Phoenix backend transaction/view models.

### Phase 4: Talon product awareness
1. Add product-aware filters and labels to user activity, wallet history, and audit links.
2. Add Prediction operational entry points under Talon without forking the admin shell.
3. Keep shared user/account/wallet views unified, but clearly distinguish sportsbook vs prediction activity.
4. Leave sportsbook trading flows intact and add prediction-specific admin surfaces alongside them where needed.

### Phase 5: backend exposure
1. Add the first public/admin-facing Prediction endpoints on top of existing `phoenix.prediction` scaffolding.
2. Expose prediction market listing/detail data needed by the player module.
3. Extend backoffice-facing/admin-facing data contracts where Prediction needs explicit lifecycle visibility.
4. Preserve existing sportsbook APIs and avoid broad premature generalization.

## Immediate Build Order
1. Route-driven module toggle + product context
2. Prediction landing and browse routes
3. Prediction market data contracts/BFF layer
4. Shared transaction product labeling
5. Talon user activity and product filter updates
6. Prediction admin navigation/foundation

## Risks
- Backend prediction scaffolding exists, but public/admin APIs are incomplete; some endpoint work is required.
- Wallet and reporting models currently collapse activity into sportsbook/payment semantics; product identity has to be threaded through carefully.
- Talon menu and audit/reporting surfaces assume sportsbook trading nouns today, so product-aware refactoring must stay targeted.

## Status Update

Date: 2026-03-07

### Completed
1. Prediction is now a real peer player module under `/prediction/*` instead of a disabled shell toggle.
2. The existing Phoenix mode toggle now switches routes between Sportsbook and Prediction using first-class product routing.
3. Sportsbook runtime alias handling now normalizes `aSports` into canonical `esports` so redundant tabs do not survive in player navigation.
4. A dedicated Prediction layout, landing flow, category browsing flow, all-markets flow, and market-detail flow were added in the player app.
5. Prediction ticket state is separated from the sportsbook betslip and has its own preview flow.
6. Shared account/wallet activity contracts were extended with product labeling on the Phoenix/Talon frontend and Phoenix backend wallet views.
7. Phoenix backend now exposes first prediction-market HTTP surfaces:
   - `/api/v1/prediction/overview`
   - `/api/v1/prediction/categories`
   - `/api/v1/prediction/markets`
   - `/api/v1/prediction/markets/:marketId`
   - `/api/v1/prediction/ticket/preview`
8. Talon now has an explicit Prediction operations entry under Risk Management and product-aware audit-log filtering/labels.
9. Phoenix frontend prediction API routes now proxy to Phoenix backend and only fall back to local seed data if the backend is unavailable.
10. Phoenix backend now exposes authenticated prediction order endpoints for active punters:
   - `GET /api/v1/prediction/orders`
   - `POST /api/v1/prediction/orders`
   - `POST /api/v1/prediction/orders/:orderId/cancel`
11. Phoenix prediction now has a dedicated `/prediction/activity` route so prediction orders live inside the module instead of being buried inside generic account flows.
12. Prediction trade rail no longer stops at a placeholder CTA; it now places orders through Phoenix backend and refreshes recent order activity in the rail.
13. Talon prediction ops now surfaces prediction order flow in addition to market summary/catalog/detail.
14. Talon mock admin routes now expose prediction orders for local development:
   - `/prediction/orders`
   - `/prediction/orders/:id`
15. Phoenix backend compile now passes after fixing the prior market Tapir schema derivation blocker.
16. Prediction order placement/cancellation now uses shared wallet reservation/finalization flows with prediction-native wallet transaction reasons.
17. Phoenix player transaction history now supports product filtering (`Sportsbook` / `Prediction`).
18. Talon punter wallet history and export now support product filtering and translated product labels.
19. Prediction wallet history now reuses the prediction order ID as the shared wallet bet reference for clearer traces.
20. Phoenix backend prediction markets and orders are now persisted through `SlickPredictionReadModelService` backed by the existing prediction tables instead of remaining HTTP-local in-memory state.
21. Talon prediction ops now includes lifecycle controls for suspend, reopen, cancel, and resolve against prediction markets.
22. Phoenix and Talon wallet/account history rows now surface prediction market/outcome context and settled winning-outcome context when available.
23. Phoenix backend now exposes prediction lifecycle history from persisted `ops_overrides` records.
24. Talon prediction ops now surfaces lifecycle history and adds explicit operator safeguards for destructive resolve/cancel actions.
25. Talon prediction lifecycle actions now emit prediction-product audit events in the local admin stack, and prediction ops can deep-link directly into scoped audit logs for a market/action trail.
26. Talon prediction ops now enforces read-only trader/admin separation at the container level: admin sessions can mutate lifecycle and open scoped audit logs, while non-admin sessions remain inspect-only with explicit operator messaging.
27. Talon user financial summary is now product-aware: Phoenix admin returns a sportsbook-vs-prediction exposure breakdown plus prediction order counts, and Talon surfaces that breakdown in the shared user-details summary instead of remaining sportsbook-only.
28. Phoenix backend prediction backoffice routes now match Talon’s trader/admin model:
   - `admin` or `trader` can read `/admin/prediction/*`
   - only `admin` can mutate lifecycle endpoints
29. JWT permissions now retain realm roles so prediction-ops authorization is enforced in the backend instead of only in Talon UI.
30. Shared backend test doubles now implement prediction wallet reservation/finalization methods, and the previously latent financial-summary compile issues uncovered during this pass were corrected.
31. Phoenix DGE daily reporting now threads prediction activity into the actual generated report definitions instead of leaving the reporting layer sportsbook-only:
   - `Patron Account Summary Report` now carries prediction transfer / cancellation / open exposure / win-loss columns
   - `Wagering Summary Report` now emits a dedicated `Prediction Markets` table alongside the sportsbook table
32. Prediction report aggregation is now derived from persisted prediction orders via `PredictionReadModelService`, so report output can distinguish sportsbook vs prediction activity beyond wallet history and audit surfaces.
33. The `dgen113 Result Summary` report now also carries a dedicated `Prediction Markets` table, so prediction is no longer absent from that report family when result-category totals are generated.
34. The `dgen113 Sports Liability` report now also carries a dedicated `Prediction Markets` table, so open prediction exposure is represented beside sportsbook open-bet liability instead of remaining invisible in that report family.
35. The `dgen113 Result Details` report now also carries a dedicated `Prediction Markets` table, so settled/cancelled/voided/resettled prediction-order revenue impacts are represented beside sportsbook result-detail rows.
36. Prediction wallet/account context now exposes `settlementReason`, and that descriptor is surfaced through player/admin transaction history plus wallet CSV export so prediction settlements are less opaque operationally.
37. The `dgen113 Cancelled` report now also carries a dedicated `Prediction Markets` table, so cancelled prediction orders with explicit cancellation reasons are represented beside sportsbook cancellation rows.
38. Prediction settlement execution now records the acting admin identifier when backoffice lifecycle flows settle/cancel open prediction orders, so persisted settlement context can distinguish operator-driven resolution from system defaults.
39. The `dgen113 Voids` report now also carries a dedicated `Prediction Markets` table, so voided prediction orders with market metadata, operator identity, and void reason are represented beside sportsbook void rows.
40. The `dgen113 Resettle` report now also carries a dedicated `Prediction Markets` table, so resettled prediction orders with prior-settlement snapshots are represented beside sportsbook resettlement rows.
41. Phoenix prediction backoffice now exposes a real admin-only `resettle` lifecycle action that refinalizes already-settled prediction orders through the shared wallet layer instead of leaving resettlement as a report-only concept.
42. Talon prediction ops now exposes that `resettle` action in the operator workflow only for resolved markets, with explicit outcome selection and confirmation behavior consistent with the existing resolve flow.
43. Shared prediction transaction/export descriptors now carry richer lifecycle context:
   - wallet CSV export includes prediction market status, order status, settlement actor, and previous settlement status
   - Phoenix player transaction history and Talon wallet history surface the same extra context
44. Phoenix player prediction activity now receives settlement-context fields directly from the backend order response, so the prediction module can display resolved outcome and lifecycle context without forcing users into wallet/admin views.
45. Phoenix player prediction activity filtering now recognizes a prediction-native `settled` bucket, so users can separate open trades from resolved/resettled orders without relying on sportsbook-style history views.
46. Prediction lifecycle audit writes now execute inside the Slick persistence transaction for suspend/open/cancel/resolve/resettle flows, and the command layer skips duplicate post-success audit writes when the persistence path declares transactional audit ownership.
47. Prediction audit access is now split from general prediction summary visibility:
   - `operator` can still view prediction oversight summaries
   - only `trader` or `admin` can open prediction audit pivots
   - only `trader` or `admin` can export prediction oversight data
48. Talon user-details prediction order flow now respects the same trader/admin order-flow policy as the backend instead of attempting unauthorized requests and failing with background `403`s.
49. Phoenix runtime wiring now constructs prediction query/history and prediction projection as separate adapters over the shared Slick persistence implementation, so the app no longer has to pass the broad combined prediction service through every composition boundary.
50. Phoenix REST/backoffice wiring now accepts those narrower prediction contracts directly for player routes, wallet history enrichment, reports, and admin routes, reducing the remaining surface area that depends on the legacy combined prediction type.
51. The underlying Slick prediction implementation is now split into explicit concrete query vs projection persistence classes:
   - `SlickPredictionQueryStore`
   - `SlickPredictionProjectionStore`
   - `SlickPredictionPersistenceStore` now remains only as a compatibility bridge for older call sites
52. Local Keycloak/bootstrap tooling is now production-hardening aware for prediction roles:
   - Bash 3-compatible user bootstrap no longer depends on `mapfile`
   - reruns now grant missing roles to already-existing users instead of skipping them forever
   - missing local realm roles (`trader`, `operator`) are created automatically before grant
   - fresh realm setup now creates `admin`, `trader`, and `operator` roles by default
53. Live local role validation now matches the intended Phoenix/Talon permission model:
   - `operator` can view prediction summary but is blocked from order flow, prediction-scoped audit pivots, and lifecycle mutations
   - `trader` can view order flow and prediction-scoped audit pivots, can `suspend` / `open`, and is blocked from settlement/destructive overrides
   - `admin` can view all prediction surfaces and execute `cancel` / `resolve` / `resettle`
54. A reusable live prediction staging gate now exists at `scripts/qa/prediction-staging-gate.sh` and covers:
   - role matrix
   - player order placement
   - wallet reservation and reconciliation
   - trader/admin lifecycle actions
   - double-cancel negative path
   - prediction audit filters
   - lifecycle-history visibility
55. Local prediction validation is now cleanly rerunnable:
   - `scripts/qa/reset-local-prediction-state.sh` clears prediction-only persistence plus prediction-scoped audit rows
   - `phoenix.prediction.tools.SyncPredictionSeedData` reseeds markets without requiring a full backend restart
   - `prediction-staging-gate.sh` supports `RESET_PREDICTION_STATE=1` and executes that reset automatically before validation
56. The active Slick persistence split is now complete at runtime:
   - `SlickPredictionProjectionStore` no longer depends on `SlickPredictionQueryStore` internals
   - Phoenix runtime wires explicit `SlickPredictionQueryPersistenceService` and `SlickPredictionProjectionPersistenceService`
   - dead compatibility wrappers for the old monolithic `SlickPredictionReadModelService` path were removed
57. A full clean local staging gate now passes from reset state:
   - report: `revival/201_PREDICTION_MARKET_STAGING_GATE.md`
   - artifact: `revival/artifacts/prediction_staging_gate_20260308_165255.md`
   - result: 40 checks passed, 0 failed
58. Prediction event/projection reconciliation is now live and validated:
   - replayable snapshot events are written transactionally for prediction markets, outcomes, orders, settlements, and ops overrides
   - `phoenix.prediction.tools.ReconcilePredictionProjection` now passes cleanly against the live projection tables
   - the previous reconciliation false negatives were removed by canonicalizing replay/live row comparisons for timestamp offsets and JSON payload shape

### Bounded Gaps Remaining
1. Prediction persistence is now read-model backed, transactionally audit-safe, split into separate concrete Slick query vs projection classes without cross-calling internals, and covered by a passing replay reconciliation check. The remaining architectural step, if pursued later, is a deeper bounded-context/projection/replay model rather than another local hardening requirement.
2. Talon prediction ops now has a clearer action split across summary, order flow, audit pivots, reversible state, destructive overrides, and settlement, but deeper operator policy beyond the current operator/trader/admin tiers is still pending.
3. Product-aware filtering is now surfaced in Talon audit logs, wallet history, punter transaction export, Phoenix player transaction history, Talon punter financial summary, prediction ops exports, and the DGE daily reporting summaries including the `dgen113 Result Summary` / `Sports Liability` / `Result Details` / `Cancelled` / `Voids` / `Resettle` families. Any remaining downstream sportsbook-only reporting/export surfaces should now be treated as targeted cleanup, not a missing core prediction capability.
4. Phoenix frontend still has unrelated legacy type debt outside this prediction workstream, so touched-file validation remains the meaningful safety bar rather than full monorepo type cleanliness.

### Latest Validation
1. Phoenix backend compile: pass.
2. Phoenix frontend targeted type validation:
   - prediction/product-routing/trade-rail touched files clean
   - transaction-history touched files clean after rebuilding `utils-core` exports
3. Talon targeted type validation:
   - prediction-ops touched files clean
   - punter wallet filter/export touched files clean
4. Phoenix `utils-core` package build: pass.
5. Talon office package type validation (`packages/office/tsconfig.json`): pass under Node 20.
6. Talon mock-server package-wide type validation now passes for the touched prediction/admin files when run with `--skipLibCheck`; the remaining non-skipLibCheck noise is still the pre-existing `@types/express-serve-static-core` incompatibility outside this work.
7. Talon audit-log regression tests:
   - `components/audit-logs/utils/__tests__/resolvers.test.ts`
   - `containers/audit-logs/utils/__tests__/scoped-copy-telemetry.test.ts`
   - result: pass
8. Live Phoenix frontend route checks:
   - `/prediction/` -> `200`
   - `/sports/home/` -> `200`
   - `/api/prediction/overview/` -> JSON response
   - `/api/prediction/markets/?status=live` -> JSON response
   - `/api/prediction/ticket/preview/` -> JSON response
   - lifecycle-history endpoint compiled and mounted under `/admin/prediction/markets/:marketId/lifecycle`
9. Latest local validation for the financial-summary/product-breakdown pass:
   - Talon office package type validation (`packages/office/tsconfig.json`): pass under Node 20
   - Talon shared utils package build (`packages/utils`): pass
   - the earlier transient sandbox dependency-resolution issue is no longer the blocking condition for the targeted prediction/admin validations in this branch
10. Latest local validation for the prediction-ops backend auth pass:
   - Phoenix backend targeted regression `phoenix.prediction.unit.PredictionBackofficeRoutesSpec`: pass
   - validated behavior:
     - missing token -> `401`
     - punter token -> `403 userMissingPredictionOpsRole`
     - trader token -> `200` on read routes
     - admin token -> `200` on read routes
     - trader token -> `403 userMissingAdminRole` on lifecycle mutation routes
11. Latest local validation for the reporting/product-dimension pass:
   - Phoenix backend targeted regressions:
     - `phoenix.reports.application.dataprovider.dge19.PatronAccountSummaryDataSpec`
     - `phoenix.reports.application.dataprovider.dge19.PredictionReportingSummaryProviderSpec`
     - `phoenix.reports.application.dataprovider.dge19.WageringSummarySportsDataSpec`
   - result: pass
12. Latest local validation for the `dgen113` result-summary extension:
   - Phoenix backend targeted regressions:
     - `phoenix.reports.application.dataprovider.dge19.PredictionReportingSummaryProviderSpec`
     - `phoenix.reports.application.dataprovider.dgen113.ResultSummaryDataSpec`
     - `phoenix.reports.application.dataprovider.dgen113.ResultSummaryPredictionDataSpec`
   - result: pass
13. Latest local validation for the `dgen113` sports-liability extension:
   - Phoenix backend targeted regressions:
     - `phoenix.reports.application.dataprovider.dgen113.SportsLiabilityDataSpec`
     - `phoenix.reports.application.dataprovider.dgen113.SportsLiabilityPredictionDataSpec`
     - `phoenix.reports.application.dataprovider.dgen113.ResultSummaryPredictionDataSpec`
   - result: pass
14. Latest local validation for the `dgen113` result-details extension:
   - Phoenix backend targeted regressions:
     - `phoenix.reports.application.dataprovider.dge19.PredictionReportingSummaryProviderSpec`
     - `phoenix.reports.application.dataprovider.dgen113.ResultDetailsPredictionDataSpec`
     - `phoenix.reports.application.dataprovider.dgen113.ResultSummaryPredictionDataSpec`
   - result: pass
15. Latest local validation for the prediction settlement-context enrichment:
   - Phoenix backend targeted regression:
     - `phoenix.reports.application.dataprovider.dge19.PredictionReportingSummaryProviderSpec`
   - Phoenix shared types build:
     - `phoenix-frontend-brand-viegg/packages/utils-core -> yarn dist`
   - Talon office package type validation:
     - `packages/office/tsconfig.json`
   - result: pass
16. Latest local validation for the `dgen113` cancelled-report extension:
   - Phoenix backend targeted regressions:
     - `phoenix.reports.application.dataprovider.dgen113.CancelledDataSpec`
     - `phoenix.reports.application.dataprovider.dgen113.CancelledPredictionDataSpec`
     - `phoenix.reports.application.dataprovider.dge19.PredictionReportingSummaryProviderSpec`
   - result: pass
17. Latest local validation for the prediction `Voids` / `Resettle` reporting extension:
   - Phoenix backend targeted regressions:
     - `phoenix.reports.application.dataprovider.dge19.PredictionReportingSummaryProviderSpec`
     - `phoenix.reports.application.dataprovider.dgen113.CancelledPredictionDataSpec`
     - `phoenix.reports.application.dataprovider.dgen113.ResultDetailsPredictionDataSpec`
     - `phoenix.reports.application.dataprovider.dgen113.ResultSummaryPredictionDataSpec`
     - `phoenix.reports.application.dataprovider.dgen113.SportsLiabilityPredictionDataSpec`
     - `phoenix.reports.application.dataprovider.dgen113.VoidsPredictionDataSpec`
     - `phoenix.reports.application.dataprovider.dgen113.ResettlePredictionDataSpec`
     - `phoenix.prediction.unit.PredictionBackofficeRoutesSpec`
   - result: pass
18. Latest local validation for the real prediction `resettle` lifecycle action:
   - Phoenix backend targeted regressions:
     - `phoenix.prediction.unit.PredictionBackofficeRoutesSpec`
     - `phoenix.reports.application.dataprovider.dgen113.ResettlePredictionDataSpec`
     - `phoenix.reports.application.dataprovider.dgen113.VoidsPredictionDataSpec`
   - Talon office package type validation:
     - `packages/office/tsconfig.json`
   - validated behavior:
     - `admin` can invoke `POST /admin/prediction/markets/{marketId}/lifecycle/resettle`
     - `trader` remains forbidden on the `resettle` mutation path
     - resolved markets can now be resettled through the shared wallet refinalization flow
   - result: pass
19. Latest local validation for the prediction descriptor/activity enrichment pass:
   - Phoenix backend targeted regressions:
     - `phoenix.prediction.unit.PredictionBackofficeRoutesSpec`
     - `phoenix.wallets.unit.WalletCsvFormatsSpec`
   - Phoenix shared types package build:
     - `phoenix-frontend-brand-viegg/packages/utils-core -> yarn run dist`
   - Talon office package type validation:
     - `packages/office/tsconfig.json`
   - result: targeted validation pass
20. Latest local validation for the prediction runtime/policy split pass:
   - Phoenix backend targeted regressions:
     - `phoenix.prediction.unit.PredictionBackofficeRoutesSpec`
     - `phoenix.auditlog.unit.AuditLogBackofficeRoutesSpec`
     - `phoenix.auditlog.unit.AuditLogJsonFormatsSpec`
   - Talon office package type validation:
     - `packages/office/tsconfig.json`
   - validated behavior:
     - prediction lifecycle coordination now depends on narrower persistence contracts
     - query/history reporting codepaths now depend on prediction query-side contracts only
     - `operator` remains allowed on prediction summary/market oversight routes and is blocked from order flow and prediction audit pivots
     - Talon prediction exports and user prediction-order views align with the same split
   - result: targeted validation pass
21. Phoenix backend compile after the Keycloak/bootstrap hardening and Slick query/projection split: pass.
22. Latest live local Phoenix validation against the running backend:
   - punter / operator / trader / admin login: pass
   - operator summary access: `200`
   - operator order flow / prediction audit pivots / lifecycle mutations: `403`
   - trader summary + order flow + prediction audit pivots: `200`
   - trader settlement/destructive lifecycle actions: `403`
   - trader `suspend` / `open`: `200`
   - admin `cancel` / `resolve` / `resettle`: `200`
   - punter place/cancel flow: pass
   - punter resolve/resettle order reconciliation: pass
   - wallet history prediction descriptors after resettle: pass
   - prediction audit filter response shape and filtered data: pass
23. Latest clean local staging-gate validation:
   - command: `RESET_PREDICTION_STATE=1 ./scripts/qa/prediction-staging-gate.sh`
   - report: `revival/201_PREDICTION_MARKET_STAGING_GATE.md`
   - artifact: `revival/artifacts/prediction_staging_gate_20260308_165255.md`
   - result: 41 checks passed, 0 failed
23. Local staging/bootstrap hardening validation:
   - `./dev/keycloak/sign_up_users.sh` now repairs roles for existing users instead of only creating missing users
   - live bootstrap successfully created/granted missing `trader` and `operator` realm roles in the local Keycloak realm
24. Reusable staging gate:
   - `scripts/qa/prediction-staging-gate.sh` added
   - script bug fixes completed for:
     - Bash function ordering
     - exclusion of pre-existing punter exposure from market selection
     - bounded polling for eventually consistent wallet/audit reads
   - note: a completely clean rerun now requires a fresh mutable local prediction-market data set because earlier live validation already resolved/cancelled multiple seed markets

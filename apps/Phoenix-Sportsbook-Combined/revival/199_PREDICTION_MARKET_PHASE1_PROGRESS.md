# Prediction Market Phase 1 Progress

Date: 2026-03-07

## Summary

This pass moved the platform from a sportsbook-only player/admin model to a code-backed dual-product foundation:
- Phoenix Sportsbook remains intact under `/sports/*`
- Prediction Market now exists as a real peer player module under `/prediction/*`
- Talon now contains explicit prediction operations surfaces instead of remaining sportsbook-only
- Phoenix backend now exposes prediction-market HTTP contracts instead of relying solely on frontend-local seed data

This follow-on pass deepened the Prediction module from browse-only into an operational product flow:
- Phoenix backend now exposes authenticated prediction order APIs for list/place/cancel
- Phoenix player app now has a dedicated Prediction activity route and no longer ends the trade flow at a placeholder CTA
- Talon prediction ops now includes prediction order visibility, not only market visibility
- Prediction order placement/cancellation now runs through shared wallet reservations instead of remaining detached UI-only state
- Phoenix account transaction history and Talon wallet history now expose product-aware filtering for Sportsbook vs Prediction

This pass closes the next operational gaps in that flow:
- Phoenix backend prediction markets and orders now persist through a Slick-backed read-model service over the existing prediction tables
- Talon prediction ops now includes suspend, reopen, cancel, and resolve lifecycle controls
- Phoenix and Talon wallet history rows now show prediction market/outcome context and winning outcome context when available
- Phoenix backend now exposes persisted lifecycle history from prediction `ops_overrides`
- Talon prediction ops now shows lifecycle history and requires explicit operator confirmation for destructive resolve/cancel actions
- Talon prediction ops now links directly into scoped prediction audit logs, and lifecycle actions emit prediction-product audit events in the local admin stack
- Talon prediction ops now runs in explicit read-only mode for non-admin sessions, with admin-only lifecycle mutations and admin-only filtered audit pivots

This pass closes the next reporting/admin gap after wallet history:
- Phoenix admin punter financial summary now returns sportsbook-vs-prediction exposure breakdown data
- Talon user-details financial summary now surfaces prediction open exposure and prediction order counts instead of remaining sportsbook-only

This pass closes the next backend/admin-policy gap:
- Phoenix backend prediction backoffice routes now enforce trader-or-admin access for read endpoints and retain admin-only access for lifecycle mutations
- JWT permissions now preserve realm roles so the backend can distinguish prediction-ops readers from general punters
- Backend test wallet doubles were updated for prediction wallet methods so prediction integrations no longer leave shared test scaffolding broken

This pass closes the next transactional-audit and operator-surface gap:
- prediction lifecycle audit writes now happen inside the Slick lifecycle mutation transaction instead of only after HTTP success
- command-side prediction lifecycle handling now skips duplicate audit writes when persistence owns transactional audit logging
- prediction audit pivots are now trader/admin only instead of being bundled with operator summary visibility
- Talon prediction exports and user-level prediction order flow now respect the tighter action split instead of attempting unauthorized flows

This pass closes the next composition-layer coupling gap:
- Phoenix runtime wiring now builds separate prediction query/history and prediction projection adapters over the shared Slick persistence implementation
- player routes, wallet history enrichment, reports, and backoffice routes now consume narrower prediction contracts instead of all depending on the broad combined prediction service
- the monolithic prediction persistence implementation still exists underneath, but the app composition layer is no longer forced to treat prediction as one undifferentiated dependency

This pass closes the next local-staging and persistence-boundary gap:
- the underlying Slick implementation is now split into explicit concrete query and projection stores instead of only being separated at the composition layer
- local Keycloak bootstrap is now idempotent for prediction roles, repairs existing users, and creates missing `trader` / `operator` realm roles automatically for local development
- live local validation now confirms the intended operator/trader/admin matrix against the running Phoenix backend
- a reusable `scripts/qa/prediction-staging-gate.sh` script now exists to exercise role policy, lifecycle actions, wallet reconciliation, audit filters, and lifecycle-history visibility against a live stack

This pass closes the remaining repeatability gap in that validation:
- `scripts/qa/reset-local-prediction-state.sh` now clears prediction-only persistence and prediction-scoped audit rows, then reseeds markets through `phoenix.prediction.tools.SyncPredictionSeedData`
- the staging gate can now run from clean state with `RESET_PREDICTION_STATE=1`
- the old monolithic compatibility adapters around `SlickPredictionReadModelService` were removed after the explicit query/projection runtime split was proven in live validation
- the clean local staging gate now passes end to end with zero failures and a saved artifact in `revival/artifacts/prediction_staging_gate_20260308_165255.md`

This pass closes the next reconciliation gap behind that runtime split:
- prediction projection reconciliation now compares canonicalized live-vs-replayed state instead of failing on `OffsetDateTime` offset formatting differences
- replayable prediction projection snapshots now verify cleanly against the live prediction tables after a destructive reset/reseed
- the clean local staging gate now passes end to end with prediction projection reconciliation enabled and a saved artifact in `revival/artifacts/prediction_staging_gate_20260308_165255.md`

## What Was Inspected

### Phoenix player app
- Shared shell, auth, wallet, account, transaction history, and routing primitives in `phoenix-frontend-brand-viegg/packages/app-core`
- Existing disabled Prediction nav/toggle behavior in the header mode toggle and redesigned sportsbook shell
- Existing sportsbook route structure under `/sports/*`
- Shared state slices and transaction-history rendering for product-aware labeling

### Phoenix backend
- `phoenix.prediction` scaffolding already existed for markets, orders, settlement, and bot auth
- No public player/admin prediction routes were mounted
- Wallet transaction views already existed and were previously extended with product labeling
- Several wallet-event projections and reporting handlers were still sportsbook-only and had to be made prediction-aware under `-Werror`

### Talon
- Shared admin shell and role-gated risk-management area already existed
- Wallet history already had a Product column foundation
- Audit logs and menu structure remained sportsbook-first and did not expose prediction-specific operations

## What Was Reused

1. Shared Phoenix shell/auth/account/wallet primitives
2. Existing player-facing module toggle surface in the header
3. Existing sportsbook redesign shell and route-variant handling
4. Existing Talon shell, permissions, risk-management navigation, and API-hook patterns
5. Existing Phoenix `phoenix.prediction` namespace as the backend integration seam
6. Existing shared wallet reservation/finalization model instead of introducing a second balance-reservation path for prediction
7. Existing prediction persistence schema (`prediction_markets`, `prediction_outcomes`, `prediction_orders`, `prediction_settlements`, `ops_overrides`) as the storage seam for persisted read models

## What Was Refactored

1. Route-driven product identity now determines whether the player app is in `sportsbook` or `prediction`
2. Sports alias normalization now canonicalizes `aSports` to `esports` so duplicate sports tabs do not survive in the player UX
3. Phoenix prediction API routes in Next.js now proxy to Phoenix backend first and only use local fallback data when the backend is unreachable
4. Talon audit-log filters and product rendering now distinguish sportsbook vs prediction activity
5. Phoenix and backoffice wallet transaction views now enrich prediction transactions through a shared prediction-history lookup instead of treating all bet activity as sportsbook-only
6. Talon prediction ops now reads lifecycle history from a dedicated prediction market lifecycle endpoint instead of inferring history from current market state

## What Was Built New

### Phoenix frontend
1. Prediction layout and prediction route tree under `/prediction/*`
2. Prediction landing, featured/live discovery, category browsing, all-markets browse, and market-detail experience
3. Prediction trade rail with separate prediction ticket state and preview flow
4. Product-routing utilities for module-aware navigation
5. Backend proxy helper for prediction APIs
6. Prediction activity route under `/prediction/activity`
7. Prediction trade rail placement flow against Phoenix backend order endpoints
8. Prediction module navigation updated to include module-native activity instead of forcing users back into generic account routes

### Phoenix backend
1. Backend-native prediction catalog contract under `phoenix.prediction.infrastructure.http`
2. Public player endpoints:
   - `/api/v1/prediction/overview`
   - `/api/v1/prediction/categories`
   - `/api/v1/prediction/markets`
   - `/api/v1/prediction/markets/:marketId`
   - `/api/v1/prediction/ticket/preview`
3. Backoffice prediction endpoints:
   - `/admin/prediction/summary`
   - `/admin/prediction/markets`
   - `/admin/prediction/markets/:marketId`
4. Authenticated player prediction order endpoints:
   - `/api/v1/prediction/orders`
   - `/api/v1/prediction/orders/:orderId/cancel`
5. Backoffice/admin prediction order endpoints:
   - `/admin/prediction/orders`
   - `/admin/prediction/orders/:orderId`
6. Shared-wallet prediction execution path:
   - prediction order placement now reserves wallet funds with prediction-native transaction reasons
   - prediction order cancellation now finalizes the reservation with a prediction cancellation outcome
   - prediction wallet/balance history now reuses the prediction order ID as the wallet bet reference for clearer player/admin traces
7. Product-aware wallet transaction query filtering for both player and backoffice transaction history endpoints
8. Slick-backed prediction read-model service that:
   - syncs seeded prediction market data into persisted prediction tables
   - persists player prediction orders
   - resolves/cancels prediction markets and orders against stored state
   - exposes prediction order context for wallet/account history enrichment
9. Backoffice lifecycle-history endpoint:
   - `/admin/prediction/markets/:marketId/lifecycle`
10. Backend-enforced prediction ops access policy:
   - read endpoints under `/admin/prediction/*` now allow `admin` or `trader`
   - lifecycle mutation endpoints remain `admin` only
11. JWT permissions now retain realm roles so backoffice role policy is enforced by the backend, not only Talon UI
12. Shared wallet test doubles now implement prediction reservation/finalization methods so test compile remains aligned with the expanded wallet interface

### Talon
1. New Risk Management menu entry: `Prediction ops`
2. New prediction operations page and detail route
3. Product-aware audit-log product column and product filter
4. Mock-server prediction endpoints for local Talon development
5. Prediction order table inside the Prediction ops surface
6. Product-aware wallet filters/export path in user account history
7. Prediction lifecycle controls in ops:
   - suspend
   - reopen
   - cancel
   - resolve
8. Lifecycle-history panel in prediction market detail
9. Destructive-action safeguards in the prediction lifecycle modal:
   - current open-order impact preview
   - required operator reason
   - typed confirmation for `resolve` / `cancel`
10. Prediction audit hardening in ops:
   - scoped `Audit` deep-link from market rows and detail view
   - recent audit trail list inside prediction market detail
   - mock admin audit stream now records suspend/reopen/cancel/resolve actions with product=`prediction`
11. Prediction operator guardrails in ops:
   - non-admin sessions see an explicit read-only warning
   - lifecycle buttons are disabled outside admin sessions
   - filtered audit-log pivots are admin-only to match the `/logs` page access model
12. Prediction ops regression coverage:
   - added `containers/prediction-ops/__tests__/prediction-ops.test.tsx`
   - covers read-only warning + disabled lifecycle/audit actions for non-admin sessions at the component level
13. Product-aware punter financial summary:
   - Phoenix admin `GET /admin/punters/:id/financial-summary` now returns `productBreakdown`
   - sportsbook open exposure is split from prediction open exposure
   - prediction order counts now include open / settled / cancelled totals for the punter
14. Talon user-details financial summary now renders:
   - sportsbook open exposure
   - prediction open exposure
   - prediction open order count
   - prediction settled order count
   - prediction cancelled order count

### Phoenix account history
1. Product filter added to player transaction history
2. Transaction-history product labels now render human-readable `Sportsbook` / `Prediction`
3. Prediction transactions now display market title, selected outcome, and winning outcome when available

### Talon account history
1. Prediction wallet rows now display market title, selected outcome, and winning outcome when available

## Validation

1. Phoenix backend compile: passes
2. Phoenix `utils-core` build: passes
3. Phoenix frontend touched-file targeted type validation: clean for:
   - `components/pages/transaction-history/index.tsx`
   - `components/transaction-history-list/index.tsx`
4. Talon office package type validation (`packages/office/tsconfig.json`): passes under Node 20
5. Talon touched-file targeted type validation: clean for:
   - `containers/prediction-ops/index.tsx`
   - `containers/prediction-ops/contracts.ts`
   - `containers/users/wallet/index.tsx`
   - `components/users/wallet/index.tsx`
   - `components/users/wallet/utils/resolvers.ts`
   - `components/users/wallet/export/index.tsx`
6. Talon audit-log regression tests: pass
7. Talon mock-server package-wide `tsc --skipLibCheck` passes for the touched prediction/admin mock-server files
8. Talon office prediction ops detail now has a scoped audit pivot path via `/logs?product=prediction&targetId=<marketId>`
9. Talon prediction ops role-guard hardening compiles clean under `packages/office/tsconfig.json`
10. Live Phoenix frontend route/API checks: previously clean for `/prediction/`, `/sports/home/`, `/api/prediction/overview/`, `/api/prediction/markets/?status=live`, `/api/prediction/ticket/preview/`
11. Phoenix frontend monorepo-wide `tsc` remains noisy from unrelated legacy test/type debt outside the touched files
12. Targeted package-local Jest execution for the new `prediction-ops.test.tsx` remains flaky in this environment; the touched test file was validated through the package `tsc` path instead
13. Talon shared utils package build (`packages/utils`): pass
14. Talon office package type validation (`packages/office/tsconfig.json`): pass after the financial-summary product-breakdown update
15. Fresh Phoenix backend sbt validation for this pass is blocked in the current sandbox because `phoenix-ingestion-oddin-lib` cannot resolve `com.oddin.oddsfeed:odds-feed:0.0.27` without outbound network access
16. Phoenix backend targeted regression:
   - `phoenix.prediction.unit.PredictionBackofficeRoutesSpec`
   - result: pass
17. During that regression run, latent compile regressions from prior prediction financial-summary work were fixed:
   - `PunterBackofficeRoutes` financial-summary construction/imports
   - prediction financial-summary helper visibility/default-method warnings
   - punter financial-summary Circe codecs
   - `WalletsBoundedContextMock` prediction wallet methods
18. Phoenix backend targeted DGE/reporting regressions:
   - `phoenix.reports.application.dataprovider.dge19.PatronAccountSummaryDataSpec`
   - `phoenix.reports.application.dataprovider.dge19.PredictionReportingSummaryProviderSpec`
   - `phoenix.reports.application.dataprovider.dge19.WageringSummarySportsDataSpec`
   - result: pass
19. Phoenix backend targeted `dgen113` result-summary regressions:
   - `phoenix.reports.application.dataprovider.dge19.PredictionReportingSummaryProviderSpec`
   - `phoenix.reports.application.dataprovider.dgen113.ResultSummaryDataSpec`
   - `phoenix.reports.application.dataprovider.dgen113.ResultSummaryPredictionDataSpec`
   - result: pass
20. Phoenix backend targeted `dgen113` sports-liability regressions:
   - `phoenix.reports.application.dataprovider.dgen113.SportsLiabilityDataSpec`
   - `phoenix.reports.application.dataprovider.dgen113.SportsLiabilityPredictionDataSpec`
   - `phoenix.reports.application.dataprovider.dgen113.ResultSummaryPredictionDataSpec`
   - result: pass
21. Phoenix backend targeted `dgen113` result-details regressions:
   - `phoenix.reports.application.dataprovider.dge19.PredictionReportingSummaryProviderSpec`
   - `phoenix.reports.application.dataprovider.dgen113.ResultDetailsPredictionDataSpec`
   - `phoenix.reports.application.dataprovider.dgen113.ResultSummaryPredictionDataSpec`
   - result: pass
22. Prediction settlement-context enrichment validation:
   - Phoenix backend targeted regression:
     - `phoenix.reports.application.dataprovider.dge19.PredictionReportingSummaryProviderSpec`
   - Phoenix shared types package build:
     - `phoenix-frontend-brand-viegg/packages/utils-core -> yarn dist`
   - Talon office package type validation:
     - `packages/office/tsconfig.json`
   - result: pass
23. Phoenix backend targeted `dgen113` cancelled-report regressions:
   - `phoenix.reports.application.dataprovider.dgen113.CancelledDataSpec`
   - `phoenix.reports.application.dataprovider.dgen113.CancelledPredictionDataSpec`
   - `phoenix.reports.application.dataprovider.dge19.PredictionReportingSummaryProviderSpec`
   - result: pass
24. Phoenix backend targeted transactional-audit / policy regressions:
   - `phoenix.prediction.unit.PredictionBackofficeRoutesSpec`
   - `phoenix.auditlog.unit.AuditLogBackofficeRoutesSpec`
   - `phoenix.auditlog.unit.AuditLogJsonFormatsSpec`
   - result: pass
25. Talon office package type validation after the tighter audit/export/order-flow policy split:
   - `packages/office/tsconfig.json`
26. Phoenix backend compile after removing the dead compatibility wrappers and adding the prediction reseed entrypoint:
   - `phoenix-backend/compile`
   - result: pass
27. Clean local staging-gate validation from reset state:
   - `RESET_PREDICTION_STATE=1 ./scripts/qa/prediction-staging-gate.sh`
   - report: `revival/201_PREDICTION_MARKET_STAGING_GATE.md`
   - artifact: `revival/artifacts/prediction_staging_gate_20260308_165255.md`
   - result: 40 checks passed, 0 failed
26. Phoenix backend focused composition regression after splitting prediction query/history vs projection wiring:
   - `phoenix.prediction.unit.PredictionBackofficeRoutesSpec`
   - `phoenix.auditlog.unit.AuditLogBackofficeRoutesSpec`
   - result: pass

## Latest Increment

1. Prediction lifecycle audit writes now execute inside the same Slick transaction as market-state mutation for suspend/open/cancel/resolve/resettle flows.
2. The command layer now honors `PredictionLifecycleAuditSupport` and skips post-success audit writes when the persistence path already wrote the lifecycle audit entry transactionally.
3. Focused backend regression coverage now proves that transactional prediction lifecycle persistence does not emit duplicate audit rows.
4. Prediction audit visibility is now a narrower permission than prediction summary visibility:
   - operator sessions can still view prediction summary/oversight
   - only trader/admin sessions can open prediction audit pivots
5. Talon prediction exports now follow the tighter action split:
   - operator sessions cannot export prediction oversight CSVs
   - trader/admin sessions retain export access
6. Talon user-details prediction order flow now follows the same trader/admin backend policy instead of attempting unauthorized `admin/prediction/orders` requests in the background.
7. Phoenix application wiring now constructs:
   - a prediction query/history adapter
   - a prediction projection adapter
   over the shared Slick implementation, and passes them separately through reports, REST routes, wallet-history enrichment, and prediction admin/player routes.
8. That composition split keeps the current behavior intact while reducing the number of app boundaries that still depend on the broad combined prediction service type.
9. Talon user-details prediction order flow now surfaces market status, winning outcome, and settled-at context directly in the shared admin table instead of reserving that detail for CSV export only.
8. The `dgen113 Result Details` report family is now prediction-aware:
   - sportsbook result-detail rows remain intact
   - a dedicated `Prediction Markets` table is emitted beside the sportsbook table
   - prediction rows now show order-level revenue impact for won/lost/cancelled/voided/resettled outcomes without pretending those rows are sportsbook bets
9. Prediction transaction context is now richer across shared wallet surfaces:
   - backend `PredictionOrderContextView` now includes `settlementReason`
   - Phoenix player transaction history renders that reason when present
   - Talon user wallet history renders that reason when present
   - wallet CSV export now emits the same reason in the prediction payment-method descriptor
10. The `dgen113 Cancelled` report family is now prediction-aware:
   - sportsbook cancellation rows remain intact
   - a dedicated `Prediction Markets` table is emitted beside the sportsbook table
   - prediction rows now carry cancellation reason, market metadata, and cancelled order stake without pretending those rows are sportsbook bets
11. Backoffice-driven prediction settlement now preserves the acting admin identifier when open orders are settled/cancelled through lifecycle operations, so persisted prediction context is no longer forced to treat those outcomes as anonymous system actions.
12. The `dgen113 Voids` report family is now prediction-aware:
   - sportsbook void rows remain intact
   - a dedicated `Prediction Markets` table is emitted beside the sportsbook table
   - prediction rows now carry market metadata, selected position, operator identifier, and explicit void reason for voided orders
13. The `dgen113 Resettle` report family is now prediction-aware:
   - sportsbook resettlement rows remain intact
   - a dedicated `Prediction Markets` table is emitted beside the sportsbook table
   - prediction rows now use prior-settlement snapshots plus current settlement context to show initial settlement, resettlement time, resettled amount, and net adjustment without pretending prediction orders are sportsbook bets
14. Prediction lifecycle operations now include a real admin-only `resettle` action:
   - Phoenix backoffice exposes `POST /admin/prediction/markets/:marketId/lifecycle/resettle`
   - the action refinalizes already-settled prediction orders through the shared wallet flow instead of faking a UI-only state change
   - Talon prediction ops exposes `resettle` only for resolved markets and requires explicit outcome selection before execution
15. Prediction lifecycle context is now visible in more than admin/reporting surfaces:
   - backend prediction order responses now include market status, winning outcome, settlement reason, settlement actor, and previous settlement status when available
   - Phoenix player prediction activity surfaces that context inside `/prediction/activity`
   - wallet CSV export, Phoenix transaction history, and Talon wallet history now expose the same richer descriptor set
16. Prediction activity now supports a prediction-native `Settled` filter:
   - backend order-list filtering recognizes `status=settled` as the settled prediction lifecycle bucket (`won` / `lost` / `voided` / `pushed` / `resettled`)
   - Phoenix `/prediction/activity` now exposes `All` / `Open` / `Settled` / `Cancelled` instead of forcing users to infer settlement state from a flat list
17. Prediction backoffice lifecycle orchestration is no longer route-owned:
   - `PredictionBackofficeRoutes` now delegates lifecycle execution through `phoenix.prediction.application.PredictionLifecycleCoordinator`
   - route responsibilities are reduced to auth, request/response mapping, and HTTP error translation
   - wallet finalization / refinalization sequencing now lives behind an application-layer boundary instead of being duplicated inside the HTTP layer
18. Prediction permissions are now explicit in the backend auth model:
   - `canViewPredictionOps`
   - `canManagePredictionMarketState`
   - `canManagePredictionSettlement`
   - Tapir auth directives now distinguish prediction read, prediction state management, and prediction settlement access instead of relying on a mixed combination of generic admin endpoints and partial route-level assumptions
19. Talon prediction ops remains aligned with the backend permission split:
   - traders can inspect prediction ops and manage reversible market-state transitions (`suspend` / `open`)
   - admins retain settlement/destructive controls (`cancel` / `resolve` / `resettle`)
   - the same Talon package validation pass also covers the shared risk-management summary page, which now includes a prediction oversight card fed from `admin/prediction/summary`
20. Product-aware reporting/admin surfacing continued beyond the DGE report families:
   - Talon risk management summary now includes prediction market counts, order counts, and total prediction volume
   - the summary card deep-links operators into `/risk-management/prediction`, keeping prediction operations visible as a peer product instead of a sportsbook-only afterthought
21. Prediction persistence/application boundaries are narrower than before even though persistence is still backed by Slick:
   - prediction query reads now sit behind `PredictionQueryService`
   - command/projection persistence now sits behind `PredictionProjectionService`
   - `PredictionPlayerOrdersService` and `PredictionLifecycleCoordinator` no longer depend on the broad combined read-model trait for both query and mutation concerns
   - route constructors remain backward-safe by falling back to the combined service when a dedicated projection dependency is not provided
22. Prediction operator policy is now finer-grained in both backend and Talon:
   - backend auth now separates market-oversight reads from punter order-flow reads
   - `operator` can still inspect prediction summary, market catalog, detail, and lifecycle history
   - `operator` is now forbidden on prediction order-flow endpoints
   - `trader` / `admin` retain order-flow visibility, state transitions, and the existing settlement split
23. Product-aware prediction exports now exist on the shared Talon ops surface, not only on user detail:
   - the prediction market catalog card now exports a `Prediction Market Catalog.csv`
   - the prediction order-flow card now exports a `Prediction Order Flow.csv`
   - order-flow export is gated to the same trader/admin tier that can read order flow
   - market catalog export remains available to the read-only operator oversight tier
24. Prediction lifecycle actions now emit backend-native audit entries:
   - successful `suspend` / `open` / `cancel` / `resolve` / `resettle` mutations now write a dedicated prediction lifecycle audit entry through Phoenix backend audit logging
   - those entries carry `action`, `product`, `actorId`, `targetId`, `details`, `occurredAt`, and before/after market snapshots instead of relying only on Talon mock-layer audit artifacts
   - the backend audit model and JSON codecs now round-trip those lifecycle entries explicitly
25. Talon audit-log rendering now handles the richer prediction audit shape:
   - prediction lifecycle entries now render reason text plus before/after diffs in the audit log table instead of collapsing to a blank details cell
   - `prediction.market.resettled` now has an explicit audit-log label instead of falling through to `Unknown`
26. Prediction mutation boundaries are narrower than the earlier combined Slick path:
   - prediction lifecycle coordination now depends on:
     - `PredictionOrderSettlementPersistenceService`
     - `PredictionMarketLifecyclePersistenceService`
   - player prediction order placement/cancellation now depends on `PredictionOrderPersistenceService`
   - this still runs on the existing Slick-backed persistence implementation, but the application layer no longer needs the full combined read-model surface just to execute command-side work
27. Prediction-scoped audit pivots are now backend-native instead of only a Talon UI assumption:
   - Phoenix `/admin/audit-logs` now supports `action`, `actorId`, `targetId`, `product`, `sortBy`, and `sortDir`
   - prediction-scoped queries (`product=prediction`) are now readable by prediction-ops roles, including `operator`
   - non-prediction audit views remain admin-only, so widening prediction audit visibility does not widen the rest of the backoffice audit surface
28. The shared Talon prediction/risk audit pivots are now aligned with Phoenix backend behavior:
   - existing prediction ops and risk-management summary deep-links no longer rely on mock-only filter semantics
   - filtered audit pivots for prediction lifecycle entries now work against the real Phoenix backoffice contract
29. Prediction report generation is now query-side only:
   - `ReportsModule`, `DGEDailyReportsExecutor`, and the prediction DGE data providers now depend on `PredictionQueryService` instead of the combined `PredictionReadModelService`
   - prediction reporting is now explicitly read-side code, which keeps report generation out of the mutation/persistence boundary and moves the prediction module closer to a cleaner CQRS split
30. The targeted backend validation baseline for prediction hardening is broader than before:
   - prediction route policy
   - backend-native prediction audit filters and prediction audit-role access
   - prediction-aware `dgen113` cancelled / resettle / sports-liability / voids providers
   - prediction-aware `dge19` reporting summarization
   - all of those now pass together in one focused backend run
31. Phoenix runtime composition now constructs dedicated Slick-backed prediction query and projection gateways:
   - `SlickPredictionQueryGateway`
   - `SlickPredictionProjectionGateway`
   - a small `ComposedPredictionReadModelService` now exists only to bridge older route/module boundaries that still require the broad `PredictionReadModelService` contract
32. Prediction settlement context is now carried through more of the operational surface area:
   - Talon prediction order exports now include `previous settled at` and `previous settled amount`
   - Talon mock prediction order payloads now include that same resettlement context so local office flows exercise it
   - Phoenix player prediction activity now surfaces previous settlement timestamp and previous settled amount instead of dropping that history on the floor
   - Talon prediction ops and per-user prediction order tables now show settlement/re-settlement context on screen instead of forcing operators to export CSVs for that detail
33. The latest focused validation still passes after the gateway/runtime split:
   - Phoenix backend:
     - `phoenix.prediction.unit.PredictionBackofficeRoutesSpec`
     - `phoenix.auditlog.unit.AuditLogBackofficeRoutesSpec`
   - Talon office:
     - `packages/office/tsconfig.json`
   - result: pass
34. A dedicated staging release checklist now exists for prediction-market promotion:
   - covers player routing, lifecycle mutations, resettlement, wallet reconciliation, Talon role behavior, audit verification, CSV/report output, and release-gate signoff
   - file:
     - `revival/200_PREDICTION_MARKET_STAGING_VALIDATION_CHECKLIST.md`
35. The local Keycloak bootstrap is now role-repair capable instead of creation-only:
   - reruns grant missing roles to existing users
   - missing local `trader` / `operator` realm roles are created automatically before grant
   - fresh realm setup now creates `admin`, `trader`, and `operator` roles together
36. The underlying Slick prediction implementation is now explicitly split into:
   - `SlickPredictionQueryStore`
   - `SlickPredictionProjectionStore`
   - `SlickPredictionPersistenceStore` retained only as a compatibility bridge
37. Live local role and lifecycle validation now passes against the running Phoenix backend:
   - `operator` can read prediction summary and is blocked from order flow, prediction audit pivots, and lifecycle mutations
   - `trader` can read order flow and prediction-scoped audit pivots, can `suspend` / `open`, and is blocked from settlement/destructive actions
   - `admin` can `cancel` / `resolve` / `resettle`
   - punter placement, cancellation, resolve/resettle reconciliation, wallet descriptors, and filtered prediction audit responses all passed live
38. A reusable live validation script now exists:
   - `scripts/qa/prediction-staging-gate.sh`
   - it validates the role matrix, player order flow, wallet reservation/reconciliation, lifecycle history, audit filters, and the double-cancel negative path
   - it now includes bounded polling for eventually consistent wallet/audit reads

## Remaining Issues

1. Prediction persistence now uses separate concrete Slick query and projection stores, and the projection path now has a clean replay verification pass. The remaining architectural step, if pursued later, is a deeper bounded-context/projection/replay model rather than more local hardening.
2. Talon prediction ops now has a real operator-vs-order-flow split and backend-native prediction audit pivots, but policy is still coarse inside the trader/admin tiers
3. Any downstream reporting/export surfaces outside the active Phoenix/Talon prediction operational flows should be treated as targeted cleanup if they still assume sportsbook-only activity
4. The wider Phoenix frontend still has legacy type debt outside this prediction workstream; touched files and shared type packages were validated, but the full repo is not globally type-clean

## Recommended Next Steps

1. If you want a higher architecture bar later, move from the current Slick-backed replay journal to a fuller bounded-context/projection/reconciliation model
2. Extend Talon with richer operator review context and stronger role/policy guardrails beyond the current trader/admin split
3. Audit any remaining Phoenix/Talon reporting or export surfaces outside the active prediction ops/accounting flows for sportsbook-only assumptions
4. Use `scripts/qa/prediction-staging-gate.sh` plus the latest artifact as the release/UAT gate

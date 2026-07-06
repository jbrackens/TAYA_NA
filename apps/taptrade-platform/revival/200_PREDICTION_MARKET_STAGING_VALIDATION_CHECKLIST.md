# Prediction Market Staging Validation Checklist

## Goal

Validate the integrated Phoenix Prediction Market module, shared wallet flows, and Talon prediction operations before any production promotion.

This checklist is intentionally operational, not aspirational. Every line item should be executed against a live staging environment with Phoenix player traffic, Phoenix backend APIs, and Talon backoffice connected to the same data set.

## Environment Preconditions

1. Phoenix player app is reachable and authenticated against the staging identity provider.
2. Phoenix backend prediction endpoints are reachable from both player and Talon surfaces.
3. Talon backoffice is pointed at the same Phoenix backend environment.
4. Shared wallet and transaction history are enabled.
5. Prediction seed data or staging fixtures are loaded.
6. Test accounts exist for these roles:
   - `punter`
   - `operator`
   - `trader`
   - `admin`
7. Audit log persistence is enabled in the staging database.
8. Reporting jobs can be triggered manually or inspected after execution.

## Sign-Off Owners

- Product owner:
- Backend owner:
- Frontend owner:
- Talon ops owner:
- QA owner:
- Date:

## Local Execution Status (2026-03-08)

Validated live against the running local Phoenix backend:
- `punter`, `operator`, `trader`, and `admin` logins all succeeded
- operator role matrix passed:
  - summary `200`
  - order flow `403`
  - prediction-scoped audit pivots `403`
  - lifecycle mutations `403`
- trader role matrix passed:
  - summary `200`
  - order flow `200`
  - prediction-scoped audit pivots `200`
  - `suspend` / `open` `200`
  - settlement/destructive actions `403`
- admin lifecycle matrix passed:
  - `cancel` / `resolve` / `resettle` `200`
- punter order lifecycle passed:
  - place
  - cancel
  - resolve
  - resettle
  - wallet reconciliation after resettle
  - prediction transaction descriptors with previous settlement context
- prediction lifecycle-history endpoint and filtered prediction audit responses both returned expected live data

Local bootstrap hardening completed:
- `./dev/keycloak/sign_up_users.sh` is now Bash 3-compatible
- reruns repair missing roles on existing users instead of skipping them
- missing local `trader` / `operator` realm roles are created automatically before grant

Reusable automation added:
- `scripts/qa/prediction-staging-gate.sh`
- covers role policy, lifecycle actions, wallet reconciliation, audit filters, lifecycle history, and the double-cancel negative path
- includes bounded polling for eventually consistent wallet/audit reads
- supports `RESET_PREDICTION_STATE=1` for destructive reruns from clean local state

Clean rerun support added:
- `scripts/qa/reset-local-prediction-state.sh`
- `phoenix.prediction.tools.SyncPredictionSeedData`
- latest clean pass artifact: `revival/artifacts/prediction_staging_gate_20260308_165255.md`
- latest clean pass report: `revival/201_PREDICTION_MARKET_STAGING_GATE.md`

Projection reconciliation added and validated:
- `phoenix.prediction.tools.ReconcilePredictionProjection`
- the live projection tables now replay cleanly from the prediction snapshot journal after a destructive reset/reseed

## 1. Player Module Routing And UX

### 1.1 Prediction entry

- [ ] Phoenix player navigation exposes a real `Prediction` entry, not a disabled placeholder.
- [ ] Switching from Sportsbook to Prediction keeps the shared shell, session, and wallet identity intact.
- [ ] Prediction route loads without sportsbook-only UI leaking into the prediction module.
- [ ] Returning from Prediction to Sportsbook works without full-session loss or broken routing.

### 1.2 Prediction browsing

- [ ] Prediction landing page loads featured markets.
- [ ] Category navigation works.
- [ ] Market detail pages load from prediction cards.
- [ ] `All`, `Open`, `Settled`, and `Cancelled` activity filters behave as expected.
- [ ] Player activity cards show settlement context when available:
  - winning outcome
  - settled at
  - settlement reason
  - settlement actor
  - previous settlement status
  - previous settled timestamp
  - previous settled amount

## 2. Player Order And Wallet Lifecycle

Use a punter account with sufficient balance.

### 2.1 Place order

- [ ] Place a prediction order from the player app.
- [ ] Order appears in `/prediction/activity`.
- [ ] Shared wallet balance decreases by the staked amount.
- [ ] Shared transaction history labels the entry as `Prediction`.
- [ ] Talon user details show the order under prediction orders.

### 2.2 Cancel order

- [ ] Cancel an open prediction order from the player app.
- [ ] Order status changes to `cancelled`.
- [ ] Wallet funds are returned.
- [ ] Shared transaction history still labels the activity as `Prediction`.
- [ ] Talon user wallet history shows the prediction context and cancellation details.

### 2.3 Resolve market

Execute via Talon admin or backend admin API.

- [ ] Resolve a market with a winning outcome.
- [ ] Matching player orders move to `won` or `lost`.
- [ ] Wallet finalization reflects the outcome correctly.
- [ ] Phoenix player activity shows winning outcome and settlement metadata.
- [ ] Talon user prediction orders show market status, winning outcome, settled timestamp, and settlement metadata.

### 2.4 Resettle market

- [ ] Resettle a previously resolved market to a different winning outcome.
- [ ] Affected orders move to `resettled` where appropriate.
- [ ] Prior settlement state is preserved:
  - previous settlement status
  - previous settled timestamp
  - previous settled amount
- [ ] Wallet reconciliation reflects the corrected payout path.
- [ ] Player activity and Talon views expose both current and prior settlement context.

## 3. Talon Role Behavior

### 3.1 Operator

- [ ] Operator can open Talon prediction ops.
- [ ] Operator can view summary, market catalog, market detail, lifecycle history, and risk summary prediction cards.
- [ ] Operator cannot view punter prediction order flow.
- [ ] Operator cannot export prediction order flow.
- [ ] Operator cannot open prediction-scoped audit pivots if the policy is trader/admin only.
- [ ] Operator cannot execute market lifecycle mutations.

### 3.2 Trader

- [ ] Trader can view prediction summary and punter order flow.
- [ ] Trader can export prediction market and order-flow CSVs.
- [ ] Trader can `suspend` and `open` markets.
- [ ] Trader cannot `cancel`, `resolve`, or `resettle` markets.

### 3.3 Admin

- [ ] Admin can view all prediction ops surfaces.
- [ ] Admin can export prediction market and order-flow CSVs.
- [ ] Admin can `suspend`, `open`, `cancel`, `resolve`, and `resettle` markets.
- [ ] Admin can open prediction audit pivots.

## 4. Audit Validation

Perform at least one `suspend`, `open`, `cancel`, `resolve`, and `resettle` action.

- [ ] A backend-native audit row is written for each lifecycle mutation.
- [ ] Audit entry includes:
  - action
  - product
  - actorId
  - targetId
  - details
  - occurredAt
  - before snapshot
  - after snapshot
- [ ] Talon audit table renders prediction lifecycle entries with readable details.
- [ ] Prediction audit filtering works by:
  - `product=prediction`
  - `targetId`
  - `action`
  - `actorId`

## 5. Reporting And Export Validation

### 5.1 Talon CSV exports

- [ ] Prediction market catalog CSV downloads successfully.
- [ ] Prediction order-flow CSV downloads successfully.
- [ ] User prediction-orders CSV downloads successfully.
- [ ] CSV output includes prediction-specific settlement fields where relevant:
  - market status
  - winning outcome
  - settled at
  - settlement reason
  - settlement actor
  - previous settlement status
  - previous settled at
  - previous settled amount

### 5.2 Player and wallet history

- [ ] Phoenix transaction history can distinguish prediction activity from sportsbook activity.
- [ ] Talon wallet history can distinguish prediction activity from sportsbook activity.
- [ ] Prediction transaction descriptors remain readable after cancellation, resolution, and resettlement.

### 5.3 Backoffice reports

- [ ] DGE daily summaries include prediction-aware output where implemented.
- [ ] `dgen113` prediction companion tables render for:
  - Result Summary
  - Sports Liability
  - Result Details
  - Cancelled
  - Voids
  - Resettle
- [ ] Prediction rows do not reuse misleading sportsbook-only terminology.

## 6. Failure And Reconciliation Checks

### 6.1 Negative-path validation

- [ ] Attempt to cancel a non-open order and confirm the API rejects it cleanly.
- [ ] Attempt trader settlement actions and confirm `403`.
- [ ] Attempt operator order-flow access and confirm `403` or blocked UI path.
- [ ] Attempt invalid market transitions and confirm `400`.

### 6.2 Reconciliation spot checks

- [ ] Compare wallet balance deltas against prediction order outcomes for at least 5 orders.
- [ ] Compare Talon user wallet history against player transaction history for the same punter.
- [ ] Compare Talon prediction order rows against backend API responses for the same orders.
- [ ] Compare audit timestamps and lifecycle history timestamps for the same market transitions.

## 7. Suggested Execution Order

1. Validate role matrix in Talon.
2. Validate player routing and prediction browsing.
3. Place open orders with a test punter.
4. Cancel one order.
5. Resolve one market.
6. Resettle one resolved market.
7. Validate wallet, activity, and Talon user views after each step.
8. Validate audit logs.
9. Validate CSV exports.
10. Validate reporting output.

## 8. Release Gate

Prediction Market is staging-ready only if all conditions below are true:

- [ ] Player order placement, cancellation, resolution, and resettlement all work end to end.
- [ ] Wallet reconciliation is correct for all tested paths.
- [ ] Talon role behavior matches intended policy.
- [ ] Audit entries are present and filterable.
- [ ] CSV/report outputs contain prediction-aware fields and labels.
- [ ] No blocker defects remain in routing, wallet accounting, settlement correctness, or permissions.

## Notes / Defects

- Defect ID:
- Severity:
- Owner:
- Repro steps:
- Status:

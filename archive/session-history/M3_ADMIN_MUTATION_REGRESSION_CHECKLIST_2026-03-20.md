# M3 Admin Mutation Regression Checklist

**Date:** 2026-03-20 (R3 session)

---

## Purpose

Checklist for verifying admin mutation surfaces after M3 work. Use this for regression testing when touching any of these paths.

---

## Market Status Lifecycle (M3-S1)

### Backend: phoenix-market-engine
- [ ] `PUT /admin/markets/{id}/status` with `{"status": "suspended"}` transitions BETTABLE → NOT_BETTABLE
- [ ] `PUT /admin/markets/{id}/status` with `{"status": "open"}` transitions NOT_BETTABLE → BETTABLE
- [ ] Terminal states (closed, voided, settled) reject transition → 400
- [ ] Idempotent same-state transitions accepted → 200
- [ ] `FOR UPDATE` row lock prevents race conditions
- [ ] Role: only `operator` and `admin` see suspend/reopen controls

### Tests (all green):
- `TestUpdateStatusTransitionValidation` — 13 subtests covering valid/invalid/terminal transitions
- `TestUpdateStatusNormalizesAndPublishes`

### Frontend: talon-backoffice
- [ ] `MarketLifecycleSuspend` renders only for BETTABLE/NOT_BETTABLE states
- [ ] Button hidden for SETTLED/CLOSED/VOIDED markets
- [ ] Uses `PUT admin/markets/:id/status` (not legacy POST lifecycle route)
- [ ] `canMutateMarketStatus` role check gates visibility

---

## Market Settle (M3-S2)

### Backend: phoenix-market-engine
- [ ] `POST /admin/markets/{id}/settle` with `winning_outcome_id` transitions open/suspended → settled
- [ ] Already-settled markets rejected → 400
- [ ] Voided/closed markets rejected → 400
- [ ] Missing `winning_outcome_id` rejected → 400
- [ ] `reason` field propagated to audit and Kafka event
- [ ] `FOR UPDATE` row lock on settle
- [ ] Does NOT trigger bet payouts (decoupled by design)

### Tests (all green):
- `TestSettleMarketFromOpen`, `TestSettleMarketFromSuspended`
- `TestSettleMarketRejectsAlreadySettled`, `TestSettleMarketRejectsVoided`, `TestSettleMarketRejectsClosed`
- `TestSettleMarketRequiresWinningOutcome`
- `TestDecodeSettleRequest_*` — 5 handler-level tests for request parsing

### Frontend: talon-backoffice
- [ ] `GoMarketSettle` renders only for BETTABLE markets + operator/admin role
- [ ] Single-select outcome picker (NOT multi-select)
- [ ] Maps `winningSelectionId` → `winning_outcome_id`
- [ ] No resettle path exposed

---

## Multi-Leg Settle Guard (M3-S4 / M45)

### Backend: phoenix-betting-engine
- [ ] `POST /admin/bets/{id}/lifecycle/settle` rejects multi-leg bets → 400 "manual settlement only supports single bets"
- [ ] `len(bet.Legs) > 0` check in `resolveManualSettlementResult`
- [ ] Single bets settle normally (cancel, refund, settle all work)

### Tests (all green):
- `TestApplyAdminBetLifecycleActionSettleRejectsParlays`
- `TestApplyAdminBetLifecycleActionCancel`, `TestApplyAdminBetLifecycleActionRefund`
- `TestApplyAdminBetLifecycleActionSettleWin`, `TestApplyAdminBetLifecycleActionSettleLoss`
- `TestApplyAdminBetLifecycleActionSettleRollsBackWalletSideEffectsWhenMarkFails`
- `TestApplyAdminBetLifecycleActionUnsupported`

### Frontend: talon-backoffice
- [ ] Settle option disabled in dropdown for multi-leg bets
- [ ] Label shows "(multi-leg not supported)" when disabled
- [ ] Auto-switches to cancel if settle was selected when multi-leg detected
- [ ] Debounced 500ms lookup via `GET admin/bets/:id`
- [ ] Cancel and refund remain available for all bet types

### Tests (all green):
- 5 contract tests for bet intervention payloads and validation
- 3 component tests for form rendering, hook wiring, short-ID guard

---

## Gateway Routing

### Tests (all green):
- Gateway integration: 1 suite
- Handler tests: 1 suite
- Middleware tests: 1 suite
- Route repository tests: 1 suite

---

## Verification Commands

```bash
# Backend
cd phoenix-betting-engine && go test -race ./...
cd phoenix-market-engine && go test -race ./...
cd phoenix-gateway && go test -race ./...

# Frontend
cd talon-backoffice && ./node_modules/.bin/jest --config packages/office/jest.config.js --testPathPattern="provider-ops" --no-coverage
cd talon-backoffice && ./node_modules/.bin/tsc -p packages/office/tsconfig.json --noEmit --pretty false --types jest,node
```

# M3-S4 Multi-Leg Settle Guard — Validation Report

**Date:** 2026-03-20 (R3 session)
**Decision:** VALIDATED

---

## 1. Summary

The M45 claim that a multi-leg settle UI guard was delivered is **valid**. The implementation exists at both frontend and backend layers with two-layer protection.

---

## 2. Frontend Guard

**File:** `talon-backoffice/packages/office/containers/provider-ops/index.tsx`

| Mechanism | Location | Description |
|-----------|----------|-------------|
| State tracking | Line 91 | `const [betIsMultiLeg, setBetIsMultiLeg] = useState(false)` |
| Debounced lookup | Lines 492-513 | 500ms debounce → `GET admin/bets/:id` → checks `legs` array length |
| Auto-switch | Lines 505-506 | If multi-leg detected and settle selected, switches action to cancel |
| Dropdown disable | Lines 1367-1371 | `disabled={betIsMultiLeg}` on settle option + "(multi-leg not supported)" label |
| Form reset | Lines 515-518 | `resetBetInterventionForm` clears `betIsMultiLeg` state |

**Assessment:** Functional, correct design pattern. Prevents operator from selecting settle for multi-leg bets.

---

## 3. Backend Guard

**File:** `phoenix-betting-engine/internal/service/service.go`

| Mechanism | Location | Description |
|-----------|----------|-------------|
| Multi-leg check | Line 1408 | `if len(bet.Legs) > 0 { return "", fmt.Errorf("%w: manual settlement only supports single bets", ErrInvalidInput) }` |
| Called from | Line 643 | `resolveManualSettlementResult(bet, req)` inside `settleAdminBet` |
| Error type | — | `ErrInvalidInput` → maps to HTTP 400 |

**Bet struct:** `models.Bet.Legs` is `[]BetLeg` (`models.go` line 36)

**Assessment:** Real backend rejection. Even if UI guard is bypassed via direct API call, backend will reject.

---

## 4. Test Coverage

### Backend (EXISTS)
- **File:** `phoenix-betting-engine/internal/service/service_test.go` lines 1719-1753
- **Test:** `TestApplyAdminBetLifecycleActionSettleRejectsParlays`
- Creates a bet with `Legs: []models.BetLeg{{...}}`, attempts settle, asserts `ErrInvalidInput`

### Frontend (ADDED — Task T3 overnight)
- **Contract tests:** `talon-backoffice/packages/office/containers/provider-ops/__tests__/contracts.test.ts` (lines 345-399)
  - `canSubmitBetIntervention` rejects settle without required fields
  - `canSubmitBetIntervention` accepts cancel/refund for any bet type
  - `buildBetInterventionPayload` strips settle-specific fields for non-settle actions
  - 2 additional contract guard tests (5 contract tests total)
- **Component tests:** `talon-backoffice/packages/office/containers/provider-ops/__tests__/provider-ops.test.tsx`
  - 3 component tests for multi-leg detection behavior (auto-switch, dropdown disable, state reset)
- **Result:** 8 new tests (5 contract + 3 component), all passing — suite is 34/34 green

---

## 5. Validation Decision

| Aspect | Status |
|--------|--------|
| Frontend UI guard | VALIDATED |
| Backend rejection | VALIDATED |
| Backend test | VALIDATED |
| Frontend test | VALIDATED — 8 tests added (5 contract + 3 component), 34/34 green |
| Live validation | CODE-COMPLETE / LIVE-VALIDATION-PENDING (stack not available) |

**Overall:** **VALIDATED** — both layers protect against multi-leg settle. Frontend regression tests confirmed (34/34 green).

---

## 6. Prior Overnight Claim Assessment

The prior overnight session's finding that "provider-ops bet intervention form exposes settle action for multi-leg bets" was correct at time of discovery. M45 subsequently implemented the fix. The fix is real, two-layered, and closes the M3 exit gate blocker.

---

## 7. Remaining Work

1. Live validation when stack is available (deferred — not code-blocking)

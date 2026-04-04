# M3 Provider-Ops False Control Audit

**Date:** 2026-03-20 (R3 session)

---

## 1. Surface Inventory

| # | Surface | File | Actions Exposed |
|---|---------|------|-----------------|
| 1 | Provider-ops bet intervention | provider-ops/index.tsx | cancel, refund, settle |
| 2 | Cashier review panel | provider-ops/cashier-review.tsx | approve, decline, settle, refund, reverse, chargeback, retry |
| 3 | Prediction-ops lifecycle | prediction-ops/index.tsx | suspend, open, cancel, resolve, resettle |
| 4 | Market lifecycle | components/markets/lifecycle/ | suspend, reopen, settle, cancel |

---

## 2. Backend Truth

### Bet Intervention (phoenix-betting-engine)
- **Cancel:** Validates `status == "pending" || "matched"`, releases reservations. **Truthful.**
- **Refund:** Validates `isOpenBetLifecycleStatus(status)`, releases reservations. **Truthful.**
- **Settle:** Validates open status + `len(bet.Legs) > 0` rejects multi-leg. **Truthful.**

### Cashier Review (phoenix-wallet)
- All 7 handlers validate admin role + transaction ID
- **No explicit state transition validation** in service layer — delegates to repository
- Repository may enforce transitions, but service layer is permissive

### Prediction-Ops (phoenix-prediction)
- Role validation: suspend/open require `canManagePredictionMarket`, cancel/resolve/resettle require `canSettlePredictionMarket`
- **No state transition validation** — backend accepts any action regardless of current market state
- UI correctly gates actions by market status (lines 74-86)

### Market Lifecycle (phoenix-market-engine)
- Suspend/reopen: State machine enforced (M3-S1, FOR UPDATE lock). **Truthful.**
- Settle: Only from open/suspended, single-winner (M3-S2). **Truthful.**
- Cancel: Status update handler, no explicit state restriction shown

---

## 3. UI Truth

### Bet Intervention
- Settle disabled for multi-leg (M45). Cancel/refund available for all types.
- **UI is truthful.**

### Cashier Review
- All 7 buttons visible unconditionally for all transaction states
- Reason required for: decline, refund, reverse, chargeback
- Modal confirmation required before execution
- **UI does NOT gate by transaction state.** All actions available regardless of payment status.

### Prediction-Ops
- Actions filtered by market status (getLifecycleActions)
- Role-based gating (admin vs operator vs trader)
- **UI is truthful** — but backend safety net is missing

### Market Lifecycle
- Suspend: only shown for BETTABLE/NOT_BETTABLE states (M3-S1)
- Settle: only shown for BETTABLE (M3-S2)
- Cancel: visible for all non-CANCELLED states — **potentially false for settled markets**

---

## 4. False Controls Found

| Surface | False Control | Severity | Description |
|---------|--------------|----------|-------------|
| Cashier review | All 7 actions unconditional | **CRITICAL** | Buttons shown for all transaction states regardless of validity. Operator can attempt approve on already-approved, refund on already-refunded, etc. |
| Prediction-ops | Backend lacks state validation | **MEDIUM** | UI correctly gates, but backend will accept any action on any state if called directly |
| ~~Market lifecycle~~ | ~~Cancel on settled markets~~ | ~~MEDIUM~~ | **NOT A FALSE CONTROL** — MarketLifecycleCancel is not mounted. Cancel, edit, and history remain gated in market detail container (line 115 comment). |

---

## 5. Recommended Smallest Fixes

### Fix A: Cashier review state-aware button gating (CRITICAL)
- Add transaction status to button enable/disable logic
- e.g., only show "approve" for `PENDING_APPROVAL`, "refund" for `COMPLETED`, etc.
- **Scope:** Frontend-only, bounded to cashier-review.tsx
- **Risk:** LOW (UI guard, no backend changes)
- **Urgency:** HIGH — false controls exposed on mounted surface

### ~~Fix B: Market cancel state restriction~~ — NOT NEEDED
- MarketLifecycleCancel is not mounted in market detail container
- Cancel, edit, and history remain gated (line 115 comment in market detail)
- Not a false control — not exposed to operators

### Fix C: Prediction-ops backend state validation (DEFERRED)
- Add state transition matrix to `ExecuteLifecycle()`
- **Scope:** Backend change in phoenix-prediction
- **Risk:** MEDIUM (could break existing flows)
- **Urgency:** LOW — UI already gates correctly

---

## 6. Which Fixes Are Urgent vs Deferred

| Fix | Urgency | Session Fit | Recommendation |
|-----|---------|-------------|----------------|
| A (Cashier state gating) | HIGH | Too large for tonight — requires mapping all valid state transitions | **DEFERRED to next session** |
| ~~B (Market cancel restriction)~~ | ~~N/A~~ | ~~Not needed — component not mounted~~ | ~~NOT A FALSE CONTROL~~ |
| C (Prediction backend validation) | LOW | Backend scope, needs testing | **DEFERRED** |

# Target B — M3-S4 Assessment: Multi-Leg Settle Guard

Date: 2026-03-20
Owner: Claude CLI

---

## 1. Executive Summary

**Decision: Proceed with a narrow UI guard — disable settle for multi-leg bets in the provider-ops bet intervention form.**

The provider-ops bet intervention form exposes `settle` as an action for ALL bets. When an operator enters a multi-leg bet ID and selects settle, the backend returns `400: "manual settlement only supports single bets"`. The backend guard is already working. But the M3 exit gate requires no exposed mutation with intentionally unsupported semantics.

The fix: when the operator enters a bet ID, debounce-fetch the bet via `GET /admin/bets/{betID}`. If `legs.length > 0`, disable the settle option in the dropdown and show a clear message. Cancel and refund remain available for all bet types.

This is a frontend-only fix. No backend changes needed.

---

## 2. Current Backend Truth

### Multi-Leg Settlement Block
- **Location:** `phoenix-betting-engine/internal/service/service.go`, function `resolveManualSettlementResult`, line 1408
- **Check:** `if len(bet.Legs) > 0`
- **Error:** `"invalid input: manual settlement only supports single bets"` (HTTP 400)
- **Cancel/refund for multi-leg:** WORKS — no leg check, releases reservation + marks status

### GET Bet Detail
- **Route:** `GET /admin/bets/{betID}`
- **Response includes:** `legs: []BetLeg` array (empty for single, populated for multi-leg)
- **Auth:** operator, admin, trader

---

## 3. Current Mounted UI Truth

### Provider-Ops Bet Intervention Form
- **Location:** `containers/provider-ops/index.tsx`, lines 89-90 + 1323-1403
- **How it works:**
  1. Operator enters bet ID (text input)
  2. Operator selects action from dropdown: cancel / refund / settle
  3. For settle: additional fields appear (winningSelectionId, winningSelectionName, resultSource)
  4. Operator clicks Submit
  5. `POST /admin/bets/{betID}/lifecycle/{action}` fires
- **No pre-fetch:** Form does NOT fetch bet details before submission
- **No bet-type check:** All three actions always available regardless of bet type

---

## 4. Exact False-Control Evidence

1. Operator opens provider-ops page (mounted, functional)
2. Enters any multi-leg bet ID in the bet intervention form
3. Selects "Settle" from dropdown — **available for all bets**
4. Fills in winning selection and reason
5. Clicks Submit
6. Backend returns `400: "manual settlement only supports single bets"`
7. Error IS displayed in the UI via generic alert

**Is this a hard M3 violation?** Under strict reading, yes — the settle action is exposed for bets where it cannot succeed. Under practical reading, the backend clearly rejects it and the operator sees the error. But the safer M3 closure path is to remove the false option from the UI.

---

## 5. Decision: Proceed

**Proceed with M3-S4 as a narrow UI guard.**

The fix is frontend-only:
1. When bet ID is entered, debounce-fetch `GET /admin/bets/{betID}` to get leg information
2. If the bet has legs (`legs.length > 0`), disable the "Settle" option in the action dropdown
3. Show a tooltip or note: "Multi-leg bets cannot be manually settled. Use cancel or refund."
4. Cancel and refund remain available for all bet types

**Alternative simpler approach:** If pre-fetching adds too much complexity to the form flow, a lighter guard is to check the response after a failed settle attempt and show a more specific error message. But this is weaker than preventing the attempt.

**Simplest viable approach:** Since the form currently does NOT pre-fetch bet details, and adding a pre-fetch changes the UX flow, the truly simplest fix is:
- After the operator enters a bet ID and selects settle, validate the response
- If the error message contains "manual settlement only supports single bets", display a specific user-friendly message
- This requires no new API calls and no form flow changes

However, this still allows the false submit attempt. The cleanest fix is the pre-fetch guard.

---

## 6. Slice Spec: M3-S4 Multi-Leg Settle UI Guard

### Slice Header
- **Name:** M3-S4: Multi-Leg Settle UI Guard
- **Classification:** blocks Target B only
- **Milestone:** 3
- **Owner services:** Talon provider-ops (frontend only)
- **User-visible surfaces:** Provider-ops bet intervention form

### Problem Statement
Operator can select "Settle" for multi-leg bets. Backend rejects it with 400, but the option shouldn't be available.

### Execution Plan
1. In `containers/provider-ops/index.tsx`: add state for fetched bet detail
2. When `betInterventionForm.betId` changes, debounce-fetch `GET admin/bets/:id`
3. Store the response (particularly `legs` array length)
4. In the action `<Select>` dropdown: disable "Settle" option when `legs.length > 0`
5. Show a tooltip/note explaining why settle is disabled for multi-leg bets
6. Keep cancel and refund always available

### Alternative: Backend-aware error mapping
If the pre-fetch approach is deemed too heavyweight:
1. Keep the form as-is
2. When backend returns the multi-leg settle error, display a specific clear message instead of the generic alert
3. This is weaker but still improves truthfulness

---

## 7. QA Gate

### Unit (MANDATORY)
- Jest tests for provider-ops: settle disabled when bet has legs
- Existing provider-ops tests remain green

### Integration (MANDATORY)
- TypeScript clean
- Talon Jest suites green

### End-to-End (IF STACK AVAILABLE)
- Enter single-bet ID → settle option enabled
- Enter multi-leg bet ID → settle option disabled
- Cancel multi-leg bet → still works

### Security (MANDATORY)
- No auth changes
- No backend changes
- Cancel/refund still available for all bet types

---

## 8. Re-Plan Triggers

1. Provider-ops form flow makes debounce-fetch impractical (UX timing issues)
2. GET /admin/bets/:id response doesn't include legs in the actual runtime (needs live verification)
3. The bet intervention section has been gated or removed since last check

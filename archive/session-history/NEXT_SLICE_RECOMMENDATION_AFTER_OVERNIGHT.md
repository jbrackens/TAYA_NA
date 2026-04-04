# Next Slice Recommendation After Overnight Session

Date: 2026-03-20
Owner: Claude CLI

---

## 1. Completed Tonight

| Task | Status |
|------|--------|
| TASK 1: Normalize stale docs | COMPLETE |
| TASK 2: Assess fixture lifecycle | COMPLETE — DEFER (page can't load data) |
| TASK 3: Implement fixture lifecycle | SKIPPED (TASK 2 said DEFER) |
| TASK 4: Reassess next slice | COMPLETE (this document) |

---

## 2. Current M3 Truth

### M3 Exit Gate
> "No exposed admin mutation remains in a state where transport exists but semantics are intentionally unsupported."

### Items Completed
- M3-S1: Market suspend/reopen — DONE (M40-M42)
- M3-S2: Market single-winner settle — DONE (M43-M44)

### Items Assessed and Deferred
- Fixture lifecycle (freeze/unfreeze) — fixture detail page can't load data (`admin/trading/fixtures/:id` returns 404). Controls are unreachable. Does NOT block M3 exit gate.
- Fixture detail embedding — separate scope from lifecycle. Needed to make fixture detail functional.
- Market categories / fixed exotics / history drawers / tournaments — all gated, not mounted. Do not block M3.
- Session-limit writes — UI entry point commented out. Not mounted. Does not block M3.

### Remaining M3 Blocker

**Multi-leg/parlay bet settlement via provider-ops bet intervention.**

The provider-ops page has a "Bet Intervention" section that lets operators call `POST admin/bets/:id/lifecycle/:action` with action = `settle`, `cancel`, or `refund`. For `settle`, this works for single bets but explicitly returns an error for multi-leg/parlay bets: `"manual settlement only supports single bets"`.

This IS an exposed admin mutation where transport exists (the route + UI form exist) but semantics are intentionally unsupported (multi-leg settlement is blocked). This violates the M3 exit gate.

**Options:**
1. **Implement multi-leg settlement** — highest risk, requires leg-level result semantics design + wallet integration changes
2. **Hide the settle action for multi-leg bets in the UI** — show only cancel/refund in the bet intervention form when the bet has legs. This is semantically truthful: operators can still cancel/refund multi-leg bets (which work), but cannot see a settle option that would fail.
3. **Show settle but display a clear "multi-leg settlement not supported" message in the UI** before submission — less clean but transparent.

---

## 3. Candidate Comparison

| Candidate | Size | Risk | M3 Gate Impact |
|-----------|------|------|----------------|
| A: Multi-leg settlement implementation | Large | HIGH (wallet/accounting) | Closes M3 gate completely |
| B: Hide settle for multi-leg in UI | Small | LOW | Closes M3 gate (no exposed unsupported mutation) |
| C: Fixture detail restoration (GET + markets + lifecycle) | Medium | MEDIUM | Does not affect M3 gate |
| D: Market cancel | Small | LOW | Market cancel is gated, not M3-blocking |

---

## 4. Recommended Next Slice

~~**Option B: Hide settle action for multi-leg bets in provider-ops bet intervention UI.**~~

**STATUS: SUPERSEDED — DONE via Wave M45.** Multi-leg settle UI guard implemented with debounced bet lookup, dropdown disable, and auto-switch to cancel. Backend rejection at `resolveManualSettlementResult` (`len(bet.Legs) > 0`). M3 exit gate closed. See `TARGET_B_M3_S4_MULTILEG_SETTLE_GUARD_VALIDATION.md`.

~~**Why:**~~
~~1. Smallest slice that closes the M3 exit gate~~
~~2. No backend changes needed — cancel/refund already work for multi-leg bets~~
~~3. Single-bet settlement already works~~
~~4. The only change is UI-side: don't show `settle` as an available action when the operator enters a multi-leg bet ID~~
~~5. Alternatively: show all three actions but validate client-side and show a clear message for multi-leg settle~~

**Why other candidates wait:**
- **Multi-leg settlement implementation** is the right long-term fix but requires leg-level result semantics design, wallet integration changes, and API contract extension. It should not be rushed.
- **Fixture detail restoration** doesn't affect M3 gate
- **Market cancel** is gated, not exposed

---

## 5. Why Other Candidates Wait

- Multi-leg implementation: HIGH risk, needs design decisions (all-or-nothing vs per-leg results?), wallet integration changes, API contract extension. Not appropriate as a quick slice.
- Fixture detail: page is broken at the data-fetch level. Needs GET route fix + markets embedding. Does not affect M3 gate.
- Market cancel: properly gated in the UI. Not exposed. Does not block M3.

---

## 6. QA Gate for the Recommended Slice

### Unit (MANDATORY)
- Focused tests proving settle option is hidden/disabled for multi-leg bets
- Existing bet intervention tests remain green

### Integration (MANDATORY)
- `tsc --noEmit` clean
- Jest suites for provider-ops green

### End-to-End (IF STACK AVAILABLE)
- Open provider-ops → bet intervention form
- Enter a multi-leg bet ID → verify settle is not available
- Enter a single-bet ID → verify settle is still available
- Execute cancel on a multi-leg bet → verify it works

### Security (MANDATORY)
- No auth changes
- No backend changes
- No new mutations exposed

---

## Note on M3 Closure

If Option B is implemented and validated, the M3 exit gate check becomes:
- Market suspend/reopen: truthful (M3-S1)
- Market settle: truthful (M3-S2)
- Bet cancel/refund: truthful for all bet types
- Bet settle: truthful for single bets; not exposed for multi-leg
- All other mounted surfaces: no unsupported exposed mutations
- All gated/unmounted surfaces: not applicable to M3 gate

**M3 could then be declared closed**, with multi-leg settlement deferred to Milestone 4 or a later feature slice.

# Next Slice Recommendation After Overnight R2 Session

Date: 2026-03-20
Owner: Claude CLI

---

## 1. Completed Tonight (R2)

| Task | Status |
|------|--------|
| TASK 1: Reconcile docs | COMPLETE |
| TASK 2: Re-verify fixture lifecycle defer | COMPLETE — confirmed DEFER |
| TASK 3: Assess multi-leg settle UI guard | COMPLETE — decision: PROCEED |
| TASK 4: Implement multi-leg settle UI guard | COMPLETE (code-complete, live-validation-pending) |
| TASK 5: Assess fixture detail embedding | COMPLETE — decision: DEFER (post-M3) |
| TASK 6: Guardrail hardening | COMPLETE |
| TASK 7: Handoff | COMPLETE (this document) |

---

## 2. Current M3 Truth

### M3 Exit Gate Status: CLOSABLE (pending live validation)

| Exposed Mutation | Status | Evidence |
|------------------|--------|---------|
| Market suspend/reopen | Truthful | M3-S1 (M40-M42), Playwright verified |
| Market settle | Truthful | M3-S2 (M43-M44), Playwright verified |
| Multi-leg bet settle | Guarded | M3-S4 (M45), settle disabled for multi-leg in UI. Code-complete, live-validation-pending |
| Fixture lifecycle | Not exposed | Page can't load data (404 on GET). Deferred. |
| Market cancel | Not exposed | Gated in UI. |
| All other mounted mutations | Truthful | Users, prediction-ops, provider-ops, terms all functional |

### To close M3:
1. Run Playwright validation for the M3-S4 multi-leg settle guard
2. Verify settle disabled for multi-leg bet in provider-ops
3. If green, M3 can be declared closed

---

## 3. Candidate Comparison for Post-M3 Work

| Candidate | Size | Risk | Category |
|-----------|------|------|----------|
| A: Fixture detail restoration | Medium | MEDIUM | Transport + normalization + markets |
| B: Market cancel in UI | Small | LOW | Ungating (similar to M3-S1/S2 pattern) |
| C: Multi-leg settlement implementation | Large | HIGH | Wallet/accounting |
| D: Milestone 4 hardening items | Various | LOW-MEDIUM | Provider depth, role-matrix, reporting |

---

## 4. Recommended Next Slice

**M3 closure validation first.** Once M3 is confirmed closed via Playwright:

1. **Market cancel** (small, follows established pattern) — if deemed necessary
2. **Fixture detail restoration** (medium) — restores a full admin surface
3. **Milestone 4 items** — provider depth, role-matrix, reporting breadth

---

## 5. Why Other Candidates Wait

- **Multi-leg settlement implementation**: HIGH risk, needs design decisions. The UI guard closes M3 without it. Implement when product actually requires it.
- **Fixture detail**: Medium size, 4 gaps. Good post-M3 work but not urgent.
- **Milestone 4**: Deferred until M3 is formally closed.

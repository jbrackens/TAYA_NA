# ADR-0006: Ledger accounting model (single-entry + reconciler vs. double-entry)

**Status:** Proposed — awaiting owner decision (improvement-plan **P2-10**, audit **COR-06**)

**Deciders:** John Brackens (owner)
**Date:** 2026-06-13
**Related:** AUDIT_REPORT.md COR-06; reconciler `internal/prediction/workers/reconciler.go`; P3-05 alert `ReconcilerDriftDetected`. This ADR decides the model; implementation follows the decision.

## Context

The wallet ledger (`internal/wallet/service.go`, `wallet_ledger` table) is
**single-entry running-balance**: one row per mutation carrying `balance_after`,
deduped by idempotency key (with amount/reason conflict detection), serialized
per balance row with `FOR UPDATE`. Those mechanics are sound and the per-user
cash invariants hold.

What's missing (COR-06): there is **no contra account**. House cash, fee income,
collateral/escrow pools, and bonus liability are not ledger entities, so a unit
of money leaving a user's wallet is not matched by a balancing entry elsewhere.
"Money created or destroyed" is therefore not *structurally* impossible — it's
only *detected after the fact* by the separate reconciler. For a platform
courting institutional B2B partners, the audit calls double-entry — or a
**documented equivalence argument plus a scheduled, alerting reconciler** — table
stakes.

This ADR picks the target model now so the work is sequenced, not ad hoc.

## Decision

Adopt **Option B now** (formalize the single-entry + scheduled-alerting-reconciler
model as the documented equivalence) and commit to **Option C as the evolution**
(introduce system/contra accounts for the money-bearing flows) when a partner or
regulator requires structural double-entry. Do **not** undertake the full
Option A rewrite at this stage.

Rationale: Option B is the cheapest path that satisfies the audit's "table
stakes" bar, and most of it already exists — the reconciler runs (P3-12-adjacent
work + `reconciler.go`) and P3-05 added the `ReconcilerDriftDetected` (critical)
alert. The remaining work is to *write down* the equivalence argument, make the
reconciler's scheduling + alerting a guaranteed, tested property, and add the
contra-account scaffolding incrementally (Option C) where it most reduces risk
(settlement collateral, fees).

## Options Considered

### Option A: Full double-entry — *Rejected for now*
Every movement posts balanced debit+credit rows across a chart of accounts
(user wallets + house cash + fee income + collateral escrow + bonus liability).
- **Pros:** money creation/destruction is structurally impossible; the trial
  balance is the invariant; the gold standard for institutional partners.
- **Cons:** rewrites every wallet mutation + a schema/migration of the ledger;
  high risk on the money path; large effort for a pre-scale platform. Best done
  once, deliberately, not under time pressure.

### Option B: Documented equivalence + scheduled, alerting reconciler — *Recommended (now)*
Keep single-entry running-balance; formally document why per-user balances +
collateral accounting are conserved, and guarantee the reconciler runs on a
schedule and alerts on any drift ≠ 0.
- **Pros:** satisfies the audit's stated alternative to double-entry; reconciler
  + drift alert already largely exist (P3-05); low risk, fast.
- **Cons:** conservation is *detected*, not *enforced* — a window exists between
  a drift event and the alert/repair. Mitigated by short reconciler interval +
  paging alert + the COR-01/P3-12 settlement guards.

### Option C: System/contra accounts for money-bearing flows — *Recommended (evolution)*
Introduce ledger-entity accounts for collateral escrow, fees, and house cash;
post the contra side for those flows while keeping the per-user running balance.
- **Pros:** structural correctness where it matters most (settlement collateral)
  without a full rewrite; a stepping stone to Option A.
- **Cons:** partial double-entry is a hybrid that must be clearly bounded so it
  doesn't become an inconsistent half-measure.

## Trade-off Analysis

The axis is **structural enforcement vs. effort/risk on the money path**. At the
current stage the binding constraint is not a failing audit of the books — the
reconciler shows them conserved — but the *story* told to institutional
partners. Option B tells that story credibly (documented model + alerting
reconciler) for a fraction of Option A's cost and risk, and Option C buys
structural enforcement for the highest-stakes flow (collateral) incrementally.
Option A remains the destination once a partner contract or regulator makes it
required.

## Consequences

- The equivalence argument becomes a maintained doc; changing the wallet
  mutation model requires updating it.
- The reconciler's schedule + drift alert become a *tested guarantee* (a
  guardrail-style assertion), not best-effort. The P3-05 `ReconcilerDriftDetected`
  alert is the enforcement surface.
- Option C work, when scheduled, adds a small chart of system accounts +
  contra postings for collateral/fees — additive migrations, not a rewrite.
- If the owner instead directs Option A, that is its own multi-step epic
  (chart of accounts → dual postings on every mutation → trial-balance
  invariant test → migration/backfill) and should be sequenced like the
  tenancy epic (ADR-0005).

## Action Items

- [ ] **Owner:** approve Option B-now / C-evolution, or direct the Option A
      rewrite.
- [ ] On B approval: write the equivalence argument doc; add a test asserting the
      reconciler is scheduled and that a synthetic drift fires the alert
      (ties to P3-05).
- [ ] Schedule Option C (system/contra accounts for collateral + fees) as the
      next ledger increment when partner requirements firm up.

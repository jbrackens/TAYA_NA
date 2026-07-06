# Architecture Decision Records

Remediation ADRs from the production-readiness audit (2026-05-22) of the Taya NA Predict / "TapTrade" prediction exchange. Each ADR is grounded in specific files/line numbers in `apps/taptrade-platform`.

| ADR | Title | Priority | Status |
|-----|-------|----------|--------|
| [0001](./0001-backoffice-type-safety.md) | Eliminate backoffice type-unsafety (retire `ignoreBuildErrors`) | P1 | Proposed |
| [0002](./0002-authorization-hardening.md) | Authorization hardening for admin + wallet mutations | **P0** | Proposed |
| [0003](./0003-resolution-source-architecture.md) | Pluggable resolution-source (oracle) architecture | P1 | Proposed |
| [0004](./0004-dispute-and-appeal.md) | Dispute & appeal mechanism (resolution finality with recourse) | P1 | Proposed |

## Sequencing & Dependencies

| Order | ADR | Priority | Depends on | Effort (rough) |
|-------|-----|----------|------------|----------------|
| 1 | **0002** Authz hardening | **P0 — days** | none | ~2–3 dev-days |
| 2 | **0001** Office type debt | P1 | none (parallelizable) | ~2 sprints (ratchet) |
| 3 | **0003** Resolution sources | P1 | 0002 (admin authz sound first) | ~2–4 weeks/category |
| 4 | **0004** Disputes | P1 | **0003** (needs the proposal step) | ~3–4 weeks |

**Cross-cutting:** every privileged/financial action (ADR-0002, settlement, dispute decisions) must write an **audit log**. ADR-0003 and ADR-0004 both depend on a **proposed-result → finalize** seam — design that interface once (in 0003) and consume it in 0004.

## Open Questions (block 0003/0004 depth)

1. **Real-money vs play-money launch, and jurisdiction?** Determines whether single-source auto-settle is acceptable and how heavy disputes/KYC must be.
2. **Is an HTTP wallet credit/debit API actually consumed by any client?** (Decides remove-vs-gate in ADR-0002 — quick to verify by grepping the app/office API clients.)
3. **Challenge-window length per category, and dispute eligibility/anti-abuse** (bond? stake? position-weighted?).
4. **On-chain ambition?** If yes, UMA/Chainlink (ADR-0003 Option B) becomes attractive and reshapes disputes.

# ADR-0003: Pluggable resolution-source (oracle) architecture

**Status:** Proposed
**Date:** 2026-05-22
**Deciders:** Eng lead, John (CEO), compliance/legal *(for real-value launch)*

> Source: production-readiness audit (2026-05-22). Coupled with [ADR-0004](./0004-dispute-and-appeal.md). See [README](./README.md).

## Context

Auto-settlement covers only crypto: `gateway/internal/prediction/feed/crypto.go` calls live CoinGecko; `feed/manual.go` is a deliberate no-op (`CanSettle` → false). The `AutoSettler` worker (`internal/prediction/workers/settler.go`, 60s tick) only resolves what an adapter supports, so politics/sports/entertainment/tech/economics markets all fall to **manual admin** settlement.

Two problems:
1. **Coverage** — manual resolution does not scale across categories.
2. **Trust** — crypto relies on a *single* source (CoinGecko); manual relies on a single operator with no corroboration. Settlement records a sha256 attestation (`settlement.go`) but no multi-source evidence.

Path shorthand: `gateway` = `apps/Phoenix-Predict-Combined/go-platform/services/gateway`.

## Decision

Formalize a **`ResolutionSource` registry** (extending the existing `feed.Adapter` pattern) keyed per series/category, supporting **multiple adapters with corroboration**, structured **attestation evidence**, and a **"proposed result" step** rather than immediate finalization (the seam [ADR-0004](./0004-dispute-and-appeal.md) needs).

## Options Considered

### Option A: More first-party feed adapters (sports/elections/econ APIs)
| Dimension | Assessment |
|-----------|------------|
| Complexity | Med |
| Cost | Per-source integration + vendor fees |
| Neutrality | Operator-trusted |
| Reuse | High (existing `feed.Adapter`) |

**Pros:** reuses the real, tested pattern; incremental per category.
**Cons:** vendor cost/reliability; you remain the trusted resolver.

### Option B: Decentralized optimistic oracle (UMA-style) / Chainlink
**Pros:** credible neutrality; UMA brings a **built-in dispute/escalation** game.
**Cons:** chain dependency, latency, gas/cost, large complexity — and the app is **not currently on-chain**.

### Option C: Hardened manual-only (dual-control SOP + evidence)
**Pros:** cheapest; handles the long tail.
**Cons:** doesn't scale; trust concentrated in operators.

### Recommended: Hybrid
Option A for high-volume categories + Option C (dual-control, evidence-backed) for the long tail, all behind one `ResolutionSource` interface, gated by a proposed-result + challenge window. Keep Option B on the roadmap **if/when** the product goes on-chain or needs provable neutrality for real money.

## Trade-off Analysis

Hybrid maximizes coverage now without committing to chain infra. For any **money-bearing** auto-settle, require **≥2 corroborating sources** (or source + admin confirm); single-source auto-settle is acceptable only for play-money.

## Consequences

- **Easier:** broader category coverage; auditable, multi-source attestation.
- **Harder:** auto-settle is no longer instant (gains a proposal/challenge step — needed anyway for ADR-0004); more adapters + source-health monitoring to maintain.
- **Revisit:** decentralized oracle (Option B) at the real-money / on-chain stage.

## Action Items

1. [ ] Define a `ResolutionSource` interface (extend `internal/prediction/feed`) with `Propose(result, evidence)` semantics, registered per series.
2. [ ] Add adapters for the top non-crypto categories; store **source attestation evidence** (payload + digest) per proposal.
3. [ ] Require **corroboration** (≥2 sources, or source + admin) before auto-finalizing money-bearing markets.
4. [ ] Add **source-health monitoring + alerting**; auto-fallback to manual on source failure (don't silently stall).
5. [ ] **Dual-control** on manual resolve (proposer ≠ approver) in office.
6. [ ] Emit a **proposed-result** state instead of direct settle (handoff to ADR-0004).

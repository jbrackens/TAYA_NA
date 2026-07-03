# GAP-11 — Position / exposure limit — DESIGN NOTE / BLOCKED (protected core)

**Spec:** PAM §13 Responsible Gaming; §32 Scenario 6.
**Status:** BLOCKED — a correct pre-trade exposure cap requires a hook in the PROTECTED prediction order path. Per Absolute Guardrail #1, protected-core changes are design-note-only and human-review-gated (same posture as P0-7).

## Requirement
Cap a player's **open exposure** (the amount at risk across their open positions) so they cannot take on more market risk than a configured limit.

## Gap re-verification (2026-07-03, VERIFIED)
- Exposure is computed in the protected prediction domain: `internal/prediction/risk.go` (cost-basis vs max-returned-points semantics; `MarketExposure`, platform exposure = sum of resolving shares). This is the authoritative exposure math and it lives in protected code.
- The RG enforcement seam (`CheckBetAllowed(userID, stakeCents)`) receives only the **stake** of the incoming order — not the resulting position/exposure delta (which depends on side, price, quantity, and existing position, all computed in the protected matching/accounting path `internal/prediction/exchange.go` + `accounting.go`).
- Therefore a **true pre-trade exposure cap** ("current open exposure + this order's exposure delta ≤ limit") cannot be evaluated at the seam — it needs the order's would-be exposure, which only the protected order path can compute.

## Options
- **A — Partial current-exposure cap (read-only, buildable but weaker).** Read the player's CURRENT open exposure read-only (sum over `prediction_positions`), enforce in `CheckBetAllowed` (deny new orders once current exposure ≥ cap). Buildable without a protected-core edit, BUT: (i) it re-implements the cost-basis/max-return exposure semantics OUTSIDE `internal/prediction/risk.go`, risking divergence from the authoritative math (a compliance control that disagrees with the trading core is worse than none); (ii) it is a *lagging* cap — it blocks the order AFTER exposure already reached the cap, not the order that would breach it. Not recommended without explicit human acceptance of the approximation.
- **B — Proper pre-trade exposure cap (protected-core hook, RECOMMENDED disposition).** Add an exposure-limit check inside the protected order-placement path where the would-be exposure is already computed, consulting the per-player cap (stored in the gateway RG tables). Correct and precise, but it is a change to `internal/prediction/*` → protected core → design-note + human-reviewed phased build (like P0-7), NOT autonomous.

## Recommendation
**BLOCK** and route as a protected-core, human-reviewed change (Option B). The loss limit already gives GAP-11 a working amount-based RG control; the exposure cap is the one sub-limit that inherently needs the protected exposure math, so it should not be approximated outside the core autonomously. If the human prefers speed over precision, Option A (read-only current-exposure lagging cap) can be built in the compliance package with an explicit note that it approximates the protected exposure semantics.

## Unblock criteria (human decision)
1. Accept the **precise protected-core hook** (Option B, review-gated build in `internal/prediction`) — recommended; or
2. Accept the **read-only lagging approximation** (Option A, compliance-package build, explicitly documented as approximate and lagging); or
3. Descope the exposure limit for launch (loss + deposit + bet + session limits deemed sufficient), recorded against §13.

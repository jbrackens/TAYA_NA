# P0-6 (settlement half) — Four-Eyes on Settlement Finalize — DESIGN NOTE (BLOCKED, protected core)

**Status: BLOCKED — protected core.** The manual-adjustment half of P0-6 is
built autonomously (maker-checker on wallet adjustments ≥ threshold). The
settlement half changes `internal/prediction/settlement` and the settlement
finalize path, which are PROTECTED. Per the Absolute Guardrails, this half is
NOT implemented autonomously; this note is the design for a human-reviewed
build.

**Decision (2026-07-02):** settlement always requires four-eyes (an Approver
where configured), regardless of amount. Threshold applies only to manual
adjustments; settlement is unconditional.

## Where the control belongs

The settlement finalize path is the propose→challenge→finalize flow
(ADR-0003/0004). Today the AutoSettler proposes and finalizes after the
challenge window, and an admin can trigger settlement directly. The four-eyes
control gates the FINALIZE (money-moving) step, not the propose:

- A settlement proposed by actor A (admin or AutoSettler) must be finalized by
  a DIFFERENT admin B (`settlements:resolve` holder), B ≠ A.
- The AutoSettler path is the nuance: it has no human maker. Options below.

## Options

**(a) Human-finalize-only for four-eyes markets.** A per-market or global flag
`SETTLEMENT_FOUR_EYES` requires that finalize be performed by a human
`settlements:resolve` holder who is not the proposer. The AutoSettler may
propose but may not finalize when the flag is on — finalize waits for a human
checker. Safest; changes AutoSettler behavior (it currently finalizes).

**(b) Reuse the maker-checker store.** Model a settlement finalize as a
`pending_admin_actions` row (action_type `settlement_finalize`,
subject=marketID). The existing (adjustment) approve endpoint approves it, then
calls the settlement finalize. Keeps one approval surface; but wiring the
prediction settlement service to the http maker-checker layer crosses the
protected boundary and needs care to preserve idempotency (settlement is
already idempotent by settlementID; the approval must not double-finalize).

**(c) Dual-sign at the settlement service.** Add a `finalizedBy` +
`proposedBy` check inside the settlement service: finalize refuses when
`finalizedBy == proposedBy` unless an override flag. Most localized to the
domain, but it edits the protected settlement core directly.

## Recommendation

(a) as the enforcement model + (b) as the operator surface: a
`SETTLEMENT_FOUR_EYES` flag (default OFF, fail-safe — does not block launch)
that, when ON, routes finalize through the maker-checker approve surface so
settlement and adjustments share one four-eyes queue. Requires human review of:
the AutoSettler behavior change (it must stop finalizing when the flag is on,
without stalling settlement silently — a proposed-but-unfinalized market must
surface in the office), and the idempotency preservation (approve→finalize must
be safe under retry; the settlementID idempotency key is the anchor).

## Unblock criteria

A human confirms: (1) the enforcement model (a/b/c), (2) that the AutoSettler
finalize-behavior change may proceed under protected-core review, (3) the flag
default and per-market vs global scope. Then the settlement half is implemented
phase-by-phase with the diff reviewed before merge (protected core).

> **ARCHIVED 2026-09-06.** Historical record only — this does not describe the current system.
> Written on branch `pam/p0-modernization` (2026-07-02 → 2026-07-06); never merged. The reference
> implementation (345 commits, migrations 057–061) lives at tag `archive/pam-p0-modernization-2026-07-06`.
> Paths here are PRE-REBRAND (`apps/Phoenix-Predict-Combined/go-platform` = `apps/taptrade-platform/go-platform`;
> `talon-backoffice/packages/app` = `frontend/packages/office`) and units are pre-points ("cents", before
> migration 050). Commit hashes cited inside resolve only at that tag.
> For what of this main still lacks, see `docs/licensability-gaps.md`. See `CLAUDE.md` for current architecture.

# GAP-77 — Bonus turnover → trading wiring — DESIGN NOTE / BLOCKED

**Spec:** PAM §21 Bonuses & Rewards; §32 Scenario 14 (grant a bonus → turnover tracked as trading volume → on completion, convert to withdrawable/real balance with a ledger + audit trail).
**Status:** BLOCKED — needs (1) a wiring-design approval and (2) an explicit decision on whether the accrual hook may touch the protected trade/settlement path. This note is the design owed by the Blocked-Item Protocol. No code written.

## Requirement (§21 / §32-14)
A granted bonus carries a **turnover (wagering) requirement**: the player must trade some multiple of the bonus before it converts to real, withdrawable balance. Scenario 14 is the end-to-end: grant → **each qualifying trade advances the bonus's completed turnover** → when completed ≥ required, the bonus **converts** (bonus balance → real balance) with a ledger posting and an audit entry.

## Gap re-verification (2026-07-04, VERIFIED)
The machinery exists but is **unwired**:
- `wallet.RecordWageringContribution` (`internal/wallet/wagering.go:38`) — advances `player_bonuses.wagering_completed_cents` and, on completion, calls `ConvertBonusToReal`. **Zero production callers** (`grep` across `internal/**/*.go` minus tests = only its own definition at wagering.go:38 and a `NOTE` at bonus_ops.go:338 admitting the gate "is currently only exercised via RecordWageringContribution").
- `wallet.ConvertBonusToReal` (`internal/wallet/bonus_ops.go:295`) — atomically moves bonus→real. Only caller is `RecordWageringContribution` itself (wagering.go:140). So it too is dead from the live paths.
- `wagering_completed_cents` is written only at **grant** time (`internal/bonus/repository.go` INSERTs, initial 0). The **trade / order / settlement** paths never advance it.

**Consequence:** a granted bonus's turnover never accrues from real trading and never converts. Scenario 14 is **unreachable live**. (This also corrects a doc-drift: §36 "Bonus/rewards = Built/Pass" and `scenario-evidence.md` overclaim Scenario 14 — corrected to Partial/Built-not-wired in this firing.)

## Why this is BLOCKED, not an autonomous build
Two Absolute-Guardrail collisions:
1. **Protected core.** The natural accrual point is the trade-fill / order-settlement path, which lives in `internal/prediction/*` and `internal/wallet/*` — PROTECTED. Any change there follows the Blocked-Item Protocol (design note + BLOCK), never autonomous code.
2. **Balance-changing.** `ConvertBonusToReal` posts a **real-money ledger credit**. Wiring it live changes balances; it must post to the ledger (Guardrail #2) and cannot be rushed. The "what counts as turnover" and idempotency rules are compliance-load-bearing (double-count = free money; missed-count = players trapped under a requirement they've met).

## The core questions (for the human/compliance owner)
1. **Hook point.** Where does a qualifying trade signal turnover?
   - **Option A — post-trade HTTP seam (RECOMMENDED).** After `Service.PlaceOrder` returns a fill, an *unprotected* http-layer hook (sibling to the existing wallet-adapter bridge) calls `RecordWageringContribution` with the matched notional. Keeps the protected `internal/prediction` core untouched; the hook is additive and testable. Risk: must fire on exactly the fills that count, once each.
   - **Option B — inside settlement/trade core.** Accrue as part of the trade/settlement transaction (atomic with the fill). Strongest consistency, but edits PROTECTED code — requires explicit sign-off to touch the trade path.
2. **What volume counts?** Matched **notional** per fill (qty × price) is the natural unit for a prediction market. Confirm: matched notional only (not resting/unmatched), both taker and maker sides or taker only, and whether voided/refunded trades claw back accrued turnover.
3. **Per-trade idempotency.** Reuse the **order idempotency key** (`prediction_order:<key>`) as the wagering-contribution key so a retried/replayed fill can't double-count. `RecordWageringContribution` already takes an idempotency-scoped path — confirm the key derivation.
4. **Conversion trigger + posting.** On completed ≥ required: `ConvertBonusToReal` posts the bonus→real ledger credit (idempotency `bonus_convert:<bonusID>`), plus an append-only audit event (`bonus.converted`) with bonus id, amounts, and the triggering trade. Confirm the audit action name + whether partial conversions are allowed.
5. **Launch-safety.** Bonuses are a money-adjacent surface. Per the Two-Spec Precedence Rule, the conversion→real-balance path must be **feature-flag gated OFF in launch mode** (Tiangge §2/§19 prohibit redeemable value) with a test proving it's inert when the flag is off. Confirm the flag (reuse the bonus-engine enablement flag if one exists).

## If approved — implementation sketch (slices)
- **77-a (accrual, unprotected):** post-trade hook (Option A) → `RecordWageringContribution(matchedNotional, idemKey=orderKey)`; unit + race tests that a fill advances `wagering_completed_cents` exactly once and a replayed fill does not.
- **77-b (conversion + audit):** on completion, `ConvertBonusToReal` posts the ledger credit + `bonus.converted` audit; test the ledger row + audit entry + idempotency; test the launch-mode flag gates it OFF.
- **77-c (clawback, if required by Q2):** void/refund reverses accrued turnover.

## Unblock criteria
A human/compliance owner:
1. Approves the **hook point** (A vs B) — and if B, explicitly authorizes touching the protected trade path.
2. Confirms **what volume counts** (matched notional; taker-only vs both sides; void clawback y/n).
3. Confirms the **conversion audit action name**, partial-conversion policy, and the **launch-mode feature flag**.

Until those land, wiring a real-money conversion off a guessed turnover definition would be a balance-changing compliance guess, not a control — so GAP-77 stays BLOCKED. See DECISIONS_NEEDED.md D-BONUS-TURNOVER.

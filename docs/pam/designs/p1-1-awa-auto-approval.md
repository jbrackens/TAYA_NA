# P1-1 — AWA auto-approval WIRING — DESIGN NOTE / BLOCKED (⚑ compliance decision)

**Spec:** PAM §22 Payments, Deposits, and Withdrawals.
**Status:** The AWA decision **engine is BUILT** (`internal/alphacashier/awa.go`, commit `df307d88`, 22 tests, fail-closed). **WIRING it to actually auto-approve withdrawals is BLOCKED** pending a compliance decision, because it conflicts with an existing prod-mandatory control.

## The conflict (VERIFIED)
- `ALPHA_CASHIER_WITHDRAWAL_REVIEW_REQUIRED` defaults **true** and config validation **forbids `false` in production/staging** (`internal/alphacashier/config.go:90-91`).
- Preflight treats mandatory review as a **Stage-1 posture**: it passes `withdrawals.review_required` only when review is required ("withdrawal review must remain required for Stage 1", `preflight.go:108-112`).
- Today every withdrawal is created with status `"requested"` and waits for a **human** `ApproveWithdrawal`/`RejectWithdrawal` (`service.go:477,535,571`). `WithdrawalReviewNeeded` is not consulted in `CreateWithdrawalRequest` — it is satisfied trivially because *all* withdrawals are human-reviewed.
- ⇒ Making the AWA engine **auto-approve** (transition to `approved` without a human) would, in prod/staging, make some withdrawals NOT human-reviewed — **weakening the prod-mandatory Stage-1 review control**. Guardrail #8 forbids doing that autonomously.

## Decision needed
In production/staging, may the AWA engine **auto-approve** low-risk withdrawals (bypassing human review), or must every withdrawal retain human approval under the Stage-1 "withdrawal review required" posture?

## Options
- **A — Advisory / recommend mode (safe, no auto-approval).** At withdrawal creation, run `DecideAWA` and ANNOTATE the request with its recommendation (auto-eligible + reason, or needs-review + reason), surfaced to the reviewer to triage the queue. A human still approves every withdrawal. No compliance-default change; ships now, launch-safe. Does NOT deliver the "auto" in AWA — the engine informs, it does not decide.
- **B — True auto-approval behind an explicit prod acknowledgement (RECOMMENDED once compliance signs off).** AWA auto-approves within its strict limits ONLY when the operator sets a deliberate, documented ack (e.g. `ALPHA_CASHIER_AWA_AUTO_APPROVE_ACK=true`) AND the Stage-1 invariant is updated so that an audited, rules-based **automated review** counts as satisfying "withdrawal review required". Fail-closed default stays OFF (`AutoApproveEnabled=false` → all human review). Every auto-approval is audited with the exact rules snapshot that approved it (`cashier.withdrawal_auto_approved` {ruleset, reason}), and the broadcast two-person control (`TwoPersonWithdrawal`) is untouched — auto-approval only automates the *review* gate, never the payout broadcast.
- **C — Defer.** Keep all withdrawals human-reviewed; the engine stays built-but-unwired until the operator's licensing model is confirmed.

## Recommendation
**Option B, gated as described, once compliance/legal confirms the license permits rules-based auto-approval of low-risk withdrawals.** It is what P1-1 asks for and it can be built without weakening broadcast controls: the fail-closed default (OFF) means prod behaviour is unchanged until an operator deliberately acks in, strict per-withdrawal + daily + schedule + trigger limits bound the exposure, and every decision is audited. Until that sign-off, do NOT wire auto-approval. If the answer is "human review is always mandatory," Option A (advisory) is the terminal wiring.

## Unblock criteria
A compliance/legal decision: (1) may rules-based automated review satisfy the Stage-1 "withdrawal review required" posture in prod? If **yes** → implement Option B (auto-approve behind `..._AWA_AUTO_APPROVE_ACK`, update the Stage-1 invariant to accept AWA-automated review, audit each decision). If **no** → implement Option A (advisory annotation only). Either way, the engine (`awa.go`) is ready and the wiring is a bounded slice in `CreateWithdrawalRequest` (`internal/alphacashier`, non-protected) — the money-move itself stays on the existing capture/broadcast path.

## What is NOT blocked (buildable now, no auto-approval)
The office **withdrawals-queue admin UI** (list pending + approve/reject with reason, consuming the existing `/api/v1/admin/cashier/alpha/{withdrawals,withdrawals/{id}}` routes) and the **deposits view** are launch-safe and require no auto-approval decision — they surface the human-review workflow that already exists. These are the next P1-1 slices.

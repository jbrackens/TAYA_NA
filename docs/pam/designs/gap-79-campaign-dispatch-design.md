# GAP-79 — Segmentation campaign DISPATCH (send) — DESIGN NOTE / BLOCKED

**Spec:** PAM §21 Segmentation & Campaigns; §32 Scenario 13; §28 Privacy (consent/opt-out).
**Status:** BLOCKED — needs (1) a channel decision, (2) a marketing consent/opt-out model, and (3) a throttle/batch policy. This note is the design owed by the Blocked-Item Protocol. No code written.

## Requirement (§21 / §32-13)
Define a segment (tags + query), create a campaign, and **dispatch** it to the segment's members through a channel (email/SMS/push/in-app), fail-closed in launch mode.

## Gap re-verification (2026-07-04, Termination pass B, VERIFIED)
The targeting + persistence + launch-mode gate are built and wired; the **send** is a stub:
- `registerSegmentationCampaignRoutes` (`internal/http/segmentation_admin_handlers.go:52`) wires `/api/v1/admin/segments/campaigns/…`; the `execute` action (:377) is gated `gate.GetBool(ctx,"crm.campaign_dispatch_enabled",false)` → **403 by default** (fail-closed, proven by `TestSegmentationCampaignExecuteFailsClosedWhenDisabled`).
- When the flag is enabled, the handler returns **`501 "campaign dispatch worker is not yet wired"`** (:390-393, proven by `TestSegmentationCampaignExecuteNotImplementedWhenEnabled`). There is **no send call chain**: `grep` of the handler for `notify.`/`Dispatch`/`Send` = none; `grep` of the whole tree for a worker reading `crm_campaigns` = none. `segmentation.Store` only persists/previews definitions (`PreviewCampaign` counts targets via `RunQuery`; it does not send).
- **Consequence:** the §36 "Segmentation & CRM = Built/Pass" row **overclaims** — dispatch does nothing. Corrected to Partial in this firing (mirroring the GAP-77 bonus correction). Targeting, campaign CRUD, preview, and the fail-closed launch gate remain genuinely built.

## Why this is BLOCKED, not an autonomous build
Three open decisions, one of them a compliance control:
1. **Channel.** Only email has a wired transport (`internal/notify`). SMS / push / in-app are **vendor-BLOCKED (GAP-42)**. So a dispatch built today is email-only; confirm that is acceptable, or that dispatch waits on GAP-42.
2. **Consent / opt-out (COMPLIANCE — the load-bearing blocker).** Bulk *marketing* communication must honor per-recipient marketing consent / unsubscribe (§28 privacy; CAN-SPAM / GDPR-class obligations). Today only a **loyalty opt-out** exists (Scenario 18 is otherwise Fail/BLOCKED — P2-3 DSAR/retention rides legal). There is no general marketing-consent surface. Mass-sending to a whole segment **without an enforced opt-out is a compliance risk**, not a feature gap — so it must not be built until the consent model is decided. This ties GAP-79 to the BLOCKED privacy work (P2-3, legal).
3. **Throttle / batch policy.** A segment send is an N-recipient fan-out at the mail relay — the same abuse/deliverability class as GAP-75 (single-send rate limit) but at scale. Needs a per-run batch size + inter-send throttle + per-recipient idempotency (so a retried run never double-sends) + an audit event (`campaign.dispatched` with campaign id, segment size, channel).

Building any of this off a guessed consent model would be a compliance guess, not a control — the loop's "compliance posture outranks feature breadth" says BLOCK.

## If approved — implementation sketch (slices)
- **79-a (consent surface, prerequisite):** a per-user marketing-communication preference (opt-in/opt-out) + the query that excludes opted-out users from a campaign's target set. Rides the P2-3 privacy decision.
- **79-b (email dispatch worker):** on `execute` (flag ON), enqueue/iterate the (consent-filtered) segment, send via `notify` in throttled batches with a per-(campaign,user) idempotency key, record per-recipient status, audit `campaign.dispatched`. Launch-safety test: with the flag OFF the route still 403s (already proven); add a test that dispatch skips opted-out users.
- **79-c (other channels):** only once GAP-42 provides SMS/push/in-app transports.

## Unblock criteria
A human/compliance owner:
1. Confirms **email-only now** (vs waiting on GAP-42 for other channels).
2. Approves the **marketing consent/opt-out model** (how consent is captured, default state, and that dispatch MUST exclude opted-out users) — coordinated with the P2-3 privacy decision.
3. Confirms the **batch size + throttle** and the `campaign.dispatched` audit shape.

Until those land, GAP-79 stays BLOCKED. The fail-closed 403 launch gate + the honest 501 stub mean nothing is silently half-sending in the meantime. See DECISIONS_NEEDED.md D-CAMPAIGN-DISPATCH.

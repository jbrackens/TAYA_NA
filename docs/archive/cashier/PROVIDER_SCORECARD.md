> **ARCHIVED 2026-09-06.** Historical record only — this does not describe the current system.
> A blank scorecard for a provider selection that never took place.
> See `CLAUDE.md` for current architecture.

# Provider Scorecard

**Status:** SUPERSEDED 2026-09-06 — abandoned workstream (was: "Template.").
**Date:** 2026-05-25.

Use one scorecard per provider/route. Scores are 0-3.

| Criterion | Weight | Score | Evidence |
|---|---:|---:|---|
| Passive TRC-20 USDT address or equivalent one-step send UX | 5 |  |  |
| Deterministic user/request attribution | 5 |  |  |
| Source tx and destination tx exposed | 5 |  |  |
| Signed callback support | 5 |  |  |
| Duplicate callback/poll replay safety | 4 |  |  |
| Quote expiry and child-route semantics | 4 |  |  |
| CEX-origin safe recovery/refund behavior | 4 |  |  |
| Wrong token/wrong chain recovery tooling | 4 |  |  |
| Minimum deposit and fee clarity | 3 |  |  |
| Provider status API/reindex tooling | 3 |  |  |
| SEA user path quality | 3 |  |  |
| Compliance/sanctions integration surface | 3 |  |  |
| Operational support/SLA | 2 |  |  |
| Vendor lock-in and portability | 2 |  |  |

## Hard Fails

- Requires Maria to understand multi-step bridge signing for the default V1 flow.
- Cannot provide deterministic source and destination transaction attribution.
- Cannot safely handle duplicate callbacks or polling replays.
- Auto-refunds to CEX sender addresses without ownership proof.
- Cannot provide signed callbacks or equivalent authenticated status evidence.

## Decision

- Provider:
- Route:
- Total weighted score:
- Pass/fail:
- Required follow-ups:

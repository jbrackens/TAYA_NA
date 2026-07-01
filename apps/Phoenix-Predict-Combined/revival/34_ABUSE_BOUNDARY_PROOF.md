# Abuse Boundary Proof (2026-07-01)

Command: `make qa-abuse-boundary`

- Result: **pass**
- Artifact: `/Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict/apps/Phoenix-Predict-Combined/revival/artifacts/abuse_boundary_20260701_080532.md`

## Scope

1. Reward cluster migration ownership for persistent hashed abuse-control state.
2. Social write limiter migration ownership for persistent shared token-bucket state.
3. DB-backed multi-instance reward-cluster blocking through two wallet service instances sharing one Postgres store.
4. DB-backed multi-instance social graph persistence and idempotency for comments, reactions, reports, follows, profiles, and activity.
5. DB-backed cross-instance social write limiter blocking for same-user and same-IP comment bursts across separate route instances.
6. Device-cluster daily-claim blocking for a second account, while allowing same-user idempotent retry.
7. Route-restart persistence of hashed reward-cluster evidence.
8. Admin reward-cluster review/export with hashed signals, sorted user IDs, PTS units, and no raw device IDs.
9. IP-cluster point-pack blocking for a second account.
10. Social write rate limits for same-user comment bursts.
11. Same-IP multi-account throttles for comments, reports, reactions, and follows.

## Gate Policy

1. Blocked reward claims must not write point-ledger rows.
2. Abuse-control evidence must remain outside the point ledger and expose hashed review data only.
3. Blocked social writes must not persist the blocked comment, report, reaction, or follow.
4. DB-backed reward-cluster proof must block across separate service instances, not only across one in-memory router.
5. DB-backed social graph proof must preserve shared state across separate store instances.
6. DB-backed social write limiter proof must block same-user and same-IP bursts across separate route instances, not only one in-memory router.
7. This proof strengthens Scenario 12 but does not replace the deployed-like authenticated canonical journey.

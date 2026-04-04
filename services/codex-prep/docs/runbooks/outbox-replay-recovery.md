# Outbox Replay and Recovery Runbook

## Purpose

Recover from delayed or failed publication from `event_outbox` without losing
durability or replay safety.

## Operating model

- Stateful services write business state and outbox rows in one database
  transaction.
- Publication is performed by the standalone `phoenix-outbox-worker`.
- Normal recovery is to restart or scale the worker, not to mutate outbox rows
  manually.

## Diagnosis

1. Check unpublished row count:

```sql
select count(*) from event_outbox where published_at is null;
```

2. Check backlog by topic:

```sql
select topic, count(*) as pending
from event_outbox
where published_at is null
group by topic
order by pending desc;
```

3. Confirm Kafka availability before replay:
   - brokers reachable
   - target topics exist

## Recovery sequence

1. Ensure service-local publishers are disabled in deployment config:
   - `OUTBOX_ENABLED=false` on HTTP services unless intentionally combined
2. Scale or restart the standalone worker.
3. Watch worker logs for publish errors and retry progression.
4. Re-run backlog SQL until unpublished rows drain.

## When not to do manual edits

Do not manually set `published_at` unless:
- the event was independently confirmed as published
- the duplicate-publish risk is understood
- the change is recorded in the incident notes

## Controlled replay

If the worker needs to be restarted from a clean point:

1. stop the worker
2. confirm Kafka is healthy
3. start one worker replica
4. let the backlog drain
5. scale back to steady-state count

## Exit criteria

- unpublished outbox backlog returns to expected baseline
- Kafka consumers recover downstream state
- incident notes include root cause and affected topics

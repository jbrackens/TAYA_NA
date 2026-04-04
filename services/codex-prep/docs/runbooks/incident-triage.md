# Incident Triage Runbook

## Scope

Use this for live failures involving request errors, service unavailability,
outbox lag, or Kafka-backed propagation delays.

## First 10 minutes

1. Confirm scope:
   - which route
   - which service
   - first seen time
   - whether the failure is hard down or degraded
2. Check ingress/gateway first:
   - gateway health `/health`
   - gateway readiness `/ready`
   - recent gateway logs
3. Check infrastructure:
   - PostgreSQL reachable
   - Redis reachable
   - Kafka reachable
4. Check the target service:
   - `/health`
   - `/ready`
   - deployment rollout status

## Quick fault isolation

### 4xx at gateway

Likely causes:
- auth/role failure
- route contract mismatch
- service validation error forwarded through proxy

Actions:
- reproduce request directly against downstream service
- compare JWT role claims with service expectations
- check recent API contract changes

### 5xx or 502 at gateway

Likely causes:
- downstream service unavailable
- service startup failure
- network/service DNS issue

Actions:
- inspect deployment events
- inspect pod logs
- verify service endpoints exist

### Event propagation delay

Likely causes:
- outbox backlog
- Kafka unavailable
- worker stalled

Actions:
- inspect `event_outbox` unpublished row count
- inspect outbox worker logs
- verify Kafka topic health

## SQL checks

### Outbox backlog

```sql
select topic, count(*) as pending
from event_outbox
where published_at is null
group by topic
order by pending desc;
```

### Old unpublished rows

```sql
select id, topic, created_at
from event_outbox
where published_at is null
order by created_at asc
limit 50;
```

## Escalation thresholds

Escalate immediately if:
- settlement or wallet writes are failing
- reconciliation data is inconsistent
- Kafka is down and outbox backlog is growing
- user auth is degraded across multiple services

## Recovery priorities

1. restore write safety
2. restore gateway availability
3. restore event propagation
4. reconcile delayed side effects

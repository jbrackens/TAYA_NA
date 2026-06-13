# Rollback Runbook

## Principle

Rollback code and deployment state first. Do not roll back database schema
destructively during an incident unless a forward-fix is impossible and the data
impact is understood.

## Deployment rollback

### Kubernetes

1. Identify failing deployment and current image tag.
2. Roll back to previous ReplicaSet:
   - `kubectl rollout undo deployment/<service> -n <namespace>`
3. Confirm:
   - `kubectl rollout status deployment/<service> -n <namespace>`
4. Verify:
   - `/health`
   - `/ready`
   - gateway request path

### Image-tag rollback

If using kustomize/image tags:
1. revert the overlay tag change
2. rebuild rendered manifests
3. apply the previous known-good version

## Database rollback policy

- Prefer forward fixes.
- Do not delete event-store or outbox rows to “undo” behavior.
- If a migration is unsafe, stop rollout and restore the last known-good app
  version against the current schema if compatible.

## Service order

Rollback in this order when cross-service issues exist:
1. gateway
2. user
3. wallet
4. market-engine
5. betting-engine
6. settlement
7. outbox worker
8. remaining supporting services

## Exit criteria

- failed customer-facing route is healthy again
- outbox backlog is stable
- no write-path corruption remains
- incident record captures:
  - rolled-back services
  - image tags
  - commands used
  - follow-up fix owner

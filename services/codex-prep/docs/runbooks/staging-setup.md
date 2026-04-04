# Staging Setup Runbook

## Purpose

Stand up a real staging environment for the Phoenix Go microservices platform on
Kubernetes using the manifests already present in this repo.

This runbook assumes:

- you already have a Kubernetes cluster
- you have `kubectl` access to that cluster
- you want to deploy the existing staging overlay at:
  `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/deploy/k8s/overlays/staging`

If you do **not** already have a cluster, stop here. The cluster itself must be
provisioned first. This runbook starts at the point where a cluster exists and
you can authenticate to it.

## What this repo expects

The staging overlay expects:

- namespace: `phoenix-platform-staging`
- one shared config map: `phoenix-platform-config`
- one shared secret: `phoenix-platform-secrets`
- 15 deployable images:
  - 14 HTTP services
  - 1 standalone outbox worker

The overlay sets staging replica counts and image tags, and the base manifests
wire all services together through in-cluster DNS names.

## Prerequisites

Install locally:

- `kubectl`
- `docker`
- `go`

Optional but strongly recommended:

- `k9s`
- `helm`

Verify:

```bash
kubectl version --client
docker --version
go version
```

## Step 1: Confirm Kubernetes access

Check that you have a real staging context:

```bash
kubectl config get-contexts
kubectl config current-context
```

Switch if needed:

```bash
kubectl config use-context <your-staging-context>
```

Then verify connectivity:

```bash
kubectl cluster-info
kubectl get nodes
```

Do not continue until these commands work.

## Step 2: Create the staging namespace

The overlay uses `phoenix-platform-staging`.

```bash
kubectl create namespace phoenix-platform-staging
kubectl get namespace phoenix-platform-staging
```

## Step 3: Decide how staging reaches infrastructure

You need working endpoints for:

- PostgreSQL
- Redis
- Kafka

You must know:

- PostgreSQL connection string
- Redis host:port and password
- Kafka brokers list

## Step 4: Prepare staging secrets

Use the example file:

- `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/deploy/k8s/base/secrets.example.yaml`

Copy it:

```bash
cp /Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/deploy/k8s/base/secrets.example.yaml \
  /Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/deploy/k8s/base/secrets.staging.yaml
```

Fill in real values for:

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_SECRET_KEY`
- `REDIS_PASSWORD`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `EMAIL_FROM`

Apply it:

```bash
kubectl apply -n phoenix-platform-staging -f /Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/deploy/k8s/base/secrets.staging.yaml
kubectl get secret phoenix-platform-secrets -n phoenix-platform-staging
```

## Step 5: Decide whether GHCR access is public or private

The manifests use:

- `ghcr.io/philcali-phoenix/<service>:staging`

If the images are private, create an image pull secret:

```bash
kubectl create secret docker-registry ghcr-creds \
  --namespace phoenix-platform-staging \
  --docker-server=ghcr.io \
  --docker-username=<github-username> \
  --docker-password=<github-token> \
  --docker-email=<email>
```

If images are public, skip this.

## Step 6: Verify staging image tags exist

The staging overlay points to `:staging` tags in:

- `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/deploy/k8s/overlays/staging/kustomization.yaml`

If you want immutable tags instead, update them before deploy using:

- `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/scripts/release/promote_overlay_tags.sh`

## Step 7: Render the staging overlay first

```bash
kubectl kustomize /Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/deploy/k8s/overlays/staging
```

Or:

```bash
/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/scripts/validate_k8s_overlays.sh
```

## Step 8: Review staging config

Current staging patch:

- `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/deploy/k8s/overlays/staging/config.patch.yaml`

It currently sets:

- `ENVIRONMENT=staging`
- `LOG_LEVEL=info`
- `OUTBOX_ENABLED=true`
- `OUTBOX_POLL_INTERVAL=750ms`
- `OUTBOX_BATCH_SIZE=150`

## Step 9: Apply the staging overlay

```bash
kubectl apply -k /Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/deploy/k8s/overlays/staging
kubectl get all -n phoenix-platform-staging
```

## Step 10: Wait for rollouts

```bash
kubectl rollout status deployment/phoenix-gateway -n phoenix-platform-staging
kubectl rollout status deployment/phoenix-user -n phoenix-platform-staging
kubectl rollout status deployment/phoenix-wallet -n phoenix-platform-staging
kubectl rollout status deployment/phoenix-market-engine -n phoenix-platform-staging
kubectl rollout status deployment/phoenix-betting-engine -n phoenix-platform-staging
kubectl rollout status deployment/phoenix-settlement -n phoenix-platform-staging
kubectl rollout status deployment/phoenix-outbox-worker -n phoenix-platform-staging
```

If any rollout stalls:

```bash
kubectl get pods -n phoenix-platform-staging
kubectl describe pod <pod-name> -n phoenix-platform-staging
kubectl logs <pod-name> -n phoenix-platform-staging --all-containers
```

## Step 11: Verify health and readiness

If there is no ingress yet, port-forward the gateway:

```bash
kubectl port-forward -n phoenix-platform-staging svc/phoenix-gateway 18080:8080
```

Then:

```bash
curl -I http://127.0.0.1:18080/health
curl -I http://127.0.0.1:18080/ready
```

## Step 12: Run staging smoke checks

Use:

- `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/docs/release-checklist.md`

Minimum smoke flow:

1. user registration/login
2. wallet create/deposit
3. event creation
4. market creation
5. bet placement
6. settlement batch
7. reconciliation
8. CMS/content routes
9. notification preferences
10. outbox worker drains backlog

## Step 13: Verify the outbox worker

```bash
kubectl get deployment phoenix-outbox-worker -n phoenix-platform-staging
kubectl logs deployment/phoenix-outbox-worker -n phoenix-platform-staging
```

You want:

- successful polling
- successful publishes
- no growing backlog

## Step 14: Check backlog and errors

If you have DB access:

```sql
SELECT topic, status, COUNT(*)
FROM event_outbox
GROUP BY topic, status
ORDER BY topic, status;
```

Also inspect:

```bash
kubectl logs deployment/phoenix-gateway -n phoenix-platform-staging
kubectl logs deployment/phoenix-wallet -n phoenix-platform-staging
kubectl logs deployment/phoenix-betting-engine -n phoenix-platform-staging
kubectl logs deployment/phoenix-settlement -n phoenix-platform-staging
```

## Step 15: Record the rehearsal result

Record:

- context name
- namespace
- image tags deployed
- secret/config source used
- smoke tests passed/failed
- rollback image tags

Current blocker/status file:

- `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/docs/runbooks/staging-rehearsal-status-2026-03-10.md`

## First-time operator checklist

1. get working `kubectl` access
2. create the namespace
3. fill real staging secrets
4. confirm image tags exist
5. render the overlay
6. apply the overlay
7. wait for rollouts
8. port-forward the gateway
9. run smoke checks
10. inspect logs and outbox worker

## Common failure modes

### `ImagePullBackOff`

Cause:

- image tag missing
- GHCR auth missing

### `CrashLoopBackOff`

Cause:

- bad `DATABASE_URL`
- bad `REDIS_PASSWORD`
- bad `KAFKA_BROKERS`
- missing JWT secrets

### Gateway healthy, downstream routes fail

Cause:

- downstream services not ready
- wrong in-cluster URLs

### Outbox worker healthy but backlog grows

Cause:

- Kafka unreachable
- topic auth/config problem

## Fastest path

```bash
kubectl config use-context <staging-context>
kubectl create namespace phoenix-platform-staging
kubectl apply -n phoenix-platform-staging -f /Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/deploy/k8s/base/secrets.staging.yaml
kubectl kustomize /Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/deploy/k8s/overlays/staging > /tmp/phoenix-staging.yaml
kubectl apply -f /tmp/phoenix-staging.yaml
kubectl rollout status deployment/phoenix-gateway -n phoenix-platform-staging
kubectl port-forward -n phoenix-platform-staging svc/phoenix-gateway 18080:8080
curl -I http://127.0.0.1:18080/health
curl -I http://127.0.0.1:18080/ready
```

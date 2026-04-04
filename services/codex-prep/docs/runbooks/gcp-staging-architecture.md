# GCP Staging Architecture

## Purpose

Define the exact staging environment design for Phoenix if you want to use:

- Supabase for PostgreSQL
- Google Cloud instead of Hetzner

This runbook is specific to the current Phoenix platform repo and manifests.

## Important reality first

Using the **always-free** Google Cloud tier is **not enough** to run this full
platform as a true staging environment.

Reason:

- the Compute Engine always-free offer is only one `e2-micro` VM in certain US
  regions
- GKE free tier only waives **cluster management** fees for one zonal or
  Autopilot cluster; it does **not** make node compute free
- this platform needs many services, Redis, Kafka, and an outbox worker

So there are only two realistic GCP paths:

1. use the **$300 trial credits** to stand up a real staging cluster for 90
   days
2. use GCP as a **low-cost** staging environment after trial credits end

If you mean “zero-cost forever staging,” Google Cloud free tier is not a real
fit for this platform.

## Recommended architecture

### Use Supabase for

- PostgreSQL only

Use:

- Supabase Session Pooler connection string

### Use Google Cloud for

- Kubernetes cluster
- Redis
- Kafka-compatible broker
- ingress/load balancer
- container runtime
- logs and operations

## Best deployment model on GCP

For first-time staging, use:

- **GKE Standard zonal cluster**
- small node pool
- Redis in-cluster
- Kafka-compatible broker in-cluster
- Supabase external Postgres

Reason:

- it matches the current Kubernetes manifests better than moving everything to
  serverless products
- it is easier to reason about than Cloud Run for 14+ interconnected services
- the existing repo already assumes Kubernetes deployments and in-cluster
  service discovery

## Why not Autopilot first

Autopilot is cleaner operationally, but for this platform:

- Redis and Kafka stateful workloads complicate first-time Autopilot staging
- existing manifests are more naturally aligned with standard deployment
  assumptions

You can still use Autopilot later, but Standard is the safer first path.

## Minimum viable GCP staging design

### GCP components

- 1 GCP project dedicated to staging
- 1 zonal GKE Standard cluster
- 1 small node pool
- 1 external HTTP(S) entry path to gateway
- 1 Artifact/registry path for images or GHCR access

### External dependency

- Supabase Postgres

### In-cluster dependencies

- Redis
- Kafka-compatible broker
- all Phoenix app services
- standalone outbox worker

## Suggested first cluster shape

### Cluster

- GKE Standard
- zonal
- one zone only for staging

### Node pool

Start with:

- 2 nodes
- `e2-standard-4` if using trial credits and wanting fewer surprises

If you want to push cost down harder:

- `e2-standard-2`

I do **not** recommend trying to run this platform on always-free
`e2-micro`-class infrastructure. It is the wrong scale.

## What still has to be built

To make staging real on GCP, you need:

1. GCP project
2. billing enabled
3. GKE API enabled
4. GKE cluster
5. kube access on your machine
6. Redis deployment
7. Kafka deployment
8. secrets for Phoenix
9. image publishing/access
10. deployment of the staging overlay

## Exact build order

### Phase A: GCP project and billing

1. Create a dedicated GCP project for staging
2. Enable billing
3. If this is a new account, confirm whether you are inside:
   - free trial credits
   - or normal paid billing

### Phase B: Enable required APIs

Enable at minimum:

- Kubernetes Engine API
- Compute Engine API
- Cloud Resource Manager API
- IAM API
- Secret Manager API if you want to use it

## Phase C: Build the cluster

Create:

- one GKE Standard zonal cluster
- one node pool

Minimum target outcome:

- `kubectl get nodes` works from your machine

## Phase D: Decide image strategy

You already have manifests pointing at:

- `ghcr.io/philcali-phoenix/<service>:staging`

You have two choices:

### Option 1: Keep GHCR

Pros:

- least manifest churn

Cons:

- if images are private, you need Kubernetes image pull secrets

### Option 2: Move to Artifact Registry

Pros:

- tighter GCP-native auth and deployment flow

Cons:

- you must update image references in overlays

For fastest staging, keep **GHCR** first.

## Phase E: Deploy Redis and Kafka

This repo expects in-cluster names:

- `redis:6379`
- `kafka:9092`

That means your GCP cluster must contain services with those names or you must
change the config map/overlay values.

Recommended for first pass:

- Redis Helm chart or plain deployment/service
- Redpanda or Kafka KRaft Helm chart

Strictest path for repo consistency:

- Kafka KRaft

Simpler ops path:

- Redpanda

## Phase F: Prepare the Phoenix secret

Source template:

- `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/deploy/k8s/base/secrets.example.yaml`

You need real values for:

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_SECRET_KEY`
- `REDIS_PASSWORD`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `EMAIL_FROM`

If you want GCP-native secret management:

- store these in Secret Manager
- sync them into Kubernetes secrets

If you want fastest first staging:

- create `phoenix-platform-secrets` directly in Kubernetes

## Phase G: Render and deploy the app

Use the existing staging overlay:

- `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/deploy/k8s/overlays/staging`

Sequence:

1. validate overlay render
2. apply secrets
3. apply overlay
4. wait for rollout
5. verify gateway health
6. run smoke checks

## Phase H: Access path

You have two choices:

### Choice 1: Port-forward first

Best for first-time bring-up.

Use:

- `kubectl port-forward svc/phoenix-gateway 18080:8080`

### Choice 2: Real ingress

Use after the workloads are already healthy:

- GKE ingress or Gateway API
- DNS record
- TLS

Do not start with ingress if this is your first cluster.

## Recommended first-time GCP plan

### The simplest path that actually works

1. create GCP project
2. enable billing
3. create GKE Standard zonal cluster
4. connect `kubectl`
5. deploy Redis
6. deploy Kafka
7. create `phoenix-platform-secrets`
8. apply Phoenix staging overlay
9. port-forward gateway
10. run smoke tests

## What AI agents should build

### Agent 1: GCP project + cluster

Deliver:

- project created
- APIs enabled
- GKE cluster created
- kubeconfig usable locally

### Agent 2: Infra services

Deliver:

- Redis deployed
- Kafka/Redpanda deployed
- service names aligned with Phoenix config

### Agent 3: Registry/images

Deliver:

- verify `:staging` images exist
- or push them
- create image pull secret if GHCR is private

### Agent 4: App secrets and deploy

Deliver:

- real `phoenix-platform-secrets`
- staging overlay render validated
- staging overlay applied
- rollouts green

### Agent 5: Rehearsal

Deliver:

- `/health` and `/ready` green
- registration/login
- wallet create/deposit
- market create
- bet placement
- settlement
- reconciliation
- outbox worker backlog check

## Definition of done

Staging is only truly ready when:

1. `kubectl get nodes` works
2. all critical deployments are healthy
3. gateway `/health` and `/ready` return `200`
4. smoke checks pass
5. outbox worker drains backlog
6. rehearsal result is recorded

## Fastest honest answer

If you want me to be blunt:

- Google Cloud free **tier** alone is not enough
- Google Cloud free **trial credits** are enough to build the first real staging
  environment

So the correct framing is:

- **Use GCP trial credits for staging bootstrap**
- not “use always-free GCP for the full platform”

## Related docs

- `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/docs/runbooks/staging-setup.md`
- `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/docs/release-checklist.md`
- `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/docs/runbooks/staging-rehearsal-status-2026-03-10.md`

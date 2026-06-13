# Hetzner + Supabase Staging Architecture

## Purpose

Explain exactly what is missing to build a real Phoenix staging environment when
you currently have:

- Supabase
- Hetzner servers

This is the concrete build plan that fits the current Phoenix Go platform repo.

It is not a generic cloud architecture note. It is the missing environment
design for this codebase.

## Direct answer

Supabase and Hetzner are enough to build staging, but only if you add the
missing runtime layers:

1. a Kubernetes cluster on Hetzner
2. Redis
3. Kafka-compatible broker
4. container image publishing/access
5. Kubernetes secrets/config
6. a repeatable deployment path

Supabase can cover PostgreSQL only.

It does **not** replace:

- Redis
- Kafka
- Kubernetes
- image registry
- deployment secrets

## Recommended staging architecture

### Use Supabase for

- PostgreSQL only

Recommended connection method:

- Supabase **Session Pooler** connection string over IPv4

Reason:

- this platform runs long-lived backend services
- Supabase documents that Session mode is the right option for persistent
  backends when IPv4 is required
- it avoids forcing IPv6 as a prerequisite on day one

## Use Hetzner for

- Kubernetes nodes
- private networking
- load balancer
- optional persistent volumes

## Use GitHub Container Registry for

- service images
- current manifests already point at:
  - `ghcr.io/philcali-phoenix/<service>:staging`

## Run inside Kubernetes

- all Phoenix Go services
- standalone outbox worker
- Redis
- Kafka-compatible broker

## Recommended first staging topology

Use this first. It is the simplest version that still looks like a real staged
environment:

### Kubernetes layer

- `k3s`
- 3 Hetzner Cloud VMs
- Ubuntu 24.04
- x86_64 / AMD64 nodes

Suggested node shape:

- `cp1`: control plane, 4 vCPU, 8 GB RAM
- `worker1`: 4 vCPU, 8 GB RAM
- `worker2`: 4 vCPU, 8 GB RAM

Reason:

- staging does not need a large cluster
- 3 nodes gives you real scheduling behavior and avoids single-node fake staging
- AMD64 avoids surprise image-architecture problems

### Networking layer

- 1 Hetzner private network shared by all nodes
- 1 Hetzner load balancer in front of the gateway/ingress path
- firewall rules limited to:
  - SSH from your IP
  - 80/443 from the internet only if you expose ingress
  - Kubernetes/API access from admin IPs only

### Data/runtime layer

- Supabase Postgres: external
- Redis: in-cluster
- Kafka-compatible broker: in-cluster

## Why Redis and Kafka should be inside the cluster first

You only have Supabase and Hetzner today.

The fastest staging path is:

- Supabase for database
- Redis and Kafka running in Kubernetes on Hetzner

That avoids introducing more vendors before the platform is proven in staging.

## Kafka choice

You have two acceptable staging options:

### Option A: Kafka KRaft

Closest to repo expectations and current compose stack.

Use if:

- you want staging to look closer to production

### Option B: Redpanda

Operationally simpler Kafka-compatible broker.

Use if:

- you want easier first-time staging ops
- you are comfortable with Kafka API compatibility instead of exact Kafka

For strict consistency with the current repo and docs, choose **Kafka KRaft**.

## What you need to provision

### From Supabase

You need:

- the project database password
- the Session Pooler connection string
- SSL enabled

What you will put into Kubernetes:

- `DATABASE_URL=postgres://...pooler.supabase.com:5432/postgres?...`

Do **not** use transaction-mode pooling for these services.

## From Hetzner

You need:

- a Hetzner Cloud project
- 3 cloud servers
- 1 private network
- optionally 1 load balancer
- API token if you want Kubernetes automation for volumes/LB integration

## Inside Kubernetes

You need namespaces:

- `phoenix-platform-staging`
- optional: `infra`

You need deployed:

- ingress controller or port-forward only during first smoke tests
- Redis
- Kafka
- all Phoenix services
- outbox worker

## The exact build order

### Phase A: Build the cluster

1. Create 3 Hetzner Cloud VMs
2. Put them all on one private network
3. Install `k3s`
4. Join the worker nodes to the control plane
5. Confirm:
   - `kubectl get nodes`

### Phase B: Add cloud integrations

Install:

- Hetzner Cloud Controller Manager
- Hetzner CSI driver

Reason:

- lets Kubernetes create/use Hetzner load balancers and volumes cleanly

You do not strictly need both on minute one if you only port-forward, but you
do want them before calling staging complete.

## Phase C: Add infra services

Deploy into Kubernetes:

1. Redis
2. Kafka KRaft or Redpanda

Recommended target service names:

- `redis`
- `kafka`

Reason:

- the current base config already expects:
  - `REDIS_ADDR=redis:6379`
  - `KAFKA_BROKERS=kafka:9092`

If you use different chart-generated service names, you must update the staging
config patch or base config.

## Phase D: Publish images

Before deploy, ensure these exist:

- `ghcr.io/philcali-phoenix/phoenix-gateway:staging`
- `ghcr.io/philcali-phoenix/phoenix-user:staging`
- `ghcr.io/philcali-phoenix/phoenix-wallet:staging`
- `ghcr.io/philcali-phoenix/phoenix-market-engine:staging`
- `ghcr.io/philcali-phoenix/phoenix-betting-engine:staging`
- `ghcr.io/philcali-phoenix/phoenix-events:staging`
- `ghcr.io/philcali-phoenix/phoenix-retention:staging`
- `ghcr.io/philcali-phoenix/phoenix-social:staging`
- `ghcr.io/philcali-phoenix/phoenix-compliance:staging`
- `ghcr.io/philcali-phoenix/phoenix-analytics:staging`
- `ghcr.io/philcali-phoenix/phoenix-settlement:staging`
- `ghcr.io/philcali-phoenix/phoenix-notification:staging`
- `ghcr.io/philcali-phoenix/phoenix-cms:staging`
- `ghcr.io/philcali-phoenix/stella-engagement:staging`
- `ghcr.io/philcali-phoenix/phoenix-outbox-worker:staging`

If GHCR is private:

- create a Kubernetes image pull secret
- wire it into the workloads

## Phase E: Build the app config

You need one real Kubernetes secret:

- `phoenix-platform-secrets`

Source template:

- `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/deploy/k8s/base/secrets.example.yaml`

Minimum values:

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_SECRET_KEY`
- `REDIS_PASSWORD`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `EMAIL_FROM`

You also need the staging config patch reviewed:

- `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/deploy/k8s/overlays/staging/config.patch.yaml`

## Phase F: Deploy the app

Use:

- `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/deploy/k8s/overlays/staging`

Sequence:

1. render overlay
2. apply secret
3. apply staging overlay
4. wait for rollouts
5. verify gateway
6. verify user/wallet/betting/settlement
7. verify outbox worker drains

## Phase G: Decide ingress strategy

You have two acceptable paths:

### Path 1: No public ingress at first

Use:

- `kubectl port-forward svc/phoenix-gateway 18080:8080`

Use this for first smoke tests.

This is the lowest-risk path for first-time staging.

### Path 2: Real public staging URL

Use:

- ingress controller
- Hetzner load balancer
- DNS record
- TLS

Do this after the cluster and workloads are already healthy.

## What I recommend you do first

Because this is your first time:

### First pass

- create the cluster
- deploy Redis and Kafka
- use Supabase as external Postgres
- deploy app workloads
- test through port-forward

### Second pass

- add public ingress
- add DNS
- add TLS
- harden monitoring and backup

## Concrete task split for AI agents

If you use coding/coprocess agents, split the work like this:

### Agent 1: Hetzner cluster bootstrap

Deliver:

- 3-node K3s cluster
- kubeconfig on your machine
- private network configured

### Agent 2: Kubernetes infra services

Deliver:

- Redis in cluster
- Kafka in cluster
- persistent volumes if needed
- stable service names matching config

### Agent 3: Registry and images

Deliver:

- all `:staging` tags built/pushed
- GHCR access model confirmed
- image pull secret if required

### Agent 4: App deployment

Deliver:

- filled `phoenix-platform-secrets`
- staging overlay rendered and applied
- rollout status green

### Agent 5: Smoke and rehearsal

Deliver:

- gateway `/health` and `/ready`
- registration/login
- wallet create/deposit
- market create
- bet placement
- settlement/reconciliation
- outbox worker verification

## Definition of done

Staging is only “built” when all of these are true:

1. `kubectl get nodes` works
2. `kubectl get pods -n phoenix-platform-staging` shows healthy workloads
3. gateway `/health` and `/ready` return `200`
4. user registration/login works
5. wallet create/deposit works
6. market create and bet placement work
7. settlement and reconciliation work
8. outbox worker drains unpublished events
9. the result is recorded in the staging rehearsal status doc

## Most common first-time mistake

Trying to deploy the app before these are solved:

- kube access
- image tags
- real secret values
- Redis/Kafka availability

That just creates noisy failures. Build the environment in this order:

1. cluster
2. infra
3. registry
4. secrets
5. app deploy
6. smoke tests

## Related docs

- `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/docs/runbooks/staging-setup.md`
- `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/docs/release-checklist.md`
- `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/docs/runbooks/staging-rehearsal-status-2026-03-10.md`

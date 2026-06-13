# Staging Rehearsal Status — 2026-03-10

## Result

**NOT DEPLOYABLE.** Three hard blockers remain. Manifests are validated and ready.

## Kube Access Check

| Check | Result |
|---|---|
| `kubectl` installed | YES — v1.34.1, Kustomize v5.7.1 |
| `docker` installed | YES — v29.2.1 |
| `go` installed | YES — go1.26.0 darwin/arm64 |
| `kubectl config get-contexts` | **EMPTY** — no contexts configured |
| `kubectl config current-context` | **ERROR** — current-context is not set |
| `kubectl cluster-info` | **ERROR** — no API server reachable |
| `kubectl get nodes` | **ERROR** — no API server reachable |

**Verdict:** No Kubernetes cluster access from this machine.

## Overlay Validation

| Check | Result |
|---|---|
| `kubectl kustomize .../overlays/staging` | **CLEAN** — renders without errors |
| Namespace | `phoenix-platform-staging` — created by base |
| ConfigMap | `phoenix-platform-config` — 19 keys, staging values applied |
| Secret | `phoenix-platform-secrets` — 9 keys, all placeholder `replace-me` |
| Services | 14 services rendered, correct ports and selectors |
| Deployments | 15 deployments rendered (14 HTTP + 1 outbox worker) |
| All selectors include `environment: staging` label | YES |
| All containers have liveness+readiness probes | YES (14 HTTP services), outbox worker has none (expected) |
| Resource limits set on all containers | YES — 100m/128Mi requests, 500m/512Mi limits |

## Image Coherence

All 15 images point to `ghcr.io/philcali-phoenix/<service>:staging`:

| Image | Tag | Replicas |
|---|---|---|
| phoenix-gateway | staging | 2 |
| phoenix-user | staging | 2 |
| phoenix-wallet | staging | 2 |
| phoenix-market-engine | staging | 2 |
| phoenix-betting-engine | staging | 2 |
| phoenix-events | staging | 2 |
| phoenix-analytics | staging | 2 |
| phoenix-settlement | staging | 2 |
| phoenix-retention | staging | 1 |
| phoenix-social | staging | 1 |
| phoenix-compliance | staging | 1 |
| phoenix-notification | staging | 1 |
| phoenix-cms | staging | 1 |
| stella-engagement | staging | 1 |
| phoenix-outbox-worker | staging | 1 |

**Image tag status: UNKNOWN.** Cannot verify whether `:staging` tags exist on GHCR without registry access or `docker pull` against the org.

## Secrets Assessment

Template created: `deploy/k8s/base/secrets.staging.yaml`

Required values that must be filled before deploy:

| Key | Status | Notes |
|---|---|---|
| `DATABASE_URL` | PLACEHOLDER | Needs real staging Postgres host, user, password, dbname |
| `JWT_SECRET` | PLACEHOLDER | Generate with `openssl rand -base64 32` |
| `JWT_SECRET_KEY` | PLACEHOLDER | Generate with `openssl rand -base64 32` |
| `REDIS_PASSWORD` | PLACEHOLDER | Must match staging Redis instance |
| `SMTP_HOST` | PLACEHOLDER | Real SMTP relay for staging |
| `SMTP_PORT` | Set to 587 | Likely correct for TLS |
| `SMTP_USER` | PLACEHOLDER | SMTP auth credentials |
| `SMTP_PASSWORD` | PLACEHOLDER | SMTP auth credentials |
| `EMAIL_FROM` | Set to example | Update to real sender address |

## Infrastructure Dependencies (from ConfigMap)

These in-cluster DNS names are hardcoded in the base ConfigMap and must resolve inside the cluster:

| Dependency | Address in ConfigMap | Notes |
|---|---|---|
| PostgreSQL | `postgres-rw:5432` (in DATABASE_URL) | No k8s manifest in this repo — must be pre-provisioned |
| Redis | `redis:6379` | No k8s manifest in this repo — must be pre-provisioned |
| Kafka | `kafka:9092` | No k8s manifest in this repo — must be pre-provisioned |

None of these backing services are included in the overlay. They must exist in-cluster before deploy.

## Hard Blockers

1. **No Kubernetes cluster access.** Zero contexts configured. Need kubeconfig for a staging cluster.
2. **Secrets not populated.** `secrets.staging.yaml` created as template but contains only `REPLACE_ME` placeholders. 7 of 9 values need real credentials.
3. **Image existence unverified.** Cannot confirm `:staging` tags exist on `ghcr.io/philcali-phoenix/*`. If images are in a private org, an `imagePullSecret` is also needed.

## Soft Blockers (must verify after cluster access)

4. **Backing services (Postgres, Redis, Kafka)** must be running in-cluster or have ExternalName/endpoint mappings.
5. **Namespace** `phoenix-platform-staging` must be created.
6. **GHCR image pull secret** may be needed if the container registry is private.

## Files Prepared

| File | Action |
|---|---|
| `deploy/k8s/base/secrets.staging.yaml` | **CREATED** — template with REPLACE_ME placeholders, namespace set |
| `docs/runbooks/staging-rehearsal-status-2026-03-10.md` | **UPDATED** — this file |

## GCP Demo Deployment — 2026-03-10

While the Kubernetes staging path remains blocked, a full-capability demo deployment
was successfully completed on GCP using Docker Compose.

| Property | Value |
|---|---|
| VM name | `phoenix-demo-01` |
| Zone | `us-central1-a` |
| Machine type | `e2-standard-8` (8 vCPU / 32 GB RAM) |
| Disk | 150 GB SSD |
| OS | Ubuntu 24.04 LTS x86_64 |
| External IP | `34.60.222.226` |
| Docker | 29.3.0 + Compose v5.1.0 |
| Firewall rule | `phoenix-demo-allow-http` (tcp:80,443,8080,8090) |

### Deployment Result

- **17/17 migrations applied** — all CREATE/ALTER statements succeeded
- **16/16 backend services healthy** — all long-running backend containers report `(healthy)` via Docker healthcheck
- **23/23 smoke tests passed** — gateway, direct health, proxied routes, outbox, kafka-ui
- **0 failures, 0 skipped**

### Public URL

| Endpoint | URL |
|---|---|
| Demo (HTTPS) | `https://demo.99rtp.io` |
| Health | `https://demo.99rtp.io/health` |
| Ready | `https://demo.99rtp.io/ready` |
| Kafka UI | `http://34.60.222.226:8090` |

- DNS: `demo.99rtp.io` → A → `34.60.222.226`
- TLS: Caddy + Let's Encrypt (automatic)
- HTTP → HTTPS redirect: 308 Permanent Redirect

### Issues Fixed During Deployment

1. **phoenix-market-engine build context** — was `context: .` (shared), changed to `./phoenix-market-engine` (standalone)
2. **Migration `-- Up`/`-- Down` parser** — sed extracted empty content for files without markers (e.g. 010); added conditional to run full file when no `-- Up` marker exists
3. **Healthcheck HEAD vs GET** — `wget --spider` sends HEAD; services register `/health` as GET-only (405). Changed to `wget -q -O /dev/null`
4. **Healthcheck `/dev/tcp` on Debian** — Docker CMD-SHELL uses `/bin/sh` (dash) which lacks `/dev/tcp`; changed to explicit `bash -c` invocation

## Next Steps (exact commands)

Once a staging kubeconfig is available:

```bash
# 1. Set context
kubectl config use-context <staging-context-name>

# 2. Verify access
kubectl cluster-info
kubectl get nodes

# 3. Create namespace
kubectl create namespace phoenix-platform-staging

# 4. Fill secrets (edit the file first!)
vi /Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/deploy/k8s/base/secrets.staging.yaml
kubectl apply -n phoenix-platform-staging -f /Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/deploy/k8s/base/secrets.staging.yaml

# 5. Verify image pull (test one image)
docker pull ghcr.io/philcali-phoenix/phoenix-gateway:staging

# 6. Deploy
kubectl apply -k /Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/deploy/k8s/overlays/staging

# 7. Watch rollout
kubectl rollout status deployment/phoenix-gateway -n phoenix-platform-staging
```

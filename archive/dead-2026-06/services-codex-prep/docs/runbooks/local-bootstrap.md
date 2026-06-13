# Local Bootstrap Runbook

## Purpose

Bring up a working Phoenix Platform development stack on one machine and verify
that the Go services, shared infrastructure, and integration harness are all in
a known-good state.

## Prerequisites

- Go 1.24+
- Docker and Docker Compose
- `psql` or another PostgreSQL client
- `redis-cli`
- `kubectl` or `kustomize` if you want to validate the Kubernetes overlays

## Bootstrap sequence

1. Copy environment defaults:
   - `cp /Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/.env.production.example /Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/.env.dev`
2. Adjust local values in `.env.dev`:
   - `DATABASE_URL`
   - `REDIS_ADDR`
   - `KAFKA_BROKERS`
   - JWT secrets
3. Start infrastructure:
   - `cd /Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep`
   - `docker compose up -d postgres redis kafka kafka-init`
4. Verify service code still compiles:
   - `./scripts/verify_docker_builds.sh`
5. Run compose-backed integration:
   - `cd /Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/phoenix-gateway`
   - `./scripts/run_compose_integration.sh`

## Local deployment modes

### Service-local outbox disabled

Use this during most development:

- `OUTBOX_ENABLED=false` on HTTP services
- run the standalone outbox worker separately only when validating event export

### Standalone outbox worker

Run when you need to verify outbox draining against Kafka:

- image: `ghcr.io/philcali-phoenix/phoenix-outbox-worker`
- binary: `/usr/local/bin/phoenix-outbox-worker`
- required env:
  - `DATABASE_URL`
  - `KAFKA_BROKERS`
  - `OUTBOX_POLL_INTERVAL`
  - `OUTBOX_BATCH_SIZE`

## Kubernetes overlay validation

- local:
  - `kubectl kustomize /Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/deploy/k8s/overlays/local`
- staging:
  - `kubectl kustomize /Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/deploy/k8s/overlays/staging`
- production:
  - `kubectl kustomize /Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/deploy/k8s/overlays/production`

## Expected success conditions

- Docker build verifier passes for all services and `phoenix-outbox-worker`
- compose integration passes
- Redis, Postgres, and Kafka are healthy
- no service fails readiness on `/ready`

# Taya NA Predict — Deployment

> Describes the deployment **as it actually runs today**: a single Hetzner box
> running docker-compose behind Caddy, driven by GitHub Actions over SSH. The
> previous Kubernetes/Cloud-SQL/Memorystore guide was fiction and was archived
> under `archive/dead-2026-06/docs-sportsbook/` in P2-04.

## Topology (demo)

```
GitHub Actions ──SSH──▶ Hetzner box (2 vCPU)
                          ├─ Caddy            TLS, basic_auth on office host,
                          │                   strips client geo headers, stamps X-Edge-Auth
                          ├─ predict_gateway  :18080  (bind to 127.0.0.1; only Caddy reaches it)
                          ├─ predict_auth     :18081
                          ├─ predict_player   :3000
                          ├─ predict_office   :3001
                          ├─ postgres 16      (named docker volume — survives rsync --delete)
                          ├─ redis            (auth sessions + rate limiter)
                          ├─ db-backup        6h pg_dump sidecar (opt-in)
                          └─ rocketchat       community feed
```

Compose files: `docker-compose.yml` (base: postgres, redis, gateway, auth) +
`docker-compose.demo.yml` (overlay: frontends, SMM, feature-flag env, db-backup,
Rocket.Chat). The demo overlay **requires** `JWT_SECRET` (`${JWT_SECRET:?}`) and
sets production-shape env.

## CI/CD

Three GitHub Actions workflows (`.github/workflows/`):

| Workflow | Trigger | What it does |
|---|---|---|
| `deploy-demo.yml` | push to the live branch (guarded) | the deploy pipeline below |
| `migrate-demo.yml` | manual (`workflow_dispatch`, goose command) | runs goose against the box DB in a throwaway golang container |
| `test.yml` | push/PR (main + feat/binary-exchange-engine) | FE unit tests, Go `build`+`test -race`, cashier guard scripts, external-symlink guard |

### deploy-demo pipeline (the validated manual flow, automated)

1. **Guard branch** — only the designated live branch deploys.
2. **Rsync** the app dir to the box (`rsync -az --delete`; the Postgres volume is
   a named docker volume, so `--delete` can't touch DB data).
3. **Patch Caddyfile** `basic_auth` hash on the box (the bcrypt hash never lives
   in source control — `${{ secrets.BACKOFFICE_BASIC_AUTH_HASH }}`).
4. **Inject `OPENROUTER_API_KEY`** into the box `.env` for compose substitution.
5. **Build + recreate `auth`**, then health-check `:18081/healthz` (abort on fail).
6. **Build `gateway`**, **apply migrations** (`run --rm migrate up`), **recreate
   `gateway`**, health-check `:18080/healthz` (abort on fail — built first so a Go
   failure aborts before any frontend is touched).
7. Build + recreate the player and office frontends.
8. Start Rocket.Chat; configure public read.

Migrations run via the compose `migrate` service (goose, idempotent). Apply them
before recreating the gateway so the schema is always ahead of the binary.

## Required production/staging configuration

The gateway **fails closed at boot** (`cmd/gateway/main.go: validateGatewayRuntimeConfig`)
when `ENVIRONMENT` ∈ {production, staging}. You MUST set:

| Variable | Requirement |
|---|---|
| `PAYMENTS_WEBHOOK_SECRET` | non-default (not `whsec_local`) |
| `GATEWAY_DB_DSN` / `WALLET_DB_DSN` | non-`localdev` credentials |
| `GEO_GATE_ENABLED` | `true` (mandatory) |
| `GEO_ALLOWED_COUNTRIES` | non-empty ISO-3166 allowlist (allowlist mode mandatory) |
| `GEO_TRUSTED_PROXY_MODE` + `EDGE_SHARED_SECRET` | if require-mode is on, the secret is mandatory (anti-spoof, SEC-03) — set the same value on the Caddy container as `{$EDGE_SHARED_SECRET}` |
| `KYC_ENFORCEMENT`, `KYC_REQUIRED_FOR_TRADING` | each `true` or explicitly `*_ACK_DISABLED=true` |
| `BETA_COMPLIANCE_MODE=permissive` | **invalid in production** (boot error); staging only with `COMPLIANCE_STARTUP_ACK=true` |
| `GATEWAY_ALLOW_ADMIN_ANON` | refused in prod/staging |

If the **alpha cashier** is enabled (`ALPHA_CASHIER_ENABLED=true`) with withdrawals:
`ALPHA_CASHIER_WITHDRAWAL_BROADCAST_ACK=true` and either
`ALPHA_CASHIER_TWO_PERSON_WITHDRAWAL=true` or
`ALPHA_CASHIER_TWO_PERSON_WITHDRAWAL_ACK_DISABLED=true` (A2-04). Full env reference
is the commented block in `docker-compose.demo.yml` and `../../CLAUDE.md`.

## Network hardening

- Bind the gateway port to loopback (`127.0.0.1:18080:18080`) so the origin is
  not reachable off-box — the edge (Caddy) is the only ingress. A direct request
  to the origin could otherwise supply a forged `CF-IPCountry` and bypass
  geo-fencing (SEC-03).
- Firewall `:80/:443` to the CDN/edge ranges before enabling the geo gate, so
  requests cannot bypass the edge and forge the country header.

## Backup & restore

`ops/backup/` provides `backup-db.sh` (logical pg_dump, gzipped, retention) and
`restore-db.sh`. The demo compose ships a `db-backup` sidecar (6h loop, opt-in via
`docker compose … up -d db-backup`). **Local-only by default** — a local dump does
not survive box loss; set `BACKUP_OFFSITE_CMD` for true offsite. Run a restore
drill and document the RTO before relying on it (P3-08).

## Gaps (see audit workstream G / P3-08)

No staging tier (only the demo box), no IaC, no production pipeline, offsite
backup off by default, no tested restore drill. These are tracked in
`docs/audit/IMPROVEMENT_PLAN.md` P3-08.

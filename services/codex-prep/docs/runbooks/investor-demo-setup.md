# Investor Demo Setup

This is the authoritative runbook for the investor demo.

The investor demo uses:

- the real Go backend
- the real migrated player frontend
- the real Talon backoffice
- private player and Talon origins
- deterministic seed data
- reset, warmup, and smoke scripts in `codex-prep`

Canonical program control lives in:

- [INVESTOR_DEMO_READINESS_BOARD.md](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/INVESTOR_DEMO_READINESS_BOARD.md)

## Runtime

The compose runtime is defined by:

- [docker-compose.yml](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/docker-compose.yml)
- [docker-compose.demo.yml](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/docker-compose.demo.yml)

Investor-demo UIs:

- Player UI container: `phoenix-player-web`
- Talon UI container: `phoenix-talon-web`
- Gateway: `phoenix-gateway`
- Dedicated realtime fanout: `phoenix-realtime`

Legacy fallback only:

- `phoenix-demo-web`

## Required local repos

The demo compose overlay expects both sibling repos to exist:

- `/Users/johnb/Desktop/PhoenixBotRevival/apps/Phoenix-Sportsbook-Combined/phoenix-frontend-brand-viegg`
- `/Users/johnb/Desktop/PhoenixBotRevival/apps/Phoenix-Sportsbook-Combined/talon-backoffice`

If you need to build frontend images locally, `${HOME}/.npmrc` must exist so Docker BuildKit can mount it as a secret.

If `${HOME}/.npmrc` is missing, the investor-demo scripts can now fall back to host-run frontends using the sibling repos and their local worktrees:

- [/scripts/investor-demo-frontends-start.sh](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/scripts/investor-demo-frontends-start.sh)
- [/scripts/investor-demo-frontends-stop.sh](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/scripts/investor-demo-frontends-stop.sh)

## Local ports

- Player UI: `http://localhost:3100`
- Talon UI: `http://localhost:3101`
- Gateway: `http://localhost:8080`
- Realtime direct health: `http://localhost:8018`
- Kafka UI: `http://localhost:8090`

## Environment

Investor-demo env file:

- [/.env.demo](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/.env.demo)

Key investor-demo settings:

- `WEBSOCKET_ALLOWED_ORIGINS`
- `WEBSOCKET_REALTIME_PROXY_ENABLED`
- `PHOENIX_REALTIME_URL`
- `INVESTOR_DEMO_FRONTEND_MODE`
- `INVESTOR_DEMO_FRONTEND_RUNTIME_NODE_VERSION`
- `INVESTOR_DEMO_REUSE_EXISTING_FRONTEND_BUILD`
- `INVESTOR_DEMO_PLAYER_PORT`
- `INVESTOR_DEMO_TALON_PORT`
- `INVESTOR_DEMO_PLAYER_PUBLIC_URL`
- `INVESTOR_DEMO_TALON_PUBLIC_URL`
- `INVESTOR_DEMO_GATEWAY_PUBLIC_URL`
- `INVESTOR_DEMO_GATEWAY_PUBLIC_WS_URL`
- `INVESTOR_DEMO_CDN_URL`
- `INVESTOR_DEMO_*GEOCOMPLY*`
- `INVESTOR_DEMO_PLAYER_INTEGRATION_MODE`
- `INVESTOR_DEMO_PREDICTION_MARKETS_ENABLED`

## Start paths

Full build + start + seed + warmup:

```bash
cd /Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep
./scripts/demo-bootstrap.sh
```

Start prebuilt images only:

```bash
cd /Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep
./scripts/demo-bootstrap.sh --skip-build
```

Reset from a dirty state, then warm and smoke:

```bash
cd /Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep
./scripts/investor-demo-reset.sh --skip-build
```

## Demo scripts

- Bootstrap: [/scripts/demo-bootstrap.sh](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/scripts/demo-bootstrap.sh)
- Seed: [/scripts/demo-seed.sh](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/scripts/demo-seed.sh)
- Warmup: [/scripts/investor-demo-warmup.sh](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/scripts/investor-demo-warmup.sh)
- Smoke: [/scripts/demo-smoke.sh](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/scripts/demo-smoke.sh)
- Realtime rehearsal: [/scripts/realtime-rehearsal.sh](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/scripts/realtime-rehearsal.sh)
- Payment simulator: [/scripts/payment-provider-simulator.sh](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/scripts/payment-provider-simulator.sh)
- Verification simulator: [/scripts/verification-provider-simulator.sh](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/scripts/verification-provider-simulator.sh)
- Reset: [/scripts/investor-demo-reset.sh](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/scripts/investor-demo-reset.sh)

## Seeded credentials

- Player: `demoplayer / Password123!`
- Admin/operator: `demoadmin / Password123!`
- Ops review user: `demoopsplayer / Password123!`

The ops review user carries deterministic provider-backed cashier and verification cases for Talon rehearsal.

## Access model

The investor demo is private.

Required behavior:

- player and Talon must be exposed as separate origins
- websocket origins must be explicitly configured
- admin payment routes must remain role-gated
- public/shared-credential exposure is not the target runtime

## Private reverse proxy

Example Caddy config:

- [/deploy/caddy/investor-demo.example.Caddyfile](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/deploy/caddy/investor-demo.example.Caddyfile)

Recommended private origins:

- `player.demo.example`
- `talon.demo.example`
- `api.demo.example`

Both should proxy to separate local ports:

- player -> `localhost:3100`
- Talon -> `localhost:3101`
- gateway -> `localhost:8080`

## Validation

Smoke the investor-demo runtime with:

```bash
cd /Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep
./scripts/demo-smoke.sh
```

Validate the seeded realtime path with:

```bash
cd /Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep
./scripts/realtime-rehearsal.sh
```

That command:

- logs in the seeded player and admin users
- subscribes to `market`, `fixture`, `bets`, and `wallets` through the gateway websocket contract
- triggers one deterministic update for each domain
- writes a markdown artifact under `docs/runbooks/artifacts/`

Validate the seeded payment-provider path with:

```bash
cd /Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep
./scripts/payment-provider-simulator.sh full_pack
```

Validate the seeded verification-provider path with:

```bash
cd /Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep
./scripts/verification-provider-simulator.sh full_pack
```

Those commands:

- reseed deterministic ops-only provider cases before each scenario
- exercise callback and admin-review flows against the real Go routes
- write markdown artifacts under `docs/runbooks/artifacts/`

Latest known-good live artifacts from the Go stack:

- cashier/provider rehearsal: [/docs/runbooks/artifacts/payment_provider_simulator_20260315_181314.md](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/docs/runbooks/artifacts/payment_provider_simulator_20260315_181314.md)
- verification/provider rehearsal: [/docs/runbooks/artifacts/verification_provider_simulator_20260315_181123.md](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/docs/runbooks/artifacts/verification_provider_simulator_20260315_181123.md)

For a remote VM:

```bash
PLAYER_BASE=https://player.demo.example \
TALON_BASE=https://talon.demo.example \
API_BASE=https://api.demo.example \
DIRECT_HOST=<vm-ip> \
./scripts/demo-smoke.sh
```

## Current known gaps

Still not complete for the final investor-demo target:

- dedicated realtime fanout exists, but end-to-end websocket propagation still needs seeded rehearsal coverage before polling fallback can be disabled by default
- provider simulator scripts now have live artifacts on the running Go stack, but they still need to be replayed with the full player-plus-Talon investor-demo runtime
- Talon itself still needs focused migration against Go routes
- combined host-run player+Talon runtime is validated including terminal-close survival:
  - Node runtime default aligned to `20.20.0`
  - launcher repairs the incompatible `next`/`http-errors`/`statuses` tree locally when the repo worktree has drifted
  - launcher calls the repo-local Next CLI directly instead of depending on Yarn PATH
  - `packages/office/next.config.js` no longer wires `I18NextHMRPlugin` into production builds
  - launcher removes nested `rc-upload/@babel/runtime@7.13.9` when root `@babel/runtime` has the required `regeneratorRuntime` export
  - `@babel/runtime` resolution pinned in root `package.json` to `7.28.6`
  - launcher uses `setsid` (via perl POSIX) to give each Node process its own session, preventing terminal-close SIGHUP from killing them (Node.js/libuv overrides `nohup`'s SIG_IGN)
  - validated via pty-exit simulation: both processes survive launcher terminal close with HTTP 200 at t=0/10/30s
- repo-wide frontend TypeScript and test noise still exists outside the demo-critical hardened paths

## Authority

If this file conflicts with older thin-demo docs, follow this file and the readiness board.

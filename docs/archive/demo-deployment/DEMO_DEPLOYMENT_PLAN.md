> **ARCHIVED 2026-09-06.** Historical record only — this does not describe the current system.
> Its manual SSH runbook (rsync from a Mac to `/opt/taptrade`, hand-run migrate/seed, hand-patched
> Caddyfile) was superseded by the automated pipeline in `.github/workflows/deploy-demo.yml`, which
> deploys to `/opt/phoenix` on push to `main`; running this runbook against the live box would
> collide with the running stack on the fixed `container_name` values in `docker-compose.yml`.
> For the deployment as it actually runs, see `apps/taptrade-platform/DEPLOYMENT.md`.
> See `CLAUDE.md` for current architecture.

# TapTrade Predict — Demo Deployment Plan (v4.11, archived)

**Changelog:**
- **v4.11 (this doc):** market-card thumbnails fixed on live. Two chained root causes: (a) the v4.10 claim "prediction market API has no image field, images moot" was **WRONG** — the discover feed carries `image_url`; the logo redeploy's `rsync -az --delete` from the Mac then clobbered the box's sync-rehosted images, desyncing DB↔files (→404); (b) after moving thumbnails to a persistent `market_images` Docker volume + re-sync, they 500'd because `sync-markets` runs as root writing mode-0600 files the `USER node` player can't read. Fixes: persistent volume isolates thumbnails from rsync/rebuild; `chmod -R a+rX` after sync; both folded into runbook step G (now with all three gotchas) + compose overlay gains `market_images` volume. Verified: all 32 referenced image_urls → 200 live. Lesson reinforced: I asserted "no image field" from a partial check (discovery summary keys) instead of tracing the card→feed path — exactly the assume-don't-verify failure this plan keeps catching.
- **v4.10 (prior):** post-launch fix — demo showed only ~15 markets because the runbook ran `seed` (base curated set only) but **not `cmd/sync-markets`** (the live Polymarket/Kalshi/Manifold catalog). Ran it on the box → **15 → 112 markets** across 6 categories; `/discovery` populated. Runbook gap closed: added **step G (sync-markets, MANDATORY)** with the `-public-root` fatal-without-it gotcha, and corrected step F's two latent bugs (hardcoded network name; `sh -lc` dropping Go from PATH). Image-serving worry investigated and dismissed — the prediction market API has no image field; cards are text/price.
- **v4.9 (prior):** **DEPLOYED LIVE** on Hetzner `91.98.118.132` (2 vCPU/4 GB+swap, Ubuntu 24.04, x86) 2026-05-18. Public smoke over real DNS+TLS all green: `https://demo.99rtp.io` 200 (valid LE cert), login→`Secure` host-only cookie, `portfolio/summary accuracyPct:70`, `wss://…/ws` → `101`, `office.99rtp.io` basic-auth 401/200. Two deploy-only bugs found+fixed: (1) migrate/seed `sh -lc` login shell dropped `/usr/local/go/bin` → `go: not found` (fixed: env via `docker run -e`, call `go` directly); (2) stale pre-DNS ACME backoff left Caddy not retrying after DNS went live → fixed by `docker restart predict_caddy` (LE certs issued in ~10 s). DNS confirmed a user step (no Cloudflare tool — corrected in runbook). Demo data: fresh `-mode demo` = 15 curated markets + u-1 (`demo@taptrade.local`) with 11 positions / 70% accuracy — populated, intended (not the 152 of accumulated local cruft).
- **v4.8 (prior):** substrate switched **Oracle → Hetzner CX32** (x86, ~€6.80/mo) — eliminates the A1 capacity lottery, the two Oracle firewall footguns, and ARM risk for ~€7/mo (correct trade for a revenue demo). Oracle demoted to a one-line $0 fallback. **DEPLOY RUNBOOK rewritten for Hetzner**, verbatim-runnable. Fixed a real defect carried in the Oracle draft: the migrate/seed step (`docker compose exec gateway ./migrate`) was wrong — the gateway image ships only the gateway binary (`services/gateway/Dockerfile:23,29-30`); corrected to a one-off `golang:1.25` container on the compose network running `go run ./cmd/{migrate,seed}` from the `go.work` workspace. Committed artifacts verified arch/provider-neutral (no ARM/Oracle hardcoding) — the substrate switch needed zero code changes. Pre-flight x86 cross-build **verified** (app+office `linux/amd64`, exit 0, arch=amd64, ~100 MB). Runbook hardened with a 4 GB swapfile step so a cheap **CX22 (4 GB, €3.99)** is also safe for the memory-spiky on-box `next build`, not just CX32.
- **v4.7 (prior):** substrate decided — **Oracle Cloud Always-Free (Ampere A1, ARM, $0, no pause)**. Added the **Oracle deploy runbook** (USER-only console steps vs. driven SSH steps), including the two Oracle footguns (VCN security list + the OS-level iptables that drops 80/443 on Ubuntu-OCI even after the cloud rule) and the A1 capacity caveat with a Hetzner fallback. Restart-policy hardening committed (`767dede7`). Local artifacts are deploy-ready; the only remaining gap is a provisioned Oracle box (user action).
- **v4.6:** `office-slim` runtime-validated (backoffice page + admin login + admin-API auth + WS `101` via its own single origin; the earlier Exit 255 was a spurious env artifact, not an office defect). A Docker Desktop auto-restart mid-session took the unattended stack down with no recovery (base compose has no `restart:` policy) — data survived on the named volume; **fixed** by adding `restart: unless-stopped` to every service in `docker-compose.demo.yml`. Hardening not yet committed (offered). See **Validation status**.
- **v4.5:** multi-stage standalone Dockerfile (image **7.7 GB → 437 MB**, both app+office, re-validated end-to-end), production `docker-compose.demo.yml` + `Caddyfile` written, and all A0 fixes + deliverables **committed** (`b60c0d01`, branch `feat/binary-exchange-engine`, not pushed; `--no-verify` user-authorized for an infra-only change). Deploy is now mechanical — no code prerequisites remain. See **Validation status**.
- **v4.4:** frontend build remediation **completed** (2026-05-17). All **6** pre-existing build defects fixed (the v4.3 four plus #5 Next-16-Turbopack-vs-`--webpack`, #6 undeclared `@taptrade-ui/api-client` dep). Both `app` and `office` images now build (`BUILD_EXIT=0`). **Path A validated end-to-end through real Caddy + the real built image**: single origin `localhost:8080` serves the Next page, proxies `/api` to gateway, login sets a host-only `SameSite=Lax` cookie, authed REST returns u-1 demo data, and `ws://…/ws` upgrades `101` on that cookie. The v4.3 "needs a build-remediation pass before any demo date" prerequisite is now **done**. Remaining: commit the A0 fixes, optionally multi-stage the 7.6 GB image, then deploy. Full evidence + final corrected A0 in **Validation status**.
- **v4.3:** local validation attempt — backend mechanism proven live; frontend image failed to build (4 of the 6 defects found; verdict was "needs remediation pass").
- **v4.2:** third review (senior DevOps / architect pass, code-verified). Adds **Path A — single-box** as the *recommended* topology; keeps **Path B — distributed Fly** (the old v4.1) as the alternative. Folds in: **P0** a hard blocker every prior pass + Codex missed (`ENVIRONMENT=staging` + missing `WS_ALLOWED_ORIGINS` ⇒ 100% WebSocket rejection); **P1** `make demo-data` is mandatory and `demo@taptrade.local == u-1`; **P2** split migrate/seed DSN from runtime DSN; **P4** Day-2 (rollback, uptime check, in-region one-shots). **Correction of a v4/v4.1 error:** the gateway does **not** read `JWT_SECRET` — it validates by delegating to the auth service (`middleware.go:216,287`). There is **no cross-service JWT drift risk**; set `JWT_SECRET` on **auth only**. v4.1's "JWT must be identical on gateway and auth" was wrong and is removed. **Cost corrected twice:** v4.2's first TL;DR ("Path A $5–15") was logically broken (a stateful box can't auto-stop). Then, given the operator's constraint that **access time is unknown** (⇒ always-on mandatory; no pre-warm/auto-stop modes; Supabase 7-day pause becomes a live Path-B failure), the analysis was redone *substrate-first*: the single-box topology is host-portable, so it runs ~$5/mo always-on on a commodity VPS (Hetzner-class) or ~$0 on Oracle Always-Free — **cheaper *and* more reliable than Path B's ~$18 + pause risk**. "Use Supabase to save money" shown to be a false economy here (only offloads Postgres, keeps the always-on compute box, adds the pause failure domain). See **Cost**.
- v4.1: WS is cookie-only ⇒ same-host edge proxy; two hostnames (no `basePath`); `NEXT_PUBLIC_API_URL` is runtime same-origin.
- v4: killed the private-Nexus "build on VPN" blocker; fixed deploy target (`frontend/`); exposed auth cookie/CORS code gaps, no-op pool env vars, mandatory store-mode gates.
- v3 / v2 / v1: see bottom; v1 GCP single-VM retained as fallback.

**Target lifetime:** ~2–6 weeks, demo only, fully functional. **Domain:** `99rtp.io`. **Operator:** Claude CLI.

---

## TL;DR — pick a path

| | **Path A — single box (recommended)** | **Path B — distributed Fly (alternative)** |
|---|---|---|
| Shape | 1 host, extended `docker-compose`, 1 Caddy | 5 Fly apps + Supabase + Upstash + Cloudflare |
| Single-origin problem | **Doesn't exist** (one box, one Docker net) | Engineered around with Caddy + Next rewrites |
| Failure domains | ~1 (the box) | ~7 (each boundary independently verified) |
| Postgres | container + volume (or Supabase if you want managed backups) | Supabase free, session pooler, 7-day pause, 60-conn cap |
| Rollback | `docker compose down && up` w/ pinned tags | `fly deploy --image <prev>` per app |
| Cost/mo (constraint: access time unknown ⇒ **always-on mandatory**) | **~$5 on a commodity VPS** (Hetzner/Netcup, 4 GB) · ~$0 Oracle Always-Free (fiddly) · ~$25 if run on Fly/GCP | **~$18** (Next apps must stay min=1 — see note; "demo-hours auto-stop" is invalid under this constraint) |
| Substrate is the cost, not the topology | single box → portable to the cheapest reliable host | locked to Fly + Supabase free (7-day pause = live risk under unpredictable access) |
| Best when | always-click-able demo, minimal babysitting, lowest reliable cost | you want to dry-run production-shaped infra |

The codebase **hard-requires single origin** (host-only cookie, no CORS, WS cookie-auth, WS exact-origin check). Path A makes that constraint vanish by construction; Path B spends a Caddy proxy + 6 verification steps faking it.

**Constraint that drives this (stated by the operator): the time prospects/sales will hit the demo is unknown.** That removes every "cheap because idle" mode: you can't pre-warm a stopped box for an unannounced click, and a Next 16 SSR cold-start (~5–15 s blank first paint) is a credibility hit for an unsupervised visitor. **Always-on is mandatory.** It also makes Supabase free tier's 7-day idle pause a live failure (a >7-day gap → next surprise visitor hits a paused DB; free-tier resume is slow / manual), which is a Path-B-only risk.

**On cost — the substrate is the cost, not the topology.** Path A's "~$25/mo" was an artifact of pricing a single Docker box on an *expensive* PaaS (Fly/GCP). The same `docker-compose + Caddy` runs unchanged on a commodity 4 GB VPS (Hetzner/Netcup ≈ **~$5/mo**, no pause, no cold start) or Oracle Cloud Always-Free Arm (**~$0**, if you can provision it — caveats in Cost section). Path B is locked to Fly + Supabase-free and lands ~$18/mo always-on. So with the always-on constraint applied honestly, **Path A is both the cheaper and the more reliable option** (~$5 vs ~$18, ~1 failure domain vs ~7) — *and* "use Supabase to save money" is a false economy here (it only offloads Postgres, still needs the always-on compute box, and adds the pause failure domain). **Recommendation: Path A on a ~$5 commodity VPS, always-on.** Full substrate ladder + the Supabase-doesn't-help analysis in the Cost section.

---

## Validation status — local end-to-end, 2026-05-17 — **VALIDATED after build remediation**

Run on the operator's Mac against the already-running local backend (`docker-compose.yml`: postgres/redis/gateway/auth) plus freshly built frontend images fronted by Caddy. **Path A is end-to-end proven, including the frontend image — after fixing 6 pre-existing build defects the plan's original A0 did not anticipate.**

### PROVEN live (executed, not code-read)

- **Backend (Blocker 1 + demo data):** running gateway has `WALLET_STORE_MODE=db`/`GATEWAY_READ_REPO_MODE=db`, auth `AUTH_STORE_MODE=db`; migrations goose v20; live DB confirms `u-1 | demo@taptrade.local | player` with the rich seeded portfolio (`accuracyPct:70`, 10 predictions, $306.91). `make demo-data` is mandatory.
- **Frontend images build** (after remediation): `predict-frontend:app` and `predict-frontend:office` both `BUILD_EXIT=0` — `next build --webpack` compiles, TS type-check passes, `check-no-upstream-leak.sh` passes, all prediction routes prerender.
- **Single-origin Path A / Blocker 4 — proven through real Caddy + the real built image, one origin `localhost:8080`:** page `/` → 200 Next HTML; `/api/v1/markets` → gateway JSON; login → `Set-Cookie: access_token; SameSite=Lax` **host-only (jar shows `host=localhost`, no Domain)**; `/api/v1/portfolio/summary` with that cookie → u-1 data (`accuracyPct:70`); **`ws://localhost:8080/ws` + cookie → `HTTP/1.1 101 Switching Protocols`**. Page + authed REST + live WS all on one origin, cookie set there and accepted on same-origin REST and the Caddy-upgraded WS. Tokens are opaque `atk_`/`rtk_` (not JWTs) → confirms gateway delegates validation to auth (the v4.2 "no JWT drift" correction is empirically correct).
- **`office-slim` runtime-validated** (separate verification, its own single origin `localhost:8081` via Caddy): page `/` → `307` → `/auth/login` → **200** real backoffice HTML (securedPage wrapper works), static assets `200`, **stays up** (an early Exit 255 was a spurious first-attempt artifact from a malformed scratch Caddyfile + the Docker-restart below — never reproduced on a clean run). Admin login `admin@taptrade.local` → **200 + host-only `SameSite=Lax` cookie**; admin APIs (`/api/v1/admin/markets`, `/admin/dashboard/volume`) return `405`/`400` **past the auth gate** (app-level method/param responses, not `401/403`) → admin cookie auth through the office origin works; **`/ws` + admin cookie → `101`**. office-slim image = good.
- **Incident + Day-2 finding (empirical):** mid-validation, Docker Desktop auto-updated (`server 29.3.1 → 29.4.3`) and restarted its VM — **all backend containers Exited 255 and the demo stayed down with no auto-recovery** (base `docker-compose.yml` sets no `restart:` policy). The `phoenix-predict-combined_postgres_data` named volume persisted, so `docker compose up -d` restored everything in ~4s with **zero data loss** (`prediction_markets=152`, `u-1=demo@taptrade.local` intact). For an unattended always-on demo (the "we don't know when they'll test" constraint) a host/Docker restart MUST self-heal. **Fixed:** `docker-compose.demo.yml` now sets `restart: unless-stopped` on **every** service (postgres/redis/gateway/auth/player/office/caddy); merge re-validated.

### Six pre-existing frontend build defects found + fixed (none catchable by code review / Codex — build-time only)

| # | Defect | Class | Fix applied |
|---|---|---|---|
| 1 | `.dockerignore` excludes `/packages/utils` (hard `@taptrade-ui/*` workspace dep) | packaging | un-excluded in `.dockerignore` |
| 2 | `yarn bootstrap` (lerna 3) `EEXIST` `@babel/core/.bin/parser` symlink under node:20 + yarn workspaces; root `build` chains it | toolchain/node20 | build via `yarn lerna run build`, bypass the bootstrap chain |
| 3 | `@taptrade-ui/utils` `tsc` fails — `TS7016` no types for `qs` | TS-debt | ambient `qs` shim (`packages/utils/src/qs-shim.d.ts`); proper fix = add `@types/qs` + refresh lockfile |
| 4 | `@taptrade-ui/app` `build` runs `bootstrap:locales` → `ENOENT` on `packages/app/translations/` — source deleted in commit #15 "bulk-delete legacy package-root carcass"; generated `public/static/locales` (130 files) is now the **committed canonical** artifact | half-finished i18n migration | drop vestigial `bootstrap:locales` from app `build`; un-`.dockerignore` `public/static/locales` so the canonical locales ship |
| 5 | app `build` ran bare `next build` → Next 16 defaults to **Turbopack**, app needs its custom webpack config (alias to `../utils/src`) → `WorkerError` | Next 16 default change | app `build` → `next build --webpack` (office already did this; app was missed in the migration) |
| 6 | `@taptrade-ui/api-client` imported by app + in `transpilePackages` but **absent from app `package.json` dependencies** → `--include-dependencies` skips it → no `dist/index.d.ts` → TS `Cannot find module '@taptrade-ui/api-client'` | undeclared dependency | declare `@taptrade-ui/api-client` in app `dependencies` (lockfile-safe — workspace deps aren't in yarn.lock) |

### Final corrected A0 (supersedes the A0 in PATH A below — this is the validated recipe)

`FROM node:20-bookworm-slim`; drop `--mount=secret,id=npmrc` + the `! test -e` line; `.npmrc` `@taptrade-ui`→npmjs; **un-exclude `/packages/utils` AND `public/static/locales`** in `.dockerignore`; replace `RUN yarn bootstrap` + `RUN yarn build …` with **`RUN yarn lerna run build --scope @taptrade-ui/$module_name --include-dependencies`**; `packages/app` `build` = `next build --webpack && ./scripts/check-no-upstream-leak.sh` (drop `bootstrap:locales`); add `@taptrade-ui/api-client` to `packages/app` dependencies; add `qs` typing to `packages/utils` (shim now; `@types/qs` properly). Both `module_name=app` and `office` build clean with this.

### Image size — RESOLVED (multi-stage standalone)

`frontend.Dockerfile` is now multi-stage: a full builder stage + a runtime stage shipping only Next's `output:"standalone"` traced closure (server + minimal node_modules) + `.next/static` + `public`. **Result: 7.65–7.82 GB → 437 MB (94% smaller), both `app` and `office`.** Validated: `predict-frontend:app-slim` boots `✓ Ready in 0ms`, binds `0.0.0.0`, and the full single-origin smoke passes through Caddy — page `/` 200, `/_next/static/*` 200, `/static/locales/en/common.json` 200 (canonical-locales fix proven at runtime), `/api` 200, login→cookie, `/api/v1/portfolio/summary` u-1 70%, `ws://…/ws` → 101. (`output:"standalone"` makes `next.config` `rewrites()` build-time, not runtime — irrelevant for Path A since Caddy owns `/api` and `/ws` on the single origin.)

### Remaining follow-ups (not blockers)

- Defect #3 still shimmed (`qs-shim.d.ts`) — add `@types/qs` + lockfile refresh when convenient (proper fix).
- Base `docker-compose.yml` publishes gateway/auth on host `:18080/:18081`. On a public box, bind those to `127.0.0.1` or firewall them so only Caddy (`:80/:443`) is reachable. Noted in `docker-compose.demo.yml` header.

### Verdict

**Path A is fully validated locally, frontend included, and the A0 fixes + deploy artifacts are committed.** Original A0 was off by six independent build defects — all fixed, proven, and committed (`chore(deploy): Path A demo …`, branch `feat/binary-exchange-engine`, **not pushed**). Both images build at 437 MB; single-origin page+REST+cookie+WS all green through real Caddy. Deploy is now mechanical: on the chosen substrate (~$5 Hetzner / ~$0 Oracle per Cost section) build the two slim images, `export JWT_SECRET`, `docker compose -f docker-compose.yml -f docker-compose.demo.yml up -d`, run one-shot migrate + `seed -mode demo` (Phase A2), set the office `basic_auth` hash, point DNS (proxied/orange-cloud via Cloudflare, Full Strict TLS) at the box. No code prerequisites remain.

### Deliverables (committed, in `apps/taptrade-platform/`)

`frontend/docker/frontend.Dockerfile` (multi-stage standalone — THE validated build), `frontend/.npmrc`, `frontend/.dockerignore`, `frontend/packages/app/package.json`, `frontend/packages/{app,office}/next.config.js` (`output:"standalone"`), `frontend/packages/utils/src/qs-shim.d.ts`, `docker-compose.demo.yml` (prod overlay), `Caddyfile` (prod, 2 single-origin hosts + auto-TLS), `Caddyfile.local` (local validation). Commit `b60c0d01`, `--no-verify` (infra-only, validated by build+run, not covered by the `yarn test` unit gate — user-authorized).

---

## Code-verified facts both paths depend on (file:line)

| Fact | Source |
|---|---|
| Auth cookie is host-only (no `Domain`), `SameSite=Lax` hardcoded, only `AUTH_COOKIE_SECURE` is a real knob | `auth/handlers.go:367-385,448-464,804-841` |
| WS auth is **`access_token` cookie only** (query-param removed; client opens bare `new WebSocket`) | `ws/handler.go:99-122`; `predict-ws.ts:25-49`; `useLiveData.ts:22` |
| **WS `CheckOrigin` rejects ALL connections if `ENVIRONMENT∈{production,staging}` and `WS_ALLOWED_ORIGINS` unset** | `ws/handler.go:18,38-55` |
| Gateway validates by delegation to auth (`/api/v1/auth/session`); **never reads `JWT_SECRET`** | `middleware.go:216,287`; `gateway/main.go:62-115` |
| `JWT_SECRET` used by **auth only** (sign + verify own tokens) | shipped `docker-compose.yml:82` (auth has it, gateway doesn't, works) |
| DSNs ignored unless `WALLET_STORE_MODE=db`, `GATEWAY_READ_REPO_MODE=db`, `AUTH_STORE_MODE=db`; `ENVIRONMENT=production` ⇒ wallet `log.Fatalf` on misconfig | `wallet/service.go:146-176`; `auth/handlers.go:240-276` |
| Only `WALLET_DB_MAX_OPEN_CONNS` exists; `GATEWAY_/AUTH_DB_MAX_OPEN_CONNS` are no-ops | `wallet/service.go:202-205`; `auth/handlers.go:242-244` |
| `demo@taptrade.local` → user **`u-1`**; `make demo-data` populates `u-1` (12 positions, $5k, 70% acc.) | `auth/handlers.go:152`; `seed/demo_phase4_user.go:11,107`; `wallet_topup.go:35` |
| Frontend: one image, two roles via `module_name`/`MODULE_NAME` → `yarn start:app` / `start:office` | `frontend/docker/frontend.Dockerfile:26-37`; root `package.json` scripts |
| `lib/pq`+`database/sql`, no pgx — session pooler :5432 only, never txn-mode :6543 | `gateway/go.mod`, `auth/go.mod` |
| Shipped `docker-compose.yml` builds postgres+redis+gateway+auth with correct store-mode envs (no frontends, no Caddy) | `docker-compose.yml:1-93` |

**P0 restated because it is the demo-killer:** v4.1 set `ENVIRONMENT=staging` (for the DB gates) and never set `WS_ALLOWED_ORIGINS`. `ws/handler.go:40-42` then returns `false` for **every** WebSocket. Live prices/portfolio die silently; you find out on the call. Either set `WS_ALLOWED_ORIGINS` (Path B), or leave `ENVIRONMENT` unset so WS runs dev-mode allow-all (Path A — see below; lowest-footgun for a single-origin demo).

---

# PATH A — Single box (recommended)

One Docker host, **≥4 GB** (2 GB OOMs the two Next 16 SSR apps). Cheapest reliable substrate: a **Hetzner CX22/CAX11 (~$5/mo)** or **Oracle Cloud Always-Free Ampere A1 (~$0, capacity-permitting)**; Fly/GCP work too at ~$25/mo if you prefer their tooling. Everything on one Docker network ⇒ one origin per app, no `.internal` 6PN, no cross-machine WS upgrade, no Supabase pooler/SSL/pause. See the Cost section for the substrate ladder.

### A0 — Build prep (no VPN; same as before)

`frontend/docker/frontend.Dockerfile`:
- `FROM node:14.17.0` → `FROM node:20-bookworm-slim`
- `RUN --mount=type=secret,id=npmrc ... yarn install` → `RUN yarn install --frozen-lockfile`; delete the `! test -e $HOME/.npmrc` line
- before `RUN yarn build`: add `ARG NEXT_PUBLIC_WS_URL` + `ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL` (only baked var; REST stays same-origin)
- `frontend/.npmrc`: point `@taptrade-ui` at `https://registry.npmjs.org/` or delete the line (deps are workspace-resolved)

Build both roles once:
```bash
cd Taya_Na_Predict/apps/taptrade-platform/frontend
for m in app office; do
  H=$( [ "$m" = app ] && echo demo || echo office )
  DOCKER_BUILDKIT=1 docker build -f docker/frontend.Dockerfile \
    --build-arg module_name=$m --build-arg NEXT_PUBLIC_WS_URL=wss://$H.99rtp.io/ws \
    -t predict-frontend:$m .
done
```

### A1 — `docker-compose.demo.yml` (overlay on the shipped compose)

The shipped `docker-compose.yml` already wires postgres+redis+gateway+auth correctly. Add an overlay that (1) hardens env for a public demo, (2) adds the two frontends + Caddy. **Leave `ENVIRONMENT` unset** — dev-mode is the lowest-footgun config for a single-origin demo: WS `CheckOrigin` allows all (`handler.go:44-45`), wallet won't fatal, and all seed users incl. `*@predict.dev` are seeded. The "production-mode" protections guard against a misconfigured *external* DSN, which doesn't exist when Postgres is a pinned local container.

```yaml
# docker-compose.demo.yml  —  docker compose -f docker-compose.yml -f docker-compose.demo.yml up -d
services:
  auth:
    environment:
      JWT_SECRET: "${JWT_SECRET:?set a strong secret}"   # auth ONLY; gateway delegates
      AUTH_COOKIE_SECURE: "true"                          # Caddy terminates TLS
      LOG_LEVEL: "info"
  gateway:
    environment:
      WALLET_DB_DRIVER: "postgres"
      WALLET_DB_MAX_OPEN_CONNS: "20"                      # local PG max_conns=100; generous is fine
      WALLET_DB_MAX_IDLE_CONNS: "4"
      LOG_LEVEL: "info"
      # no JWT_SECRET (gateway never reads it); no GATEWAY_CORS_ORIGINS (same-origin)

  player:
    image: predict-frontend:app
    environment:
      MODULE_NAME: "app"
      NEXT_PUBLIC_API_URL: ""        # empty ⇒ client same-origin; Caddy routes /api,/admin,/ws
    depends_on: [gateway]
    networks: [predict_network]
  office:
    image: predict-frontend:office
    environment:
      MODULE_NAME: "office"
      NEXT_PUBLIC_API_URL: ""
    depends_on: [gateway]
    networks: [predict_network]

  caddy:
    image: caddy:2
    ports: ["80:80", "443:443"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
    depends_on: [player, office, gateway]
    networks: [predict_network]

volumes:
  caddy_data:
```

`Caddyfile` (two site blocks, one box; Caddy does the API+WS routing so nothing is baked except WS):
```
demo.99rtp.io {
  @api  path /api/* /admin/* /ws*
  handle @api { reverse_proxy gateway:18080 }
  handle     { reverse_proxy player:3000 }
}
office.99rtp.io {
  @api  path /api/* /admin/* /ws*
  handle @api { reverse_proxy gateway:18080 }
  basicauth  { admin <bcrypt-hash> }
  handle     { reverse_proxy office:3001 }
}
```

### A2 — Bring up + migrate + seed (the P1/P2 fixes)

```bash
export JWT_SECRET="$(openssl rand -hex 32)"
docker compose -f docker-compose.yml -f docker-compose.demo.yml up -d --build

# P2: migrate/seed are one-shot jobs against the LOCAL pinned DB (no pooler, no SSL,
# no IPv6 issue — Postgres is in-network). Run them in-container so a laptop network
# blip can't strand goose's advisory lock:
docker compose exec gateway sh -lc '
  GATEWAY_DB_DSN="postgres://predict:localdev@postgres:5432/predict?sslmode=disable" \
  MIGRATIONS_DIR=/app/migrations ./migrate up'        # adjust path to the image's migrations dir
# P1: make demo-data is MANDATORY (base seed leaves u-1 empty → demo looks dead).
# demo@taptrade.local IS u-1; do NOT set AUTH_DEMO_USER_ID or "clean up" seeds.
docker compose exec gateway sh -lc './seed -mode demo'   # or: make demo-data
```

(If the gateway image doesn't ship `migrate`/`seed` binaries, run them from the host with `go run ./cmd/migrate up` / `./cmd/seed -mode demo` pointed at `postgres://predict:localdev@localhost:5434/predict?sslmode=disable` — the compose maps PG to host :5434.)

### A3 — DNS + TLS

**USER step** (no Cloudflare DNS tool exists — see "DNS + verify" below): add A records `demo.99rtp.io` and `office.99rtp.io` → the box's public IP, **proxied (orange-cloud)**. Set CF SSL/TLS to **Full (Strict)** so CF validates the origin LE cert. Caddy auto-issues Let's Encrypt via HTTP-01 (challenges pass through CF). The deploy pipeline automatically firewalls `:80/:443` to CF IP ranges and injects `EDGE_SHARED_SECRET` for anti-spoof edge auth. *(Updated 2026-06-23: switched from grey-cloud DNS-only to proxied.)*

### A4 — Smoke tests (each gates the next)

```bash
curl -sI https://demo.99rtp.io/api/v1/markets?limit=1                 # 200 + rows (not [] → A2 seed)
curl -i -c /tmp/cj -X POST https://demo.99rtp.io/api/v1/auth/login \
  -H 'content-type: application/json' -d '{"username":"demo@taptrade.local","password":"demo123"}'
curl -s -b /tmp/cj https://demo.99rtp.io/api/v1/portfolio | head      # u-1 has 12 positions
npx wscat -c wss://demo.99rtp.io/ws -H "Cookie: access_token=$(awk '/access_token/{print $7}' /tmp/cj)"
docker compose exec postgres psql -U predict -d predict -c \
  "select count(*) from pg_stat_activity;"                            # sanity, local PG cap 100
open https://demo.99rtp.io ; open https://office.99rtp.io
```

### A5 — Day-2 (P4)

- **Rollback:** tag images (`predict-frontend:app@<sha>`, build gateway/auth with tags); `docker compose ... up -d` with the prior tag. One command, one box.
- **Uptime + keep-alive in one:** external free monitor (Better Stack / Cloudflare Health) on `https://demo.99rtp.io/api/v1/markets?limit=1` every 10 min. Alerts you *before* the customer; if you keep Postgres local there's no Supabase pause to fight.
- **Backups:** local PG → `docker compose exec postgres pg_dump` on a cron to object storage, *or* use Supabase for Postgres only (managed backups) and accept the session-pooler/SSL/pause caveats from Path B for that one component.
- **Observability:** gateway exposes Prometheus `/metrics`; `ops/grafana/` dashboards already exist in-repo if you want them — out of scope for a demo, but the seam is there.
- **Spend cap:** Fly `fly orgs billing limit set --org personal 25`, or GCP budget alert.

### A6 — Teardown
`docker compose -f docker-compose.yml -f docker-compose.demo.yml down -v` then destroy the Machine/VM.

---

# PATH B — Distributed Fly (alternative; the v4.1 topology, P0/P1/P2/P4 folded in)

Use only to dry-run production-shaped infra. Full rationale/diagram unchanged from v4.1; the deltas vs v4.1 are the fixes below — apply them or it fails identically.

**Topology:** 1 Caddy app (2 site blocks `play.`/`office.99rtp.io`, `/ws*`→gateway, `*`→Next), 2 Next Fly apps (1 GB), gateway+auth internal (`.internal` 6PN), Supabase session pooler :5432 `sslmode=require`, Upstash optional, Cloudflare proxied (orange-cloud). `predict-router-demo` + `predict-gateway-demo`: `min_machines_running=1` (WS path).

**Gateway secrets (corrected):**
```bash
fly secrets set -a predict-gateway-demo \
  ENVIRONMENT=staging \
  WS_ALLOWED_ORIGINS="https://play.99rtp.io,https://office.99rtp.io"   # P0 — without this, 100% WS reject
  GATEWAY_DB_DSN="postgres://...:5432/postgres?sslmode=require" \
  WALLET_DB_DSN="postgres://...:5432/postgres?sslmode=require" \
  WALLET_STORE_MODE=db WALLET_DB_DRIVER=postgres GATEWAY_READ_REPO_MODE=db \
  WALLET_DB_MAX_OPEN_CONNS=8 WALLET_DB_MAX_IDLE_CONNS=2 \
  REDIS_URL="rediss://default:<pw>@<ep>.upstash.io:6379" \
  AUTH_SERVICE_URL="http://predict-auth-demo.internal:18081" \
  PAYMENTS_WEBHOOK_SECRET="$(openssl rand -hex 16)" LOG_LEVEL=info
#  NO JWT_SECRET here — gateway delegates validation to auth.
```
**Auth secrets:**
```bash
fly secrets set -a predict-auth-demo \
  ENVIRONMENT=staging AUTH_STORE_MODE=db \
  AUTH_DB_DSN="postgres://...:5432/postgres?sslmode=require" \
  JWT_SECRET="$(openssl rand -hex 32)"   AUTH_COOKIE_SECURE=true
```
(If `ENVIRONMENT=staging`, `WS_ALLOWED_ORIGINS` is **mandatory** on gateway. Alternatively run gateway with `ENVIRONMENT` unset to get dev-mode WS allow-all, but then you also lose the wallet fatal-on-misconfig guard — on Supabase with a hand-entered DSN that guard is worth keeping, so prefer `staging` + `WS_ALLOWED_ORIGINS` here.)

**Frontends:** build with `NEXT_PUBLIC_WS_URL=wss://play|office.99rtp.io/ws` baked; set `NEXT_PUBLIC_API_URL=http://predict-gateway-demo.internal:18080` as a **runtime** Fly secret (Next `rewrites()` reads it server-side; client stays same-origin).

**P1/P2 (same as Path A):** `make demo-data` mandatory; `demo@taptrade.local==u-1`; run migrate/seed from a **Fly one-off machine in the Supabase region** (`fly machine run`), not a laptop — goose holds a session advisory lock and Supabase free direct-connect is IPv6-only, so migrate over the **session pooler** as a single sequential process, never txn-mode.

**P4:** `fly releases list` / `fly deploy --image <prev>` rollback; external uptime monitor doubling as the Supabase 7-day-pause keep-alive; spend cap `fly orgs billing limit set 25`.

Smoke tests: v4.1 Phase 5 sequence (certs → markets → login → portfolio → `wscat` → `pg_stat_activity`). The `wscat` step is what proves P0 is actually fixed.

---

## Cost (verified; substrate-first, given access time is unknown ⇒ always-on)

The single-box topology (Path A) is **substrate-portable** — the same `docker-compose + Caddy` runs anywhere Docker runs. So the cost question is "which always-on host," not "which architecture." Ladder, cheapest reliable first:

| Substrate (Path A, 4 GB always-on) | $/mo | Pause/cold-click | Notes |
|---|---|---|---|
| **Oracle Cloud Always-Free** (Ampere A1, up to 4 vCPU/24 GB) | **~$0** | none | Genuinely free forever, no pause. Caveats: A1 capacity is hard to provision in busy regions; ARM (all our images — Go, Node 20, Postgres, Redis, Caddy — are arm64-fine); Oracle may reclaim *idle* free instances (the demo + uptime ping keeps it active). Best $ if you tolerate setup friction; not ideal as the *sole* substrate for a revenue demo. |
| **Hetzner CX22 / CAX11** (2 vCPU, 4 GB, 40 GB) | **~$5** (≈€3.79 + ~€0.50 IPv4 — verify at checkout) | none | The pragmatic answer: cheapest *reliable* always-on, no pause, full root, identical ops model to the GCP/Fly box. Netcup/Contabo similar. |
| **GCP e2-medium (4 GB)** | ~$25 | none | On-demand + ~$1.20 disk. v1's number. |
| **Fly shared-cpu-2x 4 GB** | ~$25 | none | $11.83 (2 GB) + ~$10 RAM + ~$1.50 vol + $2 IPv4. Verified vs fly.io/docs/about/pricing (ams). Stateful → cannot auto-stop. |

Path A's old "~$25" was an artifact of pricing it on an expensive PaaS. On a commodity VPS it's **~$5/mo always-on**, no pause, no cold start. Fly rates (for Path B): shared-cpu-1x 256 MB $2.02, 1 GB $5.92; +RAM ≈$5/GB; vol $0.15/GB; IPv4 $2; bw $0.02/GB (NA/EU). Supabase/Upstash free = $0 in dollars; their pause/limits are the real cost.

**Path B (distributed Fly), always-on (the only valid mode under the constraint):** Caddy+gateway+auth @256 MB min=1 ≈ ~$6 + 2×1 GB Next that **must also be min=1** (auto-stop ⇒ cold-start on a surprise click ⇒ bad first impression) $11.84 ≈ **~$18/mo** + Supabase-free 7-day-pause risk. The "demo-hours auto-stop ~$8–10" mode from earlier drafts is **invalid** here — it assumed predictable access.

**Does Supabase / managed-data make it cheaper? No — false economy under this constraint.** Offloading Postgres to Supabase (or Redis to Upstash) does *not* remove the always-on compute box: you still pay for 2× Next + 2× Go + Caddy + the WebSocket-holding gateway, which is the entire ~4 GB. It removes maybe ~0.4 GB of Postgres from the box (no tier change) while *adding* the 7-day-pause failure domain that the unknown-access constraint makes fatal. Neon (serverless PG, sub-second auto-resume) is strictly better than Supabase-free for unpredictable access if you want managed PG, but it still doesn't shrink the compute box. Net: managed data layers don't lower the floor here; they trade ~$0 of real saving for a new outage mode. Keep Postgres + Redis as local containers on the ~$5 box.

**Bottom line under "we don't know when they'll test":** Path A on a ~$5 Hetzner-class VPS (or ~$0 Oracle Free) is **both cheaper and more reliable** than Path B (~$18 + pause risk): always-on, instant on a cold click, no externally-controlled pause, ~1 failure domain. Prorated 2-week demo: **~$2–3 total** on Hetzner, **~$0** on Oracle Free.

Spend caps either way: `fly orgs billing limit set --org personal 30` or a GCP budget alert. Bandwidth for a sales demo is single-digit GB/mo (cents); ignore it in the model but it's why the always-on numbers carry a small buffer.

## DEPLOY RUNBOOK — Hetzner CX32 (chosen substrate, ~€6.80/mo)

x86-64, no provider firewall footguns, no capacity lottery. CX32 = 4 vCPU / 8 GB / 80 GB — 8 GB so the on-box Next build doesn't OOM (the only reason not to use the €3.79 CX22). Images are built **on the box** (x86 native; Mac-built arm64 won't run on x86). Every command below is verbatim-runnable; placeholders are only `<IP>`, `<KEY>`, `<DOMAIN>`, the office password, and the ACME email.

### USER-ONLY — Hetzner Cloud console (I have no Hetzner credentials; ~3 min)

1. Create a Hetzner Cloud account + project (card/PayPal; ~€7/mo, no free tier but no lottery).
2. Create server: type **CX32**, image **Ubuntu 24.04**, add an **SSH key** (save the PRIVATE key on this Mac at a known path). Default user is **`root`**.
3. Firewall: Hetzner Cloud Firewall is off by default (all ports open) — fine for a demo. If you attach one, allow inbound TCP **22, 80, 443**. *No OS-level iptables surprise (that was Oracle).*
4. Hand back: **public IP** + **private-key path on this Mac**.

> No capacity caveat — CX32 provisions in ~30 s, always. (Oracle A1 Always-Free is the $0 fallback if cost ever matters: same runbook, but ARM64 + two firewall footguns — VCN security list *and* Ubuntu-on-OCI iptables dropping 80/443; only worth it if the ~€7/mo is a hard blocker.)

### DRIVEN — once you give me IP + key path (I run these via SSH; or paste-run)

```bash
KEY=<KEY>; IP=<IP>; DOM=<DOMAIN>           # e.g. DOM=99rtp.io
SSH="ssh -o StrictHostKeyChecking=accept-new -i $KEY root@$IP"

# A) Docker
$SSH 'curl -fsSL https://get.docker.com | sh'

# A2) Swap — REQUIRED on CX22 (4 GB); harmless on CX32 (8 GB). The on-box
#     `next build` is memory-spiky; 4 GB without swap can OOM-kill it mid-build.
#     4 GB swapfile = the build completes (slower if it swaps; one-time, fine).
$SSH 'test -f /swapfile || (fallocate -l 4G /swapfile && chmod 600 /swapfile && \
  mkswap /swapfile && swapon /swapfile && echo "/swapfile none swap sw 0 0" >> /etc/fstab)'

# B) Code onto the box — rsync from this Mac (no GitHub token needed; skips heavy dirs)
rsync -az --delete -e "ssh -i $KEY" \
  --exclude node_modules --exclude .next --exclude .git --exclude '*.log' \
  ./apps/taptrade-platform/ root@$IP:/opt/taptrade/

# C) Build BOTH images on the box (x86 native; sequential — never concurrent —
#    so peak RAM stays bounded; with A2 swap this is safe on 4 GB CX22 too)
$SSH 'cd /opt/taptrade/frontend && \
  docker build -f docker/frontend.Dockerfile --build-arg module_name=app \
    --build-arg NEXT_PUBLIC_WS_URL=wss://demo.'"$DOM"'/ws   -t predict-frontend:app-slim . && \
  docker build -f docker/frontend.Dockerfile --build-arg module_name=office \
    --build-arg NEXT_PUBLIC_WS_URL=wss://office.'"$DOM"'/ws -t predict-frontend:office-slim .'

# D) Caddyfile: real hostnames + ACME email + office basic-auth hash
HASH=$($SSH "docker run --rm caddy:2 caddy hash-password --plaintext 'CHANGE-ME-OFFICE-PW'")
$SSH "cd /opt/taptrade && sed -i \
  -e 's/demo\\.99rtp\\.io/demo.$DOM/g' -e 's/office\\.99rtp\\.io/office.$DOM/g' \
  -e 's#ops@99rtp\\.io#you@$DOM#' -e 's#REPLACE_WITH_BCRYPT_HASH#${HASH//&/\\&}#' Caddyfile"

# E) Up — restart:unless-stopped baked → survives reboot / Docker restart
$SSH 'cd /opt/taptrade && export JWT_SECRET=$(openssl rand -hex 32) && \
  docker compose -f docker-compose.yml -f docker-compose.demo.yml up -d'

# F) MANDATORY demo data. gateway image ships ONLY the gateway binary (verified
#    services/gateway/Dockerfile:23,29-30) — migrate/seed/sync-markets are
#    `go run` in the go.work workspace → one-off golang container on the compose net.
#    LIVE-DEPLOY CORRECTIONS (all hit + fixed 2026-05-18):
#      • network name is DYNAMIC (project = dir basename → 'taptrade' →
#        'taptrade_predict_network'); never hardcode it — detect it.
#      • do NOT use `sh -lc`: a login shell sources /etc/profile and DROPS
#        /usr/local/go/bin → `go: not found`. Pass env via `-e`, call go directly.
$SSH 'cd /opt/taptrade
NET=$(docker inspect predict_postgres --format "{{range \$k,\$v := .NetworkSettings.Networks}}{{\$k}}{{end}}")
DSN="postgres://predict:localdev@postgres:5432/predict?sslmode=disable"
GO="docker run --rm --network $NET -e GATEWAY_DB_DSN=$DSN -v /opt/taptrade/go-platform:/w -w /w/services/gateway golang:1.25"
$GO -e MIGRATIONS_DIR=/w/services/gateway/migrations go run ./cmd/migrate up
$GO go run ./cmd/seed -mode demo'

# G) MANDATORY catalog. `seed` only creates the ~15-market curated base set.
#    The rich ~100 market discovery catalog comes from `cmd/sync-markets`
#    (Polymarket/Kalshi/Manifold). WITHOUT THIS the demo shows ~15 markets,
#    and image-bearing cards fall to monogram fallback.
#
#    THREE gotchas, all hit live 2026-05-18 — do NOT shortcut these:
#    1. sync-markets FATALS without -public-root (it rehosts thumbnails).
#    2. Rehosted thumbnails are RUNTIME state. They MUST live on the
#       `market_images` Docker volume (compose overlay), NOT in the rsynced
#       /opt/taptrade tree — a code redeploy's `rsync -az --delete` from the
#       Mac will otherwise wipe them and desync DB image_url ↔ files (the
#       discover feed DOES carry image_url; "no image field" was wrong).
#       So mount the VOLUME at the rehost target, not the disk public/.
#    3. sync-markets runs as root and writes mode-0600 root-owned files;
#       the player runs as USER node → EACCES → HTTP 500 on every image.
#       chmod the volume world-readable AFTER every sync. (re-runnable)
$SSH 'cd /opt/taptrade
NET=$(docker inspect predict_postgres --format "{{range \$k,\$v := .NetworkSettings.Networks}}{{\$k}}{{end}}")
VOL=$(docker volume ls --format "{{.Name}}" | grep -E "market_images\$" | head -1)
docker run --rm --network $NET -e GATEWAY_DB_DSN=postgres://predict:localdev@postgres:5432/predict?sslmode=disable \
  -v /opt/taptrade/go-platform:/w -v "$VOL":/pub/images/markets \
  -w /w/services/gateway golang:1.25 \
  go run ./cmd/sync-markets -polymarket 200 -kalshi 200 -manifold 100 -timeout 240 -public-root /pub
docker run --rm -v "$VOL":/v alpine sh -c "chmod -R a+rX /v"   # gotcha 3
docker restart predict_player'   # pick up fresh files cleanly
# (re-runnable any time to refresh the catalog; volume + chmod keep it consistent)
```

### DNS + verify

- **DNS is a USER step** (corrected 2026-05-17): there is **no Cloudflare DNS tool** in the connected integration — it exposes only D1/KV/R2/Workers. Earlier drafts wrongly claimed "I drive DNS via the Cloudflare MCP"; that capability does not exist. The operator adds, in whatever manages `<DOM>`'s DNS: two **A** records — `demo` → `<IP>` and `office` → `<IP>`, **proxied (orange-cloud)** through Cloudflare with SSL/TLS set to **Full (Strict)**. ACME HTTP-01 challenges pass through CF to Caddy. *(Updated 2026-06-23: the original grey-cloud note was wrong — proxied mode works with Caddy LE certs under Full Strict, and is required for CF-IPCountry geo gating.)*
- Public smoke (after DNS propagates + Caddy issues certs, ~1–2 min): `curl -sI https://demo.<DOM>/api/v1/markets?limit=1` → 200+rows; `POST /api/v1/auth/login` demo@taptrade.local/demo123 → `Set-Cookie: access_token`; `curl -b … /api/v1/portfolio/summary` → `accuracyPct:70`; `wscat -c wss://demo.<DOM>/ws` (+cookie) → `101`; open `https://demo.<DOM>` and `https://office.<DOM>` (basic-auth).

## Risks still live (both paths)

1. **Path A box is a single point of failure.** Acceptable for a demo (fast rebuild from compose + image tags + a PG dump). If the demo must survive a host failure mid-call, that's Path B's only real edge — at the cost of 7 failure domains the rest of the time.
2. **`frontend/` is canonical** (`phoenix-frontend/` is a stale dup). Build from `frontend/`.
3. **WS `CheckOrigin` exact match** (`handler.go:49`, case-insensitive full origin). Path A dev-mode sidesteps it; Path B must list the exact `https://play|office.99rtp.io`.
4. **`make demo-data` reseeds via `Service.PlaceOrder`/`ResolveMarket`** (real code path) — safe and idempotent per CLAUDE.md, but run it once after migrate and don't run base `cmd/seed` over it afterward (would not repopulate `u-1`).
5. **Path A backups** are DIY unless you put Postgres on Supabase; weigh managed backups vs. zero external deps for a 2–6 week life.

---

## v1–v3 history & GCP fallback

v3: Fly+Supabase+Upstash, session pooler/SSL/1 GB Next. v2: GCP→Fly. v1: GCP `e2-medium` + docker-compose (~$28/mo). **Path A is essentially v1 done right** — same single-box compose insight, but with the verified Dockerfile/store-mode/WS/seed fixes and Caddy single-origin. If you want GCP specifically: same `docker-compose.yml -f docker-compose.demo.yml` on an `e2-medium` (4 GB — `e2-small`'s 2 GB OOMs the two Next apps), one A record per hostname, Caddy on the box. ~$25/mo always-on, same as v1; `gcloud compute instances stop/start` between calls drops it to ~$4–6.

```bash
gcloud compute instances create predict-demo --zone=us-central1-a --machine-type=e2-medium \
  --image-family=ubuntu-2204-lts --image-project=ubuntu-os-cloud --boot-disk-size=30GB \
  --tags=http-server,https-server
# scp the repo (or git clone behind VPN if private), then A1–A4 above.
```

## Sources

- Code: `/codex challenge` + direct reads — `frontend/{package.json,.npmrc,.nvmrc,yarn.lock,docker/frontend.Dockerfile}`, `app|office/next.config.js`, `api-client/src/prediction-client.ts:292-329`, `app/app/lib/websocket/predict-ws.ts`, `useLiveData.ts:22`, `office/app/hooks/useTradingWebSocket.ts:22`, `go-platform/services/gateway/{cmd/gateway/main.go,cmd/migrate/main.go,internal/http/handlers.go:301-328,internal/ws/handler.go:15-145}`, `modules/platform/transport/httpx/middleware.go:216-460`, `services/wallet/service.go:146-205`, `services/auth/{internal/http/handlers.go:150-385,cmd/auth/main.go}`, `docker-compose.yml`.
- [Supabase pooler/prepared stmts](https://supabase.com/docs/guides/database/connecting-to-postgres) · [Supabase pricing](https://supabase.com/pricing) · [Fly pricing](https://fly.io/docs/about/pricing/) · [Upstash](https://upstash.com/pricing/redis)
- Prior self-review: [`DEMO_PLAN_REVIEW.md`](./DEMO_PLAN_REVIEW.md)

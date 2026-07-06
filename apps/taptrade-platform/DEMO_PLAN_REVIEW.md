# Adversarial Review — DEMO_DEPLOYMENT_PLAN.md

**Reviewer:** Self-adversarial pass (Codex CLI was installed in the sandbox but unauthenticated — `~/.codex/auth.json` lives on the user's Mac, not in the isolated Linux workspace, and `OPENAI_API_KEY` isn't exported into it). Findings below should be re-run through real `/codex challenge` from a Claude Code terminal in the repo where codex is authenticated — items flagged **[VERIFY-WITH-CODEX]** are the ones most likely to surface differently under an independent model.

**Mode:** Challenge. No compliments. Looking for what breaks in production.

**Verdict gate:** **FAIL — 3 P1 blockers, 5 P2 issues, 3 P3 nits.** The plan as written will not stand up the demo. Two findings have repo evidence; one is a Supabase-platform incompatibility the plan doesn't acknowledge.

---

## P1 — Will block the demo from starting

### [P1.1] The Next.js builds will fail outside the corp network. The plan does not handle this.

**Evidence:** `phoenix-frontend/.npmrc`:

```
@taptrade-ui:registry=https://lena-srv01.flipsports.net:4566/repository/npm-releases/
```

`lena-srv01.flipsports.net` is an internal Nexus / private Verdaccio at the company. The Next.js apps depend on `@taptrade-ui/utils`, `@taptrade-ui/api-client`, `@taptrade-ui/design-system` — all under the `@taptrade-ui` scope, all routed to this internal registry.

**What breaks:** `fly deploy` builds on Fly's remote builder, which is on the public internet and cannot reach `lena-srv01.flipsports.net`. The build will hang on `yarn install` and fail with a registry timeout. Same issue if you try Vercel, Cloudflare Pages, or any cloud builder.

**Fix options (the plan must pick one):**
1. **Pre-build locally**, push the built image to a registry (`ghcr.io`, Fly's registry), and `fly deploy --image <pre-built-image>`. Requires the demo operator to be on the corp VPN at build time.
2. **Self-hosted runner / Tailscale subnet router** that bridges Fly's builder to `lena-srv01`. Adds setup time.
3. **Mirror only the `@taptrade-ui/*` packages to a public registry** (npm Pro, GitHub Packages public) — fastest one-time cost.
4. **Vendor the workspace packages.** Already inside the lerna monorepo under `packages/`, so this *should* mostly resolve via workspace links — but check: does `packages/api-client` itself pull from the private registry? Worth a `yarn install --frozen-lockfile` from a clean checkout to confirm.

**Recommendation:** Option 1 (build locally on the operator's machine, push image). Adds one step to the deploy script but is the only path that works without network surgery. This is the single highest-impact fix in this review.

---

### [P1.2] Supabase free tier will exhaust connections under any real load.

**Evidence:** `go-platform/services/gateway/internal/wallet/service.go:202`:

```go
db.SetMaxOpenConns(envInt("WALLET_DB_MAX_OPEN_CONNS", 50))
```

Default pool size is **50** for the wallet subsystem alone. The gateway service almost certainly opens additional pools for other subsystems (positions, sportsbook, etc. — worth grepping for every `SetMaxOpenConns` call). The auth service opens its own pool.

**Supabase free tier hard limit: 60 direct connections, 200 pooled via Supavisor.** With defaults, gateway alone takes 50, leaves 10 for auth + everything else. First demo session that hammers the API will saturate the pool, then everything 504s.

**Fix in the plan:**
- Set `WALLET_DB_MAX_OPEN_CONNS=5`, `AUTH_DB_MAX_OPEN_CONNS=5`, etc., as `fly secrets`.
- Use Supabase's **Supavisor transaction-mode pooler URL** (port 6543), not direct (5432). The plan mentions this in a risk note but doesn't say it's *mandatory*.
- Run `MAX_OPEN_CONNS=2` per Go service to be safe — Supavisor multiplexes.

**[VERIFY-WITH-CODEX]** I want a real codex pass to enumerate every `SetMaxOpenConns` in the Go services so we can size pools precisely.

---

### [P1.3] Supavisor transaction-mode pooler breaks Go `database/sql` prepared statements silently.

**Evidence:** This is a well-documented Supabase + pgx/pq incompatibility. The Go `database/sql` driver uses `PREPARE`/`EXECUTE` under the hood when you call `db.Query` with placeholders. Supavisor's **transaction-mode** pooler reuses backend connections per *transaction*, not per *session* — so a `PREPARE` on connection A may be followed by an `EXECUTE` on connection B, which has never seen that prepared statement. You get a runtime `prepared statement does not exist` error.

**What breaks in this plan:** the gateway and auth services use `database/sql` with parameterized queries (standard Go pattern). They will work on first request and fail on roughly the second through N-th, intermittently.

**Fix options:**
1. **Use Supavisor session-mode pooler** (port 5432, slightly different URL) — keeps connection per session, prepared statements work, but connection count is closer to direct-connection limits. Still beats direct.
2. **Disable prepared statement caching** in the Go connection string: append `?default_query_exec_mode=simple_protocol` (for pgx) or use `binary_parameters=yes` carefully (for lib/pq). Adds latency, kills query plan caching.
3. **Use Supabase Pro tier** ($25/mo) which gives larger compute and proper session-mode pooling capacity. Defeats the "free tier" cost story.

**Recommendation:** Option 1 (session-mode pooler) plus low `MAX_OPEN_CONNS`. The plan currently says "Supavisor pooler URL (port 6543)" — that's the *transaction* mode port. Should be **5432 (session mode)** for Go services.

**[VERIFY-WITH-CODEX]** This is the finding I most want corroborated. It's a real incompatibility but the exact fix changes year to year as Supavisor evolves.

---

## P2 — Will work at first, then bite

### [P2.1] `sslmode=disable` is baked into source defaults; Supabase requires SSL.

The Go code's default DSN (used in seed and dev tooling) is:

```
postgres://user:pass@localhost:5432/predict?sslmode=disable
```

Supabase rejects non-SSL connections. The `fly secrets set` DSN must include `?sslmode=require` or `?sslmode=verify-full`. The plan doesn't show this. Add it to every example DSN.

### [P2.2] Cloudflare proxy mode (orange cloud) breaks Fly's Let's Encrypt issuance.

The plan says "Cloudflare-managed" DNS but doesn't specify proxy state. If the records are **orange-cloud (proxied)**, Cloudflare terminates TLS at the edge with its own cert, and Fly's HTTP-01 challenge for its own cert never reaches the origin → `fly certs` stays in "awaiting" forever. If **grey-cloud (DNS-only)**, the records resolve directly to Fly's edge IPs, Fly issues certs, all good — but you lose Cloudflare WAF + caching.

**Resolve:** Either DNS-only mode at Cloudflare (recommended; simplest), or full TLS via Cloudflare with origin certs installed on Fly (more involved). Plan must pick one.

### [P2.3] Cookie domain story for cross-subdomain auth is missing.

The Next.js apps live on `play.99rtp.io` / `office.99rtp.io` and call `auth.99rtp.io` for JWT. The docker-compose has `AUTH_COOKIE_SECURE: "false"` for dev. In production:
- Cookies must be set on `.99rtp.io` (with a leading dot) so all subdomains share them.
- `AUTH_COOKIE_SECURE=true` (HTTPS required).
- `SameSite=None` (cross-subdomain) or `Lax` if everything is same-site.
- CORS on `auth.99rtp.io` must include `credentials: true` and explicit origins, not `*`.

The plan mentions CORS in a risk note but doesn't mention the cookie domain knob at all. **[VERIFY-WITH-CODEX]** — exact cookie config depends on the auth service implementation, which I haven't read.

### [P2.4] Next.js 16 on Node 20 has a `next start` memory floor higher than 256 MB.

The plan sizes Next.js Fly machines at 512 MB — that's a bit tight for Next.js 16 SSR in prod, especially the player app with i18n, redux, recharts, WebSocket, GTM, etc. (visible in `package.json`). A first-load spike past 512 MB will OOM-kill the machine, which then enters a restart loop. Bump to **1 GB** for both Next.js apps (~$6/mo each) and budget a couple extra dollars. Don't ship with 512 MB and hope.

### [P2.5] `fly deploy --build-arg NEXT_PUBLIC_*` interacts badly with the monorepo Dockerfile path.

The plan says `fly deploy --dockerfile go-platform/services/gateway/Dockerfile`. That's the Go service. For the Next.js apps, the existing `docker/` directory has `dockerize.sh app` / `dockerize.sh office`. Those are bash wrappers, not Dockerfiles. You can't `--dockerfile docker/dockerize.sh`. The plan glosses over this.

**Fix:** check what `dockerize.sh` produces, and either (a) point `fly deploy` at the actual Dockerfile inside the script's output, or (b) write a thin Dockerfile per app that does `RUN yarn build && yarn start`. Option (b) is what most demo setups do; budget 30 min to author.

---

## P3 — Cosmetics / nice-to-have

### [P3.1] Supabase free tier auto-pauses after 7 days idle.
The plan mentions this and proposes a daily warmup ping. Good. But the warmup needs to actually hit Postgres, not just `/healthz` (which may not touch the DB). Make the warmup query `SELECT 1` via the gateway's DB.

### [P3.2] The `frontend` is the *same monorepo* as `phoenix-frontend`.
Both `package.json` say `"name": "taptrade-ui"` and the directory contents are byte-identical. Worth confirming you actually want to deploy them as two separate Fly apps vs. one app with two routes — saves money and build time. The difference between them is which lerna package starts (`@taptrade-ui/app` vs `@taptrade-ui/office`).

### [P3.3] The plan promises ~$0–8/mo. The honest range is wider.
Once you bump Next.js machines to 1 GB (P2.4), the Fly compute alone is ~$12–16/mo if running 24/7. With auto-stop and demo-hours-only usage, $5–8 is realistic. With always-on for a sales-team-on-call demo, budget $15. Update the plan's TL;DR.

---

## What was *right* about the plan

(Required for honest balance, not flattery.)

- Picking Fly + Supabase + Upstash beats GCP single-VM on cost AND Claude-operability — that judgment holds.
- Identifying that Vercel Hobby's commercial-use clause disqualifies it for a sales demo — correct call.
- Choosing Cloudflare DNS over registrar DNS for fast TTLs and Worker auth-gating later — sensible.
- Flagging the `NEXT_PUBLIC_*` build-time bake in the risks section — well-spotted, even though the deploy command in the plan doesn't fully wire it.

---

## Concrete revisions the plan needs before it's executable

1. **Add P1.1 fix** ("build locally + push image" workflow) as a first-class section, not a risk note. This is the difference between the plan working and not working.
2. **Change the Supavisor URL** in step 4 from port 6543 (transaction mode) to port 5432 (session mode), with `MAX_OPEN_CONNS=2–5` per Go service.
3. **Add `?sslmode=require`** to every example DSN.
4. **Specify Cloudflare DNS-only mode** explicitly in step 3.
5. **Bump Next.js Fly machines to 1 GB** in step 4. Adjust TL;DR cost to $5–15/mo.
6. **Add a one-paragraph auth/cookie config block** (cookie domain `.99rtp.io`, Secure, SameSite, CORS-with-credentials).
7. **Write the two thin Dockerfiles** for player and office apps, or document the dockerize.sh output path.
8. **Replace the warmup-ping** with a DB-touching endpoint.

After those, the plan is shippable. Without (1) and (2)/(3), it isn't — the demo will appear to deploy and then fail mid-demo.

---

## Recommendation

**Recommendation: Fix P1.1 (private registry) and P1.2/P1.3 (Supabase pool + pooler mode) before any other plan work** because both are blockers for the very first deploy attempt — every other revision is wasted effort if `yarn install` fails or the Go services can't talk to Postgres. The cookie/SSL/Cloudflare items (P2) only matter once a build actually completes.

After fixing P1, **re-run this review through real `/codex challenge` from the Claude Code terminal in the repo** to corroborate findings P1.3 and P2.3, which depend on implementation details (every `SetMaxOpenConns` call site, auth service cookie code) I sampled but didn't exhaustively read.

GATE: **FAIL** until P1.1, P1.2, P1.3 are addressed in the plan text.

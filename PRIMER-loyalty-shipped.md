# Primer — Loyalty + Leaderboards shipped (2026-04-23)

Start-of-session context after the `PLAN-loyalty-leaderboards.md` implementation cycle wrapped. The plan is done; a handful of stretch items are done too. This primer tells you what's live, what's open, and the concrete hooks for the next piece.

---

## Repo paths you'll touch most

Workspace root: `/Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict/`

- Player app (Next.js 16 App Router, port 3000): `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/`
- Gateway (Go, port 18080): `apps/Phoenix-Predict-Combined/go-platform/services/gateway/`
- Auth service (Go, port 18081): `apps/Phoenix-Predict-Combined/go-platform/services/auth/`
- Shared platform libs (httpx, canonical, tracing): `apps/Phoenix-Predict-Combined/go-platform/modules/platform/`
- Docker compose (postgres 5434, redis 6380): `apps/Phoenix-Predict-Combined/docker-compose.yml`

[CLAUDE.md](CLAUDE.md) + [apps/.../app/CLAUDE.md](apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/CLAUDE.md) are the ground truth for rules (never-reintroduce-sportsbook, no styled-components in `app/`, Redux Toolkit v1, bcrypt seed password shape, etc.). Read them first.

---

## What shipped this cycle (18 commits, `df2f98ae..a99bd7e6`)

### Plan scope (PLAN-loyalty-leaderboards.md)

Loyalty + leaderboards un-orphaned, end-to-end Predict-native:

- **Schema** — migration 015 (`loyalty_accounts`, `loyalty_ledger`, `leaderboard_snapshots`) + migration 016 (`punters.display_anonymous`).
- **Loyalty backend** — `internal/loyalty/predict_repo.go` + `predict_service.go` + `tiers.go`. SELECT FOR UPDATE serializes accruals; UNIQUE(idempotency_key) makes retries safe.
- **Settlement atomic accrual** — `LoyaltyAdapter.AccrueSettledWithTx` participates in the shared-tx settlement path. Wallet credit + loyalty accrual commit together; mid-flight failure rolls both back.
- **Leaderboards backend** — `internal/leaderboards/predict_repo.go` + `predict_service.go` + `predict_boards.go` + `predict_recomputer.go`. 5-min worker repopulates snapshots for Accuracy, Weekly P&L, Sharpness, and one Category Champions board per active category.
- **HTTP surface** — `/api/v1/loyalty`, `/api/v1/loyalty/ledger`, `/api/v1/loyalty/tiers`, `/api/v1/leaderboards`, `/api/v1/leaderboards/:id/entries`, `/api/v1/me/leaderboards`, `/api/v1/me/privacy`. Public vs auth split configured in `cmd/gateway/main.go` `gatewayPublicPrefixes`.
- **WS tier-up** — `ws.Hub.NotifyLoyaltyTierPromoted` broadcasts on `loyalty:<userID>` after atomic commit. TierPill subscribes via `app/lib/websocket/predict-ws.ts` (wire format matches the Go hub; the sportsbook `websocket-service.ts` does not and is not used for this).
- **Frontend** — `/rewards` (broadcast tier-ladder + 2fr/1fr grid + ledger table), `/leaderboards` (sidebar + detail, Category Champions dropdown), TierPill in `PredictHeader`, rank chip + `+X pts` suffix in `/portfolio`. Design tokens `--tier-1..5` added to `globals.css`.
- **Privacy opt-out** — `/account` page now has an "Appear anonymously on leaderboards" toggle. Flag lives on `punters.display_anonymous`; leaderboard display-name query renders `Trader #<rank>` when on. Tracked in TODOS.md ➡ moved to a Shipped section.
- **Legacy import CLI** — `go run ./cmd/gateway migrate-legacy-loyalty --from <path> [--dry-run]` pulls a sportsbook `loyalty-state.json` into Postgres with `ON CONFLICT DO NOTHING`. Auto-provisions `punters` rows for users that don't exist on Predict yet.

### Fixes that landed along the way (pre-existing bugs, not plan scope)

- **Auth service ran in in-memory mode silently** because `lib/pq` wasn't imported. Every container restart wiped users. Fixed. `alice@predict.dev` / `bob@predict.dev` / `charlie@predict.dev` / `bot@predict.dev` (password `predict123`) now auto-seed into `auth_users` with IDs matching the `punters` seed.
- **WebSocket upgrades returned 500 with "response does not implement http.Hijacker"** because `httpx.statusRecorder` embedded `http.ResponseWriter` without forwarding the Hijacker/Flusher interfaces. Every WS channel was broken, not just loyalty. Fixed in `modules/platform/transport/httpx/middleware.go`.
- **Channel authz fail-closed default rejected unknown prefixes**, so `loyalty:<userID>`, `portfolio:<userID>`, and `leaderboard:accuracy` were all rejected at subscribe time. `internal/ws/client.go:authorizeChannelAccess` now whitelists them explicitly (private for loyalty/portfolio, public for leaderboard).
- **Auto-provisioned `punters` rows used `username = userID`**, surfacing raw hex IDs like `u-71612d736d6f` on public boards. `prediction/sql_repository.go:ensurePunterExistsWithExec` now leaves `username` NULL so the leaderboards display-name fallback kicks in.
- **`/api/v1/leaderboards` was auth-gated** against plan §8. Public list + entries, `/me/leaderboards` for the per-user endpoint (moved out of the prefix so auth still applies there).

### Live-verified end-to-end

- Alice (`user-001`) logs in, settles BTC + FED markets via admin, earns 5175 raw points → promoted Trader → Sharp. Tier pill flips from slate `Trader · 18 pts` to gold `Sharp · 52 pts` in <2s via the WS event, before the 60s poll fires. Portfolio shows `+18 pts` on settled rows; rank chip shows `Weekly P&L · #1 · +$35.50`. Privacy toggle flips her display name between `alice` and `Trader #1` on `/api/v1/leaderboards/pnl_weekly/entries`.

---

## Running system, as of this primer

```
docker ps --format "{{.Names}}"
# predict_gateway · predict_auth · predict_postgres · predict_redis
```

Gateway binary was built against the tip of `main`. If you change Go code, `docker compose build gateway && docker compose up -d gateway` — there's no auto-rebuild. Auth service is the same pattern.

**Applied migrations:** through 016. `goose_db_version` table is in sync.

**Seeded data state:** 2 BTC + FED markets were settled during verification and aren't reset. Alice has loyalty_accounts points_balance=5175, tier=3 (Sharp). The `Weekly P&L` board has her at rank 1 via the recomputer. If you want a clean slate for demos, wipe `loyalty_accounts` + `loyalty_ledger` + `prediction_payouts` + `prediction_settlements` for the two settled markets and flip them back to `open`.

**Dev credentials** (same as CLAUDE.md, but now actually wired):
- `demo@phoenix.local` / `demo123` — auto-seeded, no matching punter row (no positions)
- `alice@predict.dev` / `predict123` — matches `user-001`, has 2 settled positions
- `bob@predict.dev` / `predict123` — matches `user-002`
- `charlie@predict.dev` / `predict123` — `user-003`
- `bot@predict.dev` / `predict123` — `user-bot`
- `admin@phoenix.local` / `admin123` — admin role, can POST `/api/v1/admin/settlements/:id`

---

## Known open items, ranked by value

### A. Fee model decision (tracked in [TODOS.md](TODOS.md))
The plan deferred fee-based tier benefits because `prediction_markets.fee_rate_bps` defaults to 0 everywhere. No market currently charges fees. Any "tier 4 discount" conversation needs this decided first. Three candidate approaches (Kalshi price-curve, Polymarket maker rebates + category tiers, flat % + tier discount) listed in TODOS.md. This is product, not engineering — next session should be `/office-hours` style if you want to explore.

### B. Sportsbook WebSocket wire-format mismatch
The sportsbook `app/lib/websocket/websocket-service.ts` speaks a different envelope than the Go hub (`event:subscribe` vs `type:subscribe`, singular `channel` vs plural `channels`). `LiveNow`, `MatchTimeline`, `FeaturedMatches` are all subscribing to dead channels. The Hijacker fix means the socket connects now, but the handshake messages are rejected. Either:
- Rewrite `websocket-service.ts` to match the Go hub (touches every sportsbook consumer but gives them real data again), OR
- Mark those components STUBBED in `FEATURE_MANIFEST.json` and let them die when sportsbook surfaces are fully retired.

### C. Visible hygiene issues I noticed but didn't fix
- Portfolio summary `Realized P&L` (`+$8.00`) doesn't match the rank chip's `+$35.50` after alice settles 2 positions — the summary looks like it's only counting one of them. There's a stale-cache or summation bug somewhere in `/api/v1/portfolio/summary` or its shared types.
- `/rewards` ledger "Event" column renders `Settled tradesettled trade (won)` — the reason line concatenated with the event label without a separator. Minor; look at `labelForEntry` vs `entry.reason` rendering.
- Mobile leaderboards sidebar collapses to horizontal tabs (intended) but the Category Champions dropdown inside one of those tabs is visually cramped.

### D. Tests
Zero tests were added this cycle for the new loyalty/leaderboards Go packages or the new frontend components. `go test ./internal/loyalty/...` still passes the pre-existing sportsbook tests; `internal/leaderboards/...` same. There are no tests at all for `predict_repo.go`, `predict_service.go`, `predict_recomputer.go`, `predict_privacy_handlers.go`, TierPill, or the privacy card. If you want to harden before more features, this is the gap.

### E. Plan §NOT-in-scope items (new-product scope each)
Referral program (Polymarket did one in 2026), season resets, rewards catalog / points-spending, tiered wallet deposit-limit benefits (RG/compliance lever). None have specs. Each wants its own `/plan`.

---

## How to resume in under a minute

```bash
cd /Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict/apps/Phoenix-Predict-Combined
docker ps | grep predict_  # expect 4 containers
# If any are down:
docker compose up -d postgres redis auth gateway

# Player app (dev server is probably not running under docker):
cd talon-backoffice/packages/app
NEXT_PUBLIC_API_URL=http://localhost:18080 npm run dev   # port 3000

# Rebuild gateway after Go changes:
cd ../../..
docker compose build gateway && docker compose up -d gateway

# Run a specific migration manually if goose tracking drifts:
docker exec predict_postgres psql -U predict -d predict -c "<ALTER/INSERT>"
docker exec predict_postgres psql -U predict -d predict -c \
  "INSERT INTO goose_db_version (version_id, is_applied, tstamp) VALUES (N, true, now())"
```

Smoke tests:
```bash
curl -s http://localhost:18080/api/v1/leaderboards | jq '.items | length'   # 9
curl -s http://localhost:18080/api/v1/loyalty/tiers | jq '.items | length'  # 6 (including hidden tier 0)
```

---

## Architectural rules that matter for any follow-on

- `prediction` Go package never imports `wallet` or `loyalty`. It has `WalletAdapter` and `LoyaltyAdapter` interfaces; concrete bridges live in `internal/http/`.
- Shared-tx settlement: `PersistResolvedMarketAtomic` now returns `([]LoyaltyAccrualResult, error)`. If you add more post-commit side effects (outbox, alerts, whatever), pipe them through this return path, not a separate tx.
- WS: server speaks `{type, channel, eventId, data}`. Use `predict-ws.ts` on the frontend, not `websocket-service.ts`. If you add a new channel, whitelist the prefix in `ws/client.go:authorizeChannelAccess` (private channels must match user ID; public ones just need to be listed).
- New tables/columns → new goose migration file. Do not edit `014_prediction_schema.sql` or later in place.
- Loyalty display: points are stored as raw cents-equivalent; display divides by 100. Tier is computed, not stored as truth — it's a denormalized column on `loyalty_accounts` updated by the repo.

---

## Immediate suggested next step

If you want a concrete engineering task: **fix issue (C.1) — the portfolio summary `Realized P&L` mismatch**. It's small, user-visible, and the fix surfaces whatever stale-cache or summation path is wrong in `/api/v1/portfolio/summary`. Alice's two settled positions are already in the DB as test data.

If you want a product conversation: **start (A) with `/office-hours`** — the fee model decision gates any future loyalty work beyond what just shipped.

Everything else on the list is larger scope and benefits from a dedicated `/plan` cycle.

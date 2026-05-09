# Morning briefing — 2026-04-29

You went to sleep at the end of the prediction-admin client unification work. Here's where things stand. Skim the bullets, then dig into whatever you want to commit / decide / push back on.

## State of the world

- **Branch `feat/predict-admin-client-unification`** is checked out, three commits ahead of `main`, **not pushed**, **no PR opened**. Everything is reversible by switching back to `main` and deleting the branch.
- **All test suites pass** (Go gateway / auth / platform; JS workspace; player app `node:test` 95/100 — the 5 failures are pre-existing `__dirname not defined in ESM` errors unrelated to this work).
- **Gateway is dockerized again** (`predict_gateway` container running with the new image). The `go run` from earlier is stopped. Healthcheck OK, new endpoint live.
- **Office dev server (preview) running on port 3001** (server id `c53ca81b-7269-4b29-ac69-6dfa042133f5`). `/dashboard`, `/prediction-admin/markets`, `/prediction-admin/settlements`, plus control routes verified 200 with login.

## What got committed

```
3c7e33d7  chore(office): remove orphaned admin-api.ts adapter
5ec8948f  feat(office): consume PredictionApiClient on prediction-admin pages and rewrite dashboard
d164f4c3  feat(api-client): add prediction admin surface and dashboard volume aggregate
```

Both `feat:` commits include detailed prose descriptions that explain the why and what; no need to re-summarize here. The `chore:` commit explains why `useAdminApi` was kept (`risk-management/page.tsx` still consumes it) and notes that hook's wrong `baseUrl` default as a follow-up.

To push:

```
git push -u origin feat/predict-admin-client-unification
gh pr create --base main --title "feat: prediction admin client unification (gateway + api-client + office)" --body "$(see commit messages)"
```

To discard:

```
git checkout main
git branch -D feat/predict-admin-client-unification
docker compose -f apps/Phoenix-Predict-Combined/docker-compose.yml build gateway
docker compose -f apps/Phoenix-Predict-Combined/docker-compose.yml up -d gateway
```
(That last `compose build` rebuilds the gateway without your dashboard code so the docker image stays in sync with `main`.)

## Endpoint added

```
GET /api/v1/admin/dashboard/volume?since=24h&topN=5    [admin-only]

Response shape:
{
  "since": "2026-04-28T13:30:00Z",
  "windowSeconds": 86400,
  "totalVolumeCents": 0,
  "tradeCount": 0,
  "topMovers": [
    { "marketId": "...", "ticker": "...", "title": "...",
      "yesPriceCentsStart": 52, "yesPriceCentsNow": 52, "volumeCents": 520 }
  ]
}

since: Go duration syntax + "Nd" convenience. Capped at 30d.
topN:  clamped to [1, 50].
```

Two SQL queries (volume aggregate + top-mover per-market first/last YES trade) against `prediction_trades` joined on `prediction_markets`. Both queries are covered by `idx_pred_trades_time` and `idx_pred_trades_market`.

## Test runs (logs at `/tmp/morning-briefing/`)

| Suite | Result |
|---|---|
| `go test ./...` (gateway) | all pass — `gateway/internal/{bets,bonus,cache,compliance,discover,domain,events,freebets,http,leaderboards,loyalty,matchtracker,oddsboosts,payments,prediction,provider,riskintel,tracing,wallet,ws}` |
| `go test ./...` (auth) | `phoenix-revival/auth/internal/http` ok 4.570s |
| `go test ./...` (platform) | all pass — `canonical/{adapter,replay,v1}`, `runtime`, `transport/httpx` |
| `lerna run test` workspace | api-client + app: no jest tests; utils: pass; office: skipped per project README (jest 25 + babel-jest + TS 5 hangs) |
| `node --test app/__tests__/*.test.ts` | 95 pass / 5 fail — see below |

The 5 player-app `node:test` failures are all the same flavor: tests import `path.resolve(__dirname, ...)` from inside an ESM-parsed file. Node 25.8.2 is stricter about CJS/ESM than older Node versions. The fix per file is one line:

```ts
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
const __dirname = dirname(fileURLToPath(import.meta.url));
```

Affected: `app/__tests__/{cashout-paths, compliance-paths, csrf-headers, qa-regressions-2026-04-18, wallet-paths}.test.ts`. Three of those test sportsbook clients (cashout, compliance, betting) so deleting them might be cheaper than fixing — but that's a "do you want to keep these tests" decision.

## Investigation A — sportsbook leftover inventory in `packages/app/`

Read-only audit. Three categories:

### Pure orphans (zero live consumers anywhere — safe to delete in a single chore commit)

```
app/components/BettingHeatmap.tsx           216 lines
app/components/BetHistoryList.tsx           550 lines
app/components/BetCard.tsx                  298 lines
app/components/LeagueNav.tsx                196 lines
app/components/LandingPage.tsx              376 lines
app/components/SportSidebar.tsx             170 lines
app/components/AccountStatusBar.tsx              (untested for size, but unreferenced)
app/lib/api/events-client.ts                675 lines  (consumed only by orphans + lib/query/hooks.ts)
app/lib/api/markets-client.ts               149 lines
app/lib/api/betconstruct-client.ts          278 lines
app/lib/query/hooks.ts                           (transitively orphaned — wraps betting/events clients
                                                  and is consumed by no live page)

Total: ~2900+ lines of dead sportsbook code
```

Verified by recursive grep: no `<BettingHeatmap`, no `<BetHistoryList`, etc. anywhere outside their own files. `events-client.ts` is imported by `LeagueNav` / `LandingPage` / `SportSidebar` (all dead) plus `lib/query/hooks.ts` (also dead). Once you delete the components, `events-client.ts` and `hooks.ts` follow naturally.

### Sportsbook-domain pages still wired (need product decision)

These import sportsbook clients (`compliance-client`, `wallet-client`) AND are reachable as routes — so they're alive in the live UI even if no nav links point to them today:

```
app/cashier/                — full cashier UI; AccountStatusBar (dead) used to link here, TopBar warms its slice
app/cashier/cheque/
app/profile/                — uses compliance-client (KYC) + user-client
app/account/rg-history/     — gambling responsible-gaming history
app/account/self-exclude/   — gambling self-exclusion
app/components/IdComplyModal.tsx     — KYC modal, used by cashier + AuthProvider
app/components/AuthProvider.tsx      — uses compliance-client to gate KYC state
```

These are gambling-specific concepts (KYC, RG, self-exclusion). Prediction markets in regulated US jurisdictions (Kalshi etc.) have their own compliance regime, so some of this might be salvageable. But it's all hooked through `compliance-client.ts` → `/api/v1/compliance/*` endpoints that are sportsbook-shaped on the gateway.

**Decision needed:** retire wholesale, retain as-is for the prediction compliance regime, or rewrite against new prediction-side endpoints.

### Domain copy in otherwise-neutral routes

Small numbers of sportsbook-flavored words in:

```
app/rewards/             4 hits   ("bet", "odds", etc. in copy)
app/responsible-gaming/  4 hits
app/terms/               3 hits
app/about/               4 hits
app/contact-us/          1 hit
app/privacy-policy/      1 hit
app/privacy/             2 hits
```

Content review, not code change.

### Probably keep / refine (used by both domains)

```
app/lib/api/wallet-client.ts          consumed by prediction TopBar — wallet exists in prediction
app/lib/api/auth-client.ts            shared
app/lib/api/discover-client.ts        consumed by prediction discover page
app/lib/api/leaderboards-client.ts    leaderboards exist in prediction
app/lib/api/loyalty-client.ts         loyalty exists in prediction (admin/loyalty/* on gateway)
app/lib/api/content-client.ts         CMS content
app/lib/api/privacy-client.ts         shared
app/lib/api/bonus-client.ts           bonuses/campaigns exist in prediction
app/lib/api/user-client.ts            shared
app/lib/api/client.ts                 base client
```

## Investigation B — WebSocket lifecycle event audit

**Bug confirmed:** when an admin halts / closes / voids / settles a market via the backoffice, the player app's WebSocket subscribers to `market:<id>` get **no update**. They have to refresh.

### Mechanism inventory

- WS hub at `internal/ws/hub.go` exposes typed broadcast helpers: `BroadcastEvent("market:<id>", "market_update", "price_update", data)`, `BroadcastEvent("trades:<id>", ...)`, `BroadcastEvent("portfolio:<userID>", ...)`.
- The HTTP layer talks to the hub via a small interface `marketUpdateBroadcaster` (defined in `internal/http/prediction_handlers.go`):
  ```go
  type marketUpdateBroadcaster interface {
      NotifyPredictionMarketUpdate(marketID string, data interface{})
  }
  ```
  This keeps the prediction HTTP layer loosely coupled to ws.

### What does fire WS events today

- **Order placement** — `registerOrderRoutes(mux, svc, notifier)` takes the broadcaster and calls `notifier.NotifyPredictionMarketUpdate(req.MarketID, buildMarketUpdatePayload(updated))` on success. Players see live price changes.

### What does NOT fire WS events

- `registerSettlementRoutes(mux, svc)` — no `notifier` parameter at all. None of:
  - lifecycle `open` / `halt` / `close` / `void`
  - settlement
- `prediction/lifecycle.go` and `prediction/settlement.go` — zero `Broadcast` / `Notify` calls.
- `internal/discover/promote.go` background worker calls `TransitionMarketStatus` and `ResolveMarket` directly — also no broadcast.

### Fix shape (NOT IMPLEMENTED — flagging for your call)

~30 minutes of work. Three steps:

1. Change `registerSettlementRoutes(mux, svc)` to `registerSettlementRoutes(mux, svc, notifier)`. Wire `wsHub` through at the `handlers.go:152` call site (same place `registerOrderRoutes` already gets it).
2. After each successful `TransitionMarketStatus` / `VoidMarket` / `ResolveMarket` in the lifecycle/settlement handlers, call `notifier.NotifyPredictionMarketUpdate(marketID, payload)` with the post-transition market state.
3. For background-worker transitions in `internal/discover/promote.go`, either inject the same broadcaster or add a callback hook on `prediction.Service` so promotion paths fire the same event.

Tests to add: per-handler test that asserts the broadcaster is called on success and not called on failure. The existing fake `marketUpdateBroadcaster` pattern in the test files can be reused.

Open question: should lifecycle events use the existing `market_update` event type or a new `market_lifecycle` type? Reusing `market_update` keeps the wire format consistent and lets the player app's existing market subscriber handle it without new code; a separate type would let a settlement-page subscriber filter without parsing the body. Lean toward the former for simplicity.

## Open follow-ups (already on the punchlist, no progress here)

5. **Antd 4 / React 19 incompat** — `Modal.confirm`, `Typography` ellipsis throw on `react-dom.render` / `unmountComponentAtNode`. Console deprecation noise today; runtime crash if exercised. Fix is antd v5 migration (real work).

6. **localStorage SSR guard in `@phoenix-ui/utils`** — your earlier revert kept the unguarded `localStorage.X` calls in src. The Node 25 stub localStorage gives a `getItem is not a function` runtime error on `/logs/` and `/account/settings/` SSR. Currently masked by whatever `utils/dist/` is on disk; will resurface on next `yarn build` in `packages/utils/`.

7. **`useAdminApi` baseUrl** — defaults to `http://localhost:3001/api`, which is the office's own origin (no such proxy). The only consumer is `app/(dashboard)/risk-management/page.tsx`. Likely silently 404s; worth a probe.

## Files I touched this session (for review)

```
Modified, committed:
  apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/handlers.go
  apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/prediction_admin_handlers_test.go
  apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/prediction_handlers.go
  apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/json_defaults_test.go
  apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/repository.go
  apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/service.go
  apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/sql_repository.go
  apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/types.go
  apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction/wallet_wiring_test.go
  apps/Phoenix-Predict-Combined/talon-backoffice/packages/api-client/src/prediction-client.ts
  apps/Phoenix-Predict-Combined/talon-backoffice/packages/api-client/src/prediction-types.ts
  apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/app/(dashboard)/dashboard/page.tsx
  apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/containers/prediction-markets/index.tsx
  apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/containers/prediction-settlements/index.tsx

Deleted, committed:
  apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/services/api/admin-api.ts

NOT touched (deliberately, per surgical rule):
  apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/services/api/api-service.ts   (legacy useApi tuple, sportsbook-era pages still use it)
  apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/app/hooks/useAdminApi.ts      (still consumed by risk-management/page.tsx)
  apps/Phoenix-Predict-Combined/talon-backoffice/packages/office/next.config.js                (rewrite is doing real work)
  apps/Phoenix-Predict-Combined/talon-backoffice/packages/utils/src/...                        (you reverted my localStorage fix earlier; respecting that)
  apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/...                              (player app — nothing in this work touched it)
```

## Logs

Test logs preserved at `/tmp/morning-briefing/`:
- `go-test-gateway.log` (full Go test output)
- `go-test-auth.log`
- `go-test-platform.log`
- `yarn-test-workspace.log` (lerna test)
- `node-test-app.log` (player app node:test, 95 pass / 5 fail with stack traces)

QA screenshots from earlier in this session at `/private/tmp/qa-screenshots/`:
- `04-dashboard.png` (initial broken-state with sportsbook widgets)
- `05-markets.png`, `06-settlements.png` (post-fix prediction-admin)

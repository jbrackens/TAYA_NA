# Demo Cheat Sheet — Taya NA Predict

## Stack startup (if everything is down)

From `apps/Phoenix-Predict-Combined`:

```bash
docker compose up -d                                                # postgres (5434), redis (6380), gateway (18080), auth (18081)

# Player app
cd talon-backoffice/packages/app
NEXT_PUBLIC_API_URL=http://localhost:18080 \
NEXT_PUBLIC_AUTH_URL=http://localhost:18081 \
NEXT_PUBLIC_WS_URL=ws://localhost:18080/ws \
npx next dev --webpack -p 3000 &

# Office
cd ../office && npx next dev --webpack -p 3001 &
```

Both Next servers MUST be `--webpack`. Default Turbopack crashes the office (antd 4.16 + styled-components incompatibility). PR #44 pinned the build script; the dev script was already correct.

## Credentials

| App     | URL                       | Email                 | Password   |
|---------|---------------------------|-----------------------|------------|
| Player  | http://localhost:3000     | demo@phoenix.local    | demo123    |
| Office  | http://localhost:3001     | admin@phoenix.local   | admin123   |

The auth-service form expects the field to be called **username**, not email. The forms in both apps already do this correctly; only matters if you ever curl the API.

## Pre-stage state (verified just now)

- **Wallet `u-1`**: $1,000.00 (round number for stage)
- **Position**: 71 YES @ 52¢ on SENATE-DEM-2026 ($37.62 invested)
- **Open markets**: 16 (8 unprofessional test markets voided this morning)
- **SENATE-DEM-2026**: open, 56¢ YES / 44¢ NO, hero market on the player home

## Demo flow (recommended)

1. **Player home** — http://localhost:3000/ — loads SENATE-DEM-2026 hero, trending sidebar, all real markets.
2. **Login** — top right "Log in" → `demo@phoenix.local / demo123`. Lands on `/predict/`. BAL $1,000 visible top right.
3. **Trade** — click any "Buy YES" → market detail page → trade ticket on the right → set $25 → click "Review trade · $25.00". **Note: this button SUBMITS, it does not open a confirm modal.** The price will move and the ticket re-quotes. Wallet drops by $25-ish.
4. **Portfolio** — top nav "Portfolio". See the Senate position with shares + cost basis.
5. **WebSocket pop** (the wow moment):
   - Open the office in another tab/window: http://localhost:3001/ → admin login.
   - Office sidebar → Markets → find SENATE-DEM-2026 (use search/pagination — 16 open, it's not on the first page necessarily). Click **Halt**.
   - Switch back to the player tab on /market/SENATE-DEM-2026. Within 1 second the trade ticket says **"This market is halted. Trading is paused."** and the LIVE pill in the header disappears.
   - Resume from the office (button changes to **Resume** = `lifecycle/open` under the hood) and the player UI re-enables in 1s.
6. **Office overview** — Markets sidebar entry → Markets list, Settlements queue, Risk Management, Audit Logs all render.

## Known gotchas (don't get caught)

| Surface | Issue | Workaround |
|---|---|---|
| Player trade ticket | "Review trade" button submits immediately, no confirm modal | Just narrate it as "one-click trade" |
| Player `/login` URL | 404 (login is at `/auth/login`) | Click the "Log in" button, don't type the URL |
| Player session | 15-minute TTL, then BAL shows $0 + "No open positions" silently | Re-login from /auth/login |
| Office `/users` page | Shows "Failed to load users" error state | Don't navigate there during the demo |
| Office Markets table | Title column truncates to ~3 letters at narrow widths | Use full-screen browser |
| Office `/risk-management/*` | Older sportsbook-shaped pages | Stick to `/prediction-admin/markets` and `/prediction-admin/settlements` |

## Top up wallet again if needed

```bash
curl -c /tmp/c -X POST http://localhost:18081/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"demo@phoenix.local","password":"demo123"}' >/dev/null
CSRF=$(grep csrf_token /tmp/c | awk '{print $7}')
curl -b /tmp/c -X POST http://localhost:18080/api/v1/wallet/credit \
  -H "Content-Type: application/json" -H "X-CSRF-Token: $CSRF" \
  -d '{"userId":"u-1","amountCents":100000,"idempotencyKey":"topup-'$(date +%s)'","reason":"demo top-up"}'
```

## If something looks broken on stage

- **Player BAL says $0 / portfolio empty**: session expired, re-login at /auth/login.
- **Office Sign In doesn't work**: cookies may have crossed apps (both on localhost). Open an incognito window for office.
- **WS halt doesn't propagate**: confirm gateway container is on current image (`docker inspect predict_gateway --format '{{.Created}}'` should be from May 1+). If older, `docker compose up -d --build gateway`.
- **Office build crashes on Turbopack worker error**: dev script is fine (already `--webpack`). If you're on `yarn build`, that's PR #44 territory — use `yarn build --webpack`.

## Hero markets (best demo material)

- **SENATE-DEM-2026** (Politics, $45K vol, 184d to close, hero) — currently 56¢
- **SENATE-GOP-2026** (Politics) — 59¢
- **HOUSE-DEM-2026** (Politics) — 52¢
- **FED-HOLD-MAY26** (Fed, 4.7d to close) — 48¢, good for "closing soon" narrative
- **GPT5-JUL26** (Tech) — 35¢

Avoid scrolling to the IMP-* markets — they're test fixtures with awkward titles even after the cleanup.

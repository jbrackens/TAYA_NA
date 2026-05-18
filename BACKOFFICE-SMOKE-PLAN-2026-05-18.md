# Backoffice Smoke Test Plan — 80 scenarios (2026-05-18)

Purpose: smoke-test the Taya NA Predict **backoffice**, with the majority of
scenarios explicitly verifying the **backoffice ↔ player-app bridge** (shared
gateway + Postgres + WebSocket hub). Each scenario states the backoffice
action and the cross-surface verification that confirms data
transferred/bridged correctly.

## 0. Preconditions & runnability (READ FIRST — added 2026-05-18 post-investigation)

The test *design* is ready. Two backoffice surfaces are broken in ways that
generate **false defects**, and one data-render bug blocks most UI-side
assertions. Tag every scenario **API/DB-verifiable** (runnable now via the
§harness curl + Postgres) vs **UI-render-dependent** (blocked until the
data-render bug below is fixed). That makes ~half the suite runnable today
and the whole thing runnable once the residuals land.

**(a) Backoffice auth-session thrash — FIXED (commit `ed71d8c3`).**
`utils/auth.ts` `ROUTE_AUTH` was `/auth` (no such page → every auth bounce
404'd → unrecoverable redirect loop; all admin pages rendered empty). Fixed
to `/auth/login` + `buildRedirectUrl` now emits `?returnUrl=`. Verified live.
**Runnability gate:** the office build under test MUST include `ed71d8c3`.
As of writing it is committed locally but **not pushed** — if testing the
deployed office (`office.99rtp.io`) push + redeploy first; locally, ensure
the dev server is running that commit. Without it, **every** UI scenario
false-fails at login.

**(a.1) "0 markets" data-render bug — OPEN, dominant UI-side blocker.**
Even authenticated, the markets/settlements/list containers fetch the
gateway (`GET :18080/api/v1/markets?status=… → 200` with real data) but
render empty ("0 markets / No Data"). Until fixed, **any scenario whose
verification is "the backoffice UI shows X"** (large parts of Groups
B/C/D) will false-fail. Verify those via the §harness API/DB path instead,
and mark UI-render assertions BLOCKED, not DEFECT. (Same class also breaks
the `/dashboard` volume widget: admin API is cross-origin `:3001→:18080`
and the `access_token` cookie is `SameSite=Lax`, so `GET
/api/v1/admin/dashboard/volume → 401` then `refresh → 400` — affects
**#49, #58, #76** UI-side; verify via API/DB.)

**(b) audit-logs is known-broken — quarantine #2, #33, #46, #75.**
`containers/audit-logs/index.tsx` has an infinite `setState`-in-`useEffect`
loop and its api-service base resolves to `undefined`
(`GET /undefined/admin/audit-logs → 404`). Scenarios that assert via the
audit-logs **page** will fail for that reason, not a bridge break. Mark
them BLOCKED, or verify the audit row directly in Postgres
(`prediction_lifecycle_events` / the audit table) instead of via the page.

**(c) Verified admin endpoint table (replaces the inferred Group B/D paths).**
The §harness line pointing at `prediction_admin_handlers.go` is wrong —
there is no such source file (only the `_test.go`). Actual registrations
are in `go-platform/services/gateway/internal/http/prediction_handlers.go`
(`registerSettlementRoutes`, `registerDashboardRoutes`):

| Action | Verified route |
|---|---|
| Create market | `POST /api/v1/admin/markets` |
| Lifecycle (open/halt/close/void) | `POST /api/v1/admin/markets/{id}/lifecycle/{action}` |
| Settle | `POST /api/v1/admin/settlements/{marketId}` |
| Drift alerts | `GET /api/v1/admin/prediction/drift-alerts?since=24h` |
| Dashboard volume | `GET /api/v1/admin/dashboard/volume?since=&topN=` |
| Loyalty admin | `/api/v1/admin/loyalty/{adjustments,config,referrals}` |
| CMS/promo admin | `/api/v1/admin/{content/pages,banners,campaigns,bonuses}` |
| Public (player+bridge) | `/api/v1/{markets,categories,events,discover,portfolio,orders}` |

**Not found in the registered route table:** `GET /api/v1/admin/positions`
(referenced by **#49**), and admin book/positions views assumed by
**#51/#52/#53**. Reconcile these against the gateway or the player/public
endpoints + Postgres before scripting — do not assume they exist.

**(d) Seed / reset / teardown discipline.**
- Seed must have run (`go run ./cmd/seed`; 152 markets / 22 closed present
  in local DB as of 2026-05-18). Empty results ≠ "intended" — verify the
  gateway directly before recording a defect.
- Group D (settle/void) is **irreversible**. Use a unique per-run ticker
  prefix (e.g. `SMOKE-<ts>-…`) so #16/#19 stay deterministic on re-run, and
  `make wipe-demo` (resets only demo-written rows) between Group D passes.
- **Never run destructive scenarios against the Hetzner box.** Local /
  dedicated test DB only.

**Tier-0 gate (run first, must pass before the rest):** #9, #21, #24,
#35–#38, #48, #80 — all API/DB-verifiable, so runnable today.

---

## Test harness reference (so these are runnable)

- Backoffice :3001 · Player preview :3010 · Gateway :18080 · Auth :18081 ·
  Postgres :5434 (`docker exec $(cd apps/Phoenix-Predict-Combined && docker compose ps -q postgres) psql -U predict -d predict -c "…"`).
- Admin creds: `admin@phoenix.local` / `admin123`. Player: `demo@phoenix.local`
  / `demo123` (→ user `u-1`).
- Auth/CSRF (stateless double-submit; access_token cookie is HttpOnly — use an
  explicit Cookie header, `curl -b jar` is unreliable):
  ```
  cd /tmp && rm -f jar
  curl -s -i -c jar -o /dev/null -X POST http://localhost:18081/api/v1/auth/login \
    -H 'Content-Type: application/json' -d '{"username":"admin@phoenix.local","password":"admin123"}'
  ATK=$(grep -i 'access_token' jar | awk -F'\t' '{print $7}' | tail -1)
  CSRF=$(grep -i 'csrf_token' jar | awk -F'\t' '{print $7}' | tail -1)
  CK="Cookie: access_token=$ATK; csrf_token=$CSRF"
  curl -s -H "$CK" -H "X-CSRF-Token: $CSRF" -H 'Content-Type: application/json' -X POST http://localhost:18080/api/v1/... -d '{...}'
  ```
- Bridge channels (WebSocket): `market:<id>`, `trades:<marketId>`,
  `portfolio:<userId>`, `wallet`, `event:*`, `category:*`. Redis read cache
  ~≤60s — bridge checks should allow for cache TTL **or** assert via the WS
  push (immediate).
- Gotchas: known-good open order_book market
  `4056a256-1a78-b385-0b24-a35c5b607a77`; no open AMM market in the seed
  (AMM is pre-019 back-compat, unit-only); `KYC_ENFORCEMENT` off by default;
  settlements/voids are **irreversible** — use throwaway markets. A replayed
  `idempotencyKey` short-circuits before the RG gate (use a fresh key per
  probe; cancel probe orders).
- Some admin endpoint paths in Groups B/D were partly inferred from the
  backoffice client — confirm against
  `apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/http/prediction_admin_handlers.go`
  before scripting.

---

## Group A — Backoffice auth, RBAC & shell (1–8)

1. Admin login (`admin123`) lands on App-Router `/dashboard`; player creds (`demo123`) are **rejected** from the backoffice (role gate).
2. `securedPage` enforces role: a TRADER/OPERATOR token cannot open `/users` or `/audit-logs` (ADMIN-only) → redirect/403.
3. Backoffice uses the same auth service as the player app — a token issued at :18081 works for both; backoffice logout does not silently kill an independent player session.
4. Direct-URL access to `/prediction-admin/settlements` while unauthenticated → bounced to login, no data leak.
5. Backoffice 401 mid-action triggers the PredictionApiClient refresh-retry (not a dead "API error: 401").
6. `/prediction-admin/markets` table loads live markets (D-4 corrected — confirm it fetches via the same `/api/v1/markets` the player `/dashboard` uses; non-empty).
7. CSRF double-submit enforced on every backoffice mutation (create/lifecycle/settle) — missing `X-CSRF-Token` → 403.
8. Backoffice `/dashboard` routes operators into `/prediction-admin/markets` (the canonical market-management surface).

## Group B — Market creation → player visibility bridge (9–20)

9. Create a market in backoffice (`POST /api/v1/admin/markets`) → it appears in **player `/predict` discovery** (and `GET /api/v1/markets`) within cache TTL.
10. Created market's ticker/title/category/closeAt entered in backoffice match exactly what the player market-detail page renders.
11. New market defaults to `order_book` execution mode (post-019) — player trade ticket shows the order-book UI, not AMM.
12. Market created `unopened` is **not** tradeable in the player app (trade ticket disabled / not in open discovery).
13. Create market under a specific category → player **category page** `/category/<slug>` includes it; category counts update.
14. Create market linked to an event → player **event view** groups it under that event (or, per LC-29, document the unbuilt event-detail view).
15. `yes_price_cents + no_price_cents = 100` invariant from creation holds in the player price display.
16. Duplicate ticker creation rejected in backoffice; player discovery shows no duplicate.
17. Create market with an AMM liquidity param → AMM seed reflected; player pricing engine (LMSR) consistent with the backoffice config.
18. Created market's `closeAt` drives the player "closing soon" section and the countdown.
19. Backoffice market list pagination/filter (`status=*`) returns the same set the gateway serves player discovery.
20. Create → query Postgres `prediction_markets`: row exists with the backoffice-entered fields (DB bridge integrity, no transform loss).

## Group C — Market lifecycle transitions → player reflects (21–34)

21. Backoffice `open` a market (`/lifecycle/open`) → player app shows it tradeable; WS `market:<id>` push flips status without refresh.
22. Backoffice `halt` an open market → player trade ticket blocks new orders; existing resting-order state correct; status badge = halted.
23. Backoffice `halt`→`open` (resume) → player trading re-enabled; no stuck UI.
24. Backoffice `close` a market → player can no longer place orders; market leaves "open" discovery; resting orders swept by RestingOrderExpirer → `expired` with RG released.
25. Backoffice `void` from `open` (skipping closed) → player positions refunded at entry cost; market shows voided.
26. Invalid transition (e.g., `settled`→`open`) rejected by the FSM in backoffice; player state unchanged (no partial bridge).
27. MarketCloser worker auto-closes a market past `close_at` → player reflects closed with **no** backoffice action (worker bridge).
28. Lifecycle transition writes a `prediction_lifecycle_events` row; backoffice lifecycle/audit view and the DB agree.
29. Concurrent backoffice halt while a player order is in flight → no oversell/inconsistent state; one authoritative outcome (LC-31/D-1 guard).
30. Transition emits `NotifyPredictionMarketUpdate`; a subscribed player client updates the market card in real time (WS bridge, pre-cache-TTL).
31. Halt does not corrupt the order book; on resume the same book is intact for the player.
32. Backoffice close → player `GET /api/v1/markets/<id>/book` shows no new matches possible.
33. Lifecycle action by ADMIN recorded with actor/timestamp; audit-logs page shows it; matches DB.
34. Rapid open→halt→open converges to a single consistent player-visible state (no race/stale WS).

## Group D — Settlement & void → player payouts/positions/balances bridge (35–48)

35. Backoffice settle a closed market YES (`POST /api/v1/admin/settlements/<id>`, with attestation) → player **portfolio**: YES holders paid 100¢/contract, NO holders 0.
36. Post-settlement player **wallet balance** increases by exactly the payout (WS `wallet`/`portfolio` push + `GET /api/v1/portfolio`); DB `wallet_ledger` has the payout entry.
37. Settled market moves to player **History/Leaderboards**; accuracy %/PnL recompute correctly.
38. Settlement is idempotent — re-POST the same settlement → no double-credit (player balance unchanged on replay); payout key `prediction_payout:<settlement>:<position>` dedupes.
39. Settle NO → inverse payout; spot-check a known NO holder's player balance delta.
40. Settlement requires attestation source/data; backoffice rejects without it; no partial payout reaches the player.
41. Collateral-imbalance settlement surfaces the gateway error in backoffice; admin `overrideReason` path → settles; player payouts still conserve cash (no phantom issuance).
42. `void` a closed market → every player position refunded at `entry_cost` (not 0, not payout); idempotent on re-void.
43. Settlement transitions `closed`→`settled` atomically (PersistResolvedMarketAtomic) — player never sees a half-settled market (positions paid while status still closed).
44. Resting orders on the market at settlement: RG committed stake released; player RG bet-limit usage drops accordingly.
45. AutoSettler worker settles via feed attestation with no backoffice action → player payouts identical to a manual settle (worker bridge).
46. Settlement "type ticker to confirm" guard prevents accidental settle; aborting leaves player state untouched.
47. Post-settlement, player can no longer trade the market; trade ticket disabled; `/api/v1/orders` rejects.
48. Settle → query Postgres `prediction_settlements` + `positions`(settled) + `wallet_ledger`: all consistent with the player portfolio (end-to-end DB bridge).

## Group E — Player action → backoffice reflects (reverse bridge) (49–58)

49. Player places an order → backoffice **dashboard volume** / open-positions increases; `GET /api/v1/admin/positions` includes it.
50. Player trade fills → backoffice market drift/collateral view updates; trade visible in the admin trade/audit listing.
51. Player places a resting limit → backoffice market detail shows the same top-of-book depth.
52. Player position → backoffice user-detail/positions for `u-1` shows matching qty/avg-cost.
53. Player cancels an order → backoffice open-orders count decrements; reservation released (admin collateral view).
54. Player deposit/withdrawal → backoffice wallet/risk view reflects the balance change; DB `wallet_ledger` agrees.
55. Player KYC document submit (`kyc/submit-document`) → backoffice KYC/compliance queue shows it pending for that user.
56. Player sets an RG bet-limit → backoffice user/compliance view shows the limit; both read the same compliance service.
57. Player self-excludes → backoffice user status reflects excluded; admin cannot accidentally re-enable trading outside the proper flow.
58. High player trade volume → backoffice analytics/volume report aggregates match the sum of player trades in DB.

## Group F — Risk / compliance / user admin → player enforcement bridge (59–68)

59. Admin suspends a user → that player's session can no longer place orders (enforcement bridge); clean error, no money movement.
60. Admin restores a suspended user → player trading works again.
61. Admin views drift alerts; a collateral-imbalanced market shows the alert; player trading on it still safe (no oversell — LC-31/D-1 guard).
62. Admin adjusts a per-market risk/exposure limit (if surfaced) → player order exceeding it is rejected at the gateway.
63. Admin-set RG configuration is the same service the player RG gate consults (cool-off/self-exclusion/bet-limit) — one source of truth, no divergence.
64. KYC enforcement toggled on (temporary override) → player withdrawal above threshold gated by backoffice KYC status; restore env afterward.
65. Cross-account safety: an admin action targeting user A does not mutate user B (D-6 session-binding / admin-scope analog).
66. GET-disclosure fix holds from the admin side: admin endpoints don't let a non-admin enumerate another user's RG/KYC via `?userId=`.
67. Admin user-search/filter (role, kycStatus) returns data consistent with the player profile/compliance state for sampled users.
68. RG bet-limit usage shown in backoffice for a user equals the usage the player's own `/rg/bet-limits` returns (post the TOCTOU + monthly-reset fixes).

## Group G — Real-time (WebSocket) & cache bridge integrity (69–74)

69. Backoffice price/status change pushes `NotifyPredictionMarketUpdate` → player market card updates **without refresh** (immediate, pre-cache-TTL).
70. A fill (player or bot) pushes `NotifyPredictionTrade` + order-book update → player and backoffice market views converge to the same book.
71. Settlement pushes `NotifyPortfolioUpdate` + `NotifyWalletUpdate` → player portfolio/balance update live.
72. WS reconnect after a drop: player re-subscribes and post-reconnect state matches the authoritative DB (no lost admin-driven transition).
73. Redis cache: after an admin write, a player read within TTL is either WS-invalidated or converges within ≤60s — verify no **stale-forever** divergence.
74. New market creation pushes `NotifyCategoryUpdate`/`NotifyEventUpdate` → player category/event lists update without a hard reload.

## Group H — Audit, analytics, content & resilience (75–80)

75. Every admin mutation (create/lifecycle/settle/void/user-status) writes an audit row with actor+timestamp+delta; audit-logs filtering works and matches DB.
76. Backoffice analytics/volume/settlement reports reconcile with raw DB aggregates (no double-count, no missing trades) and with player leaderboards.
77. Content/campaign/banner published in backoffice → appears in the player app (CMS bridge) and is removable.
78. Backoffice resilience: malformed/oversized admin payload → clean 400/413 (MaxBodySize + Recovery middleware), no 500/panic, no partial bridge write.
79. Settlement attempted on a non-`closed` market via API → rejected; player state untouched (FSM guard end-to-end).
80. Full round-trip integrity: create → open → player trades → close → settle, then reconcile Postgres (`markets/orders/positions/trades/settlements/wallet_ledger`) against both the backoffice views and the player portfolio — **zero drift** across all three surfaces.

---

## Coverage notes

- ~60/80 are explicit cross-surface bridge checks: backoffice→player
  (Groups B/C/D/F/G), player→backoffice reverse-bridge (Group E), and
  end-to-end reconciliation (#48, #80).
- Regressions from the 2026-05-16/17 fix session are folded in: LC-31
  oversell (#29/#61), GET-disclosure (#66), RG-TOCTOU + monthly-reset
  (#68), expired-order sweep (#24/#44), LC-37 client refresh (#5).
- Recommended priority subset (bridge-critical, run first): #9, #21,
  #24, #35–#38, #48, #80.
- Severity convention (suggested for results): S1 money/payout/oversell ·
  S2 major bridge desync or enforcement gap · S3 UX/cosmetic · note
  PASS / DEFECT / UNBUILT-FEATURE per the existing UAT-SMOKE doc style.

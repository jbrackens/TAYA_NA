# Loop 357 - Dual-Admin Resolution API Journey

Generated: 2026-06-28T18:55:00Z

## Scope

This proof extends the authenticated critical-path API journey with proposed-resolution challenge windows and dual-admin finalization. It covers a fresh migrated/seeded stack with non-redeemable point mode, no legacy money routes, and deterministic seeded launch markets.

## Runtime

- Postgres: fresh `postgres:16-alpine` container `tiangge-e2e-pg-357` on `127.0.0.1:56551`
- Gateway DB migrations: version 48
- Demo seed: `go run ./cmd/seed -mode demo`
- Auth: `AUTH_STORE_MODE=db`, `AUTH_DB_DSN=postgres://postgres:postgres@127.0.0.1:56551/postgres?sslmode=disable`, `PORT=18081`
- Gateway: `MARKET_SYNC_ENABLED=false`, DB-backed gateway/wallet stores, `PORT=18180`
- Player proxy: `PREDICT_BASE_URL=http://127.0.0.1:3022`

## Evidence

- Gateway status returned `pointMode=non_redeemable_points` and `legacyMoneyRoutes=disabled`.
- Fresh market list returned 15 seeded markets with six open launch markets, including order-book and AMM fixtures.
- `ops@phoenix.local` and `demo@phoenix.local` logins succeeded through DB-backed auth, proving the seeded staff/admin fallback was active.
- The Playwright critical-path API suite passed 9/9 tests:
  - public market/category data
  - demo-player CLOB order fill
  - portfolio accounting shape
  - KYC lifecycle
  - player admin-authz denial
  - absent money/crypto routes
  - new-user starter grant and trade
  - admin close/direct settlement/ledger/leaderboard appearance
  - dual-admin challenge resolution with dispute review before point settlement
- Focused Go route/service regression tests passed for:
  - explicit zero-hour proposed-resolution challenge windows
  - dual-control dispute-gated finalization
  - proposer cannot finalize their own proposal
  - point-native settlement aliases and retired alias absence
  - imported far-future market time JSON clamping

## Dual-Admin Flow Proven

The new API journey proves:

- Admin A closes an order-book market with an existing holder position.
- Admin A proposes a YES resolution through the challenge-window path.
- Direct settlement is rejected while the challenge flow is active.
- Admin A cannot finalize their own proposed resolution.
- The holder files a dispute with `bondPointsCents`, `unit: "PTS"`, and no retired bond alias.
- Admin A cannot resolve the dispute they triggered.
- Admin B rejects the dispute.
- Admin B finalizes the proposed resolution.
- Settlement response exposes `pointDisbursements`, `settlementPointsCents`, `totalSettlementPointsCents`, and `unit: "PTS"`.
- Retired settlement aliases such as `payouts`, `payoutCents`, `pnlCents`, `totalPayoutCents`, and `currency` are absent.
- The user ledger receives the settlement credit.

## Scenario Status

- Scenario 7 remains Partial: dual-admin challenge resolution is now fresh-stack API-backed, but office-browser admin variants and broader lifecycle UI review remain.
- Scenario 10 remains Partial: settlement/dispute operations are stronger, but full admin operation/export browser proof remains incomplete.
- Scenario 11 remains Partial: the critical API surface is stronger, but broader launch contract cleanup remains incomplete.
- Scenario 12 remains Partial: the point settlement trust boundary is stronger, but full browser journey, complete preservation review, backend terminology cleanup, and broader abuse evidence remain incomplete.

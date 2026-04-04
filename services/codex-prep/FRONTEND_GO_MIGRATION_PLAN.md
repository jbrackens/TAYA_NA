# Phoenix Frontend Migration Plan to the Go Backend

Date: 2026-03-10
Owner: Claude CLI
Scope: Move the rebuilt player-facing frontend onto the new Go backend in `codex-prep` without depending on the old Scala Phoenix backend.

## Objective

Migrate the real product frontend to the Go platform.

This does **not** mean preserving the old backend API shape forever. The target is a frontend that cleanly consumes the Go platform contract.

## Frontend codebase in scope

Primary frontend:

- `/Users/johnb/Desktop/PhoenixBotRevival/apps/Phoenix-Sportsbook-Combined/phoenix-frontend-brand-viegg`

Temporary thin demo frontend:

- `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/phoenix-demo-web`

## Current state

The rebuilt sportsbook frontend UI exists and is materially more polished than the thin demo frontend. However, it still assumes the old Phoenix backend contract.

Examples already verified in code:

- login expects `POST login`
- refresh expects `POST token/refresh`
- account/session/payment flows expect old endpoints under the legacy app contract

Relevant files:

- [api-service.ts](/Users/johnb/Desktop/PhoenixBotRevival/apps/Phoenix-Sportsbook-Combined/phoenix-frontend-brand-viegg/packages/utils-core/src/services/api/api-service.ts)
- [login component](/Users/johnb/Desktop/PhoenixBotRevival/apps/Phoenix-Sportsbook-Combined/phoenix-frontend-brand-viegg/packages/app-core/components/auth/login/index.tsx)

The Go platform exposes a different contract via:

- [SERVICE_CONTRACTS.md](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/SERVICE_CONTRACTS.md)

## Migration strategy

Recommended approach:

Do **not** try to preserve every legacy endpoint shape.

Instead:

1. keep the rebuilt frontend UX
2. replace the data layer with typed Go-facing service clients
3. add a thin frontend BFF/adapter only where strictly necessary
4. retire legacy contract assumptions feature by feature

This is better than building a giant compatibility shim for the old API.

## Success definition

The frontend migration is complete when:

1. the rebuilt sportsbook frontend runs entirely against Go services
2. auth, wallet, markets, betting, account, and promotions work
3. prediction module works against Go prediction APIs
4. Talon-facing admin needs are handled by separate admin work, not by the player app
5. no player-facing page depends on the Scala Phoenix backend

## Workstreams

## Workstream 1: Contract Inventory and Route Mapping

Priority: Critical

### Deliverables

1. Inventory every frontend API call used by the player app
2. Map each one to one of:
   - direct Go equivalent exists
   - partial Go equivalent exists
   - no Go equivalent exists
3. Produce a migration matrix by page/module

### Acceptance criteria

- no hidden old-backend dependency remains untracked

## Workstream 2: Frontend API Layer Rewrite

Priority: Critical

### Deliverables

1. Replace the current legacy-centric API helper layer with a typed Go-facing client layer
2. Isolate service domains:
   - auth/user
   - wallet/payments
   - events/markets
   - betting
   - retention
   - social
   - cms
   - compliance
   - prediction
3. Remove scattered string endpoint assumptions from components

### Recommendation

Create a new frontend API layer rather than incrementally mutating the current one in place.

Reason:

- cleaner migration
- easier contract auditing
- lower risk of mixed old/new behavior

## Workstream 3: Auth and Session Migration

Priority: Critical

### Areas to migrate

- login
- logout
- refresh
- user profile
- permissions/roles
- session handling

### Notes

This depends on backend parity work for:

- MFA/login-with-verification if still required
- session timer / session info if still required

### Acceptance criteria

- users can register and log in through Go only
- token refresh works
- auth guards are Go-native

## Workstream 4: Wallet and Cashier Migration

Priority: High

### Areas to migrate

- wallet summary
- transactions
- deposits
- withdrawals
- balance updates after betting/settlement

### Notes

If the backend introduces `phoenix-payments`, the frontend should talk to that service for cashier orchestration and keep `phoenix-wallet` for ledger views.

### Acceptance criteria

- wallet and cashier screens use Go APIs only

## Workstream 5: Sportsbook Market and Betting Migration

Priority: High

### Areas to migrate

- sports list
- leagues
- fixtures/events
- market lists
- betslip
- place bet
- open bets
- cashout

### Acceptance criteria

- sportsbook board and fixture flows run entirely on Go APIs

## Workstream 6: Prediction Module Migration

Priority: Critical after backend prediction service exists

### Areas to migrate

- prediction landing page
- featured/live markets
- market cards
- order placement/cancel
- user activity/history

### Notes

This depends entirely on backend Workstream 1 in the backend plan.

### Acceptance criteria

- frontend can expose dual modules:
  - Sportsbook
  - Prediction Markets

## Workstream 7: Content, Retention, Social, and Compliance

Priority: Medium

### Areas to migrate

- promotions/pages/banners
- loyalty points
- achievements
- leaderboards
- social profile/following/feed where used
- notification preferences
- safer-play limits/restrictions

### Acceptance criteria

- all these pages use Go endpoints and share consistent auth state

## Workstream 8: Realtime Layer

Priority: Medium

### Areas to migrate

- market refresh/live updates
- wallet updates
- bet updates
- engagement streams

### Notes

This depends on the backend realtime workstream.

### Acceptance criteria

- no frontend websocket dependency remains on the old backend

## Sequencing

## Phase F1: Inventory — COMPLETE

1. Build exact API dependency inventory from the frontend codebase
2. Produce page/module contract map

Output:

- **[FRONTEND_API_DEPENDENCY_INVENTORY.md](./FRONTEND_API_DEPENDENCY_INVENTORY.md)** — 70 endpoints audited, migration matrix, blocked/ready classification, response shape diffs, and recommended migration sequence

## Phase F2: New API Layer

1. Build Go-native API clients
2. Add typed models
3. Add adapter hooks for React consumers

Output:

- one clear client layer for the Go backend

## Phase F3: Auth + Wallet

1. Migrate login/register/refresh
2. Migrate profile/account basics
3. Migrate wallet/cashier

Output:

- user can authenticate and fund through Go

## Phase F4: Sportsbook Core

1. Migrate market board
2. Migrate event detail
3. Migrate betslip/place bet/open bets/cashout

Output:

- sportsbook fully live on Go

## Phase F5: Product Surfaces

1. Migrate content/promotions
2. Migrate loyalty/achievements/leaderboards
3. Migrate social/compliance surfaces used by players

Output:

- broader platform pages live on Go

## Phase F6: Prediction

1. Wire prediction module once `phoenix-prediction` exists
2. Restore the product toggle on the real frontend against Go APIs

Output:

- dual-product frontend on Go

## Phase F7: Realtime + Cleanup

1. Replace old realtime assumptions
2. remove dead legacy API code
3. cut final dependencies on Scala backend

Output:

- frontend fully severed from old backend

## Immediate backlog for Claude

Execute in this order:

1. Continue from branch `feature/go-backend-migration` and existing Go client work
2. Reconcile all currently disabled/stubbed frontend features against the CURRENT Go backend, not the older blocker list
3. Re-enable features that are now unblocked on Go:
   - terms/acceptance
   - responsible gaming flows and histories
   - MFA / verification UX
   - KBA / IDPV UX
   - promotions/freebets/odds boosts
   - sportsbook enrichments (`precheck`, `bets/status`, stats-centre, match-tracker, websocket hookup)
4. Validate the corrected migration pass on Node 20
5. Then move to the next real product-facing slice:
   - prediction module on Go if the current service contract is sufficient
   - otherwise finish sportsbook realtime/polish and produce an exact prediction blocker list

## Non-goals

- Do not preserve the old API shape just for comfort
- Do not drag the Scala contract forward indefinitely
- Do not make the player app depend on Talon/admin APIs
- Do not use the thin `phoenix-demo-web` as the final product frontend

The thin demo frontend is an interim public demo asset, not the long-term player app.

## Done criteria

This plan is complete when:

- `phoenix-frontend-brand-viegg` runs against Go services only
- the old Phoenix backend can be removed from player-facing runtime responsibilities
- the frontend supports both sportsbook and prediction against the Go platform

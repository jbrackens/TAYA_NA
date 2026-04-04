# Phoenix Frontend API Dependency Inventory & Migration Matrix

**Date:** 2026-03-10
**Phase:** F1 — Contract Inventory
**Frontend:** `phoenix-frontend-brand-viegg`
**Target Backend:** Go microservices (codex-prep)

---

## How to read this document

- **Frontend endpoint** = what the frontend currently calls (old Scala contract)
- **Go equivalent** = the target Go endpoint from `SERVICE_CONTRACTS.md`
- **Status**: `READY` (direct Go equivalent), `PARTIAL` (Go equivalent with payload differences), `BLOCKED` (no Go equivalent yet)
- **Migration note** = what changes on the frontend side

---

## 1. Authentication & Session

| # | Frontend Endpoint | Method | Frontend File | Go Equivalent | Status | Migration Note |
|---|---|---|---|---|---|---|
| 1 | `login` | POST | `app-core/components/auth/login/index.tsx` | `POST /auth/login` | READY | Go returns `sessionId`, `lastSignIn`, `hasToAcceptTerms`, and legacy-compatible `token` metadata in addition to the native token fields. |
| 2 | `login-with-verification` | POST | `app-core/components/auth/login/index.tsx` | `POST /login-with-verification`, `POST /api/v1/auth/login-with-verification` | READY | Go now supports MFA login via both legacy and API-prefixed paths and returns legacy-compatible `verificationId` and token metadata. |
| 3 | `token/refresh` | POST | `utils-core/src/services/api/api-service.ts` | `POST /token/refresh` and `POST /auth/refresh` | READY | Go now exposes the legacy refresh path directly and keeps legacy-compatible nested `token` metadata in the response. |
| 4 | `punters/current-session` | GET | `app-core/components/auth/session-timer/index.tsx` | `GET /punters/current-session` | READY | Go now exposes the legacy session timer path with `sessionStartTime`, `currentTime`, and persisted `device_id` / `deviceFingerprint`. |
| 5 | `verification/request` | POST | `app-core/components/auth/mfa-modal/index.tsx` | `POST /verification/request`, `POST /api/v1/verification/request` | READY | Go now issues MFA verification challenges and returns legacy-compatible `verificationId`. |
| 6 | `verification/request-by-phone` | POST | `app-core/components/auth/register/step3/index.tsx` | `POST /verification/request-by-phone`, `POST /api/v1/verification/request-by-phone` | READY | Go now supports authenticated phone verification challenge creation for registration/profile flows. |
| 7 | `verification/check` | POST | `app-core/components/auth/register/step3/index.tsx` | `POST /verification/check`, `POST /api/v1/verification/check` | READY | Go now validates verification challenges and populates `verifiedAt` / phone verification state on success. |
| 8 | `account/activate/:emailToken` | PUT | `app-core/components/auth/email-confirmation/index.tsx` | `PUT /account/activate/{token}` | READY | Go now exposes the legacy activation-token route directly. |

**Summary:** Login, legacy refresh, account activation, MFA, verification, password lifecycle, account deletion, profile preferences, and basic session/device capture can now proceed directly against the Go backend. Remaining auth/account gaps are third-party KBA/IDPV provider depth and deeper device/session policy.

---

## 2. Registration

| # | Frontend Endpoint | Method | Frontend File | Go Equivalent | Status | Migration Note |
|---|---|---|---|---|---|---|
| 9 | `/registration-closed` | POST | `app-core/components/auth/register/index.tsx` | Not used by the current rebuilt frontend registration flow | READY | The current Go-facing register flow no longer calls this endpoint. No backend work is required here unless product policy later reintroduces a registration gate. |
| 10 | (multi-step registration form) | POST | `app-core/components/auth/register/` (steps 1-4) | `POST /api/v1/users` | PARTIAL | Old registration is multi-step with phone verification and identity verification stages. Go still registers in a single call, so the frontend must flatten or stage the flow around Go registration plus follow-up verification endpoints. |
| 11 | `registration/answer-kba-questions` | POST | `app-core/components/auth/register/id-comply/index.tsx` | `POST /registration/answer-kba-questions`, `POST /api/v1/registration/answer-kba-questions` | PARTIAL | Go now persists KBA verification sessions. Empty/no-answer requests issue and store question sets; answered requests store answers, complete the KBA session, and mark KYC approved. Remaining gap is third-party provider scoring rather than missing backend state. |
| 11a | `registration/check-idpv-status` | POST | `app-core/components/id-comply-modal/index.tsx` | `POST /registration/check-idpv-status`, `POST /api/v1/registration/check-idpv-status` | PARTIAL | Go now persists IDPV verification sessions and returns session-aware status data. Approved users return `user validated`; pending sessions still return the legacy-style `photoVerificationNotCompleted` error so the frontend polling flow stays intact. |
| 11b | `registration/start-idpv` | POST | `app-core/components/account-status-bar/index.tsx` | `POST /registration/start-idpv`, `POST /api/v1/registration/start-idpv` | PARTIAL | Go now creates persisted IDPV sessions, returns a stable `sessionId`, and appends that session identifier to `idpvRedirectUrl`. Real provider redirect/orchestration is still not implemented. |

**Summary:** Basic registration and legacy verification-stage routing can now work against Go with persisted provider-backed verification state and provider references. The remaining gap is full third-party KBA/IDPV depth, not missing route surface.

---

## 3. Profile & Account

| # | Frontend Endpoint | Method | Frontend File | Go Equivalent | Status | Migration Note |
|---|---|---|---|---|---|---|
| 12 | `profile/me` | GET | `app-core/components/profile/security/mfa-toggle/index.tsx` | `GET /profile/me` | READY | Go now exposes a legacy-compatible authenticated profile read alias and includes `lastSignIn`, `terms`, and `hasToAcceptTerms` fields. |
| 13 | `profile` | PUT | `app-core/components/profile/personal-details/index.tsx` | `PUT /profile` | READY | Go now exposes a legacy-compatible authenticated profile update alias. |
| 14 | `profile/email` | PUT | `app-core/components/profile/personal-details/change-email/index.tsx` | `PUT /profile/email`, `PUT /api/v1/users/{user_id}` | READY | Go now exposes a dedicated authenticated `profile/email` alias and also accepts `email` on the general profile update path. The old MFA-specific email-change ceremony is still thinner in Go. |
| 15 | `profile/multi-factor-authentication` | PUT | `app-core/components/profile/security/mfa-toggle/index.tsx` | `PUT /profile/multi-factor-authentication` | READY | Go now supports the legacy MFA toggle path and exposes `twoFactorAuthEnabled` plus `verifiedAt` in profile reads. |
| 15a | `profile/preferences` | PUT | `app-core/components/profile/communication/index.tsx` | `PUT /profile/preferences`, `PUT /api/v1/profile/preferences` | READY | Go now persists communication and betting preferences with the same nested shape the frontend already sends. |
| 16 | `password/change` | POST | `app-core/components/profile/security/password-editor/index.tsx` | `POST /password/change` | READY | Go now exposes legacy-compatible password change aliases at both `/password/change` and `/api/v1/password/change`. Payload shape matches the existing MFA challenge flow. |
| 17 | `password/forgot` | POST | `app-core/components/auth/forgot-reset-password/modal/index.tsx` | `POST /password/forgot` | READY | Go now exposes legacy-compatible forgot-password aliases at both `/password/forgot` and `/api/v1/password/forgot`, plus matching reset-token flows. |
| 18 | `punters/delete` | POST | `app-core/components/profile/personal-details/deletion-modal/index.tsx` | `POST /punters/delete` | READY | Go now exposes legacy-compatible authenticated account deletion aliases at both `/punters/delete` and `/api/v1/punters/delete`. |

**Summary:** Profile read/update, preferences, MFA toggle, password management, account deletion, and basic session/device capture can now proceed against the Go backend. The remaining account gaps are richer compliance identity flows and deeper session/device policy.

---

## 4. Terms & Compliance

| # | Frontend Endpoint | Method | Frontend File | Go Equivalent | Status | Migration Note |
|---|---|---|---|---|---|---|
| 19 | `terms` | GET | `app-core/components/auth/accept-terms/index.tsx`, `app-core/components/pages/terms-and-conditions/index.tsx` | `GET /terms` | READY | Go now exposes a dedicated public `terms` endpoint backed by `phoenix-config`. |
| 20 | `terms/accept` | PUT | `app-core/components/auth/accept-terms/index.tsx` | `PUT /terms/accept` | READY | Go now supports authenticated terms acceptance with current-version validation. |
| 21 | `responsibility-check/accept` | PUT | `app-core/components/auth/deposit-threshold-modal/index.tsx` | `PUT /responsibility-check/accept` | READY | Go now persists responsibility-check acceptance for the current user. |

---

## 5. Responsible Gaming / Limits

| # | Frontend Endpoint | Method | Frontend File | Go Equivalent | Status | Migration Note |
|---|---|---|---|---|---|---|
| 22 | `punters/deposit-limits` | POST | `app-core/components/profile/deposit/limit-form/index.tsx` | `POST /punters/deposit-limits` | READY | Go now exposes the legacy alias and maps it to compliance limit type `deposit`. |
| 23 | `punters/stake-limits` | POST | `app-core/components/profile/deposit/limit-form/index.tsx` | `POST /punters/stake-limits` | READY | Go now exposes the legacy alias and maps it to compliance limit type `stake`. |
| 24 | `punters/session-limits` | POST | `app-core/components/profile/deposit/limit-form/index.tsx` | `POST /punters/session-limits` | READY | Go now exposes the legacy alias and maps it to compliance limit type `session`. |
| 25 | `punters/limits-history` | GET | `app-core/components/pages/rg-history/index.tsx` | `GET /punters/limits-history` | READY | Go now exposes the legacy history alias plus `/api/v1/users/{user_id}/limits/history` for direct migration. |
| 26 | `punters/cool-off` | POST | `app-core/components/profile/deposit/index.tsx` | `POST /punters/cool-off` | READY | Go now exposes the legacy alias and maps it to a temporary self-exclusion / cool-off flow. |
| 27 | `punters/cool-offs-history` | GET | `app-core/components/pages/rg-history/index.tsx` | `GET /punters/cool-offs-history` | READY | Go now exposes the legacy cool-off history alias plus `/api/v1/users/{user_id}/cool-offs/history`. |
| 28 | `punters/self-exclude` | POST | `app-core/components/profile/self-exclude/index.tsx` | `POST /punters/self-exclude` and `POST /api/v1/users/{user_id}/self-exclude` | PARTIAL | Go now exposes the legacy path and duration mapping (`ONE_YEAR`, `FIVE_YEARS`). Remaining gap is old MFA verification and NJ checkbox semantics. |

**Summary:** Responsible-gaming limits, cool-off creation, RG history, and the legacy self-exclude route can now proceed against the Go compliance service. The only self-exclusion delta left is MFA/checkbox semantics, not route absence.

---

## 6. Payments & Cashier

| # | Frontend Endpoint | Method | Frontend File | Go Equivalent | Status | Migration Note |
|---|---|---|---|---|---|---|
| 29 | `payments/deposit` | POST | `app-core/components/pages/cashier/index.tsx` | `POST /payments/deposit` | READY | Go now exposes the legacy cashier deposit alias on top of the wallet ledger. |
| 30 | `payments/cheque-withdrawal` | POST | `app-core/components/pages/cashier/index.tsx` | `POST /payments/cheque-withdrawal` | READY | Go now exposes a legacy cheque-withdrawal alias and maps it onto wallet withdrawal handling with `payment_method=cheque`. |
| 31 | `payments/cash-withdrawal` | POST | `app-core/components/pages/cashier/index.tsx` | `POST /payments/cash-withdrawal` | READY | Go now exposes a legacy cash-withdrawal alias and maps it onto wallet withdrawal handling with `payment_method=cash`. |
| 32 | `payments/transactions/:txId` | GET | `app-core/components/pages/cashier-transaction/index.tsx` | `GET /payments/transactions/{transactionId}` | READY | Go now exposes a single transaction-details endpoint with legacy-style cashier status semantics. |

**Summary:** The frontend-critical cashier routes now exist on the Go backend, and the wallet now supports provider-mode pending transactions plus PXP-style callback compatibility. Remaining payment parity is broader provider/state coverage and deeper gateway/provider orchestration, not the player-facing route surface.

---

## 7. Sportsbook — Events & Fixtures

| # | Frontend Endpoint | Method | Frontend File | Go Equivalent | Status | Migration Note |
|---|---|---|---|---|---|---|
| 33 | `/api/odds-feed/sports/` | GET | `app-core/components/layout/index.tsx`, sportsbook layout | `GET /api/v1/sports` | PARTIAL | Old proxied via Next.js API route to odds feed. Go has `phoenix-events` `/api/v1/sports`. Response shape will differ. |
| 34 | `/api/odds-feed/fixtures/` | GET | `app-core/components/layout/fixture-list/index.tsx` | `GET /api/v1/events` | PARTIAL | Old uses "fixtures" naming. Go uses "events". Query params and response shape differ. |
| 35 | `/api/odds-feed/fixtures/:fixtureId/` | GET | `app-core/components/pages/fixture/index.tsx` | `GET /api/v1/events/{event_id}` | PARTIAL | Same naming difference. Go response includes `live_score`, markets attached via separate call. |
| 36 | `sports/:sportId/fixtures/:fixtureId` | GET | `app-core/components/pages/fixture/index.tsx` | `GET /api/v1/events/{event_id}` | PARTIAL | Old nests under sport. Go is flat event lookup. |

**Summary:** Sports/events are available in Go, and the backend now also has provider-event upsert, mockdata/oddin/betgenius supplier sync for fixtures and markets, and admin fixture/tournament reads for trading workflows. Frontend still needs to rename fixtures→events and adapt response shapes.

---

## 8. Sportsbook — Markets & Odds

| # | Frontend Endpoint | Method | Frontend File | Go Equivalent | Status | Migration Note |
|---|---|---|---|---|---|---|
| 37 | (markets loaded via fixture detail/odds-feed) | GET | Various fixture/event components | `GET /api/v1/markets?event_id=X` | READY | Go has full market listing by event. |
| 38 | (individual market detail) | GET | Fixture page | `GET /api/v1/markets/{market_id}` | READY | Direct equivalent. |

**Summary:** Market data is available in Go. Straightforward migration.

---

## 9. Betting

| # | Frontend Endpoint | Method | Frontend File | Go Equivalent | Status | Migration Note |
|---|---|---|---|---|---|---|
| 39 | `punters/bets` | POST | `app-core/components/layout/betslip/index.tsx` | `POST /api/v1/bets` | PARTIAL | Old sends to `punters/bets`. Go uses `/api/v1/bets`. Payload: old sends selections array; Go expects single `{user_id, market_id, outcome_id, stake, odds}`. Betslip may need to send multiple individual bet calls or Go needs batch endpoint. |
| 40 | `punters/bets` | GET | `app-core/components/layout/betslip/main-tabs/open-bets/index.tsx` | `GET /api/v1/users/{user_id}/bets?status=open` | PARTIAL | Old fetches from `punters/bets` with auth-derived user. Go requires `user_id` in path. |
| 41 | `punters/bets/status` | POST | `app-core/components/layout/betslip/index.tsx` | `POST /punters/bets/status` and `POST /api/v1/bets/status` | READY | Go now exposes batch bet-status polling with parity-oriented state mapping for betslip refresh (`OPENED`, `SETTLED`, `CANCELLED`, `FAILED`). |
| 42 | `/api/v1/bets/precheck` | POST | `app-core/components/layout/betslip/index.tsx` | `POST /api/v1/bets/precheck` | READY | Go now exposes batch single-bet pre-validation with `should_block_placement` plus normalized error codes (`marketNotFound`, `unableToOpenBet`, `oddsChanged`, `unexpectedError`). |
| 43 | `/api/v1/bets/builder/quote` | POST | `app-core/services/api/bet-builder-service.ts` | `POST /api/v1/bets/builder/quote` | READY | Go now persists bet-builder quotes with `quote/get/accept` lifecycle in `phoenix-betting-engine`. |
| 44 | `/api/v1/bets/builder/quotes/:quoteId` | GET | `app-core/services/api/bet-builder-service.ts` | `GET /api/v1/bets/builder/quotes/{quoteId}` | READY | Quote lookup is now available in Go with the frontend-facing response shape. |
| 45 | `/api/v1/bets/builder/accept` | POST | `app-core/services/api/bet-builder-service.ts` | `POST /api/v1/bets/builder/accept` | READY | Quote acceptance now reserves funds and places the resulting parlay-backed advanced bet in Go. |
| 46 | `/api/v1/bets/exotics/fixed/quote` | POST | `app-core/services/api/fixed-exotics-service.ts` | `POST /api/v1/bets/exotics/fixed/quote` | READY | Go now persists fixed-exotic quotes with exacta/trifecta composition checks and encoded-ticket metadata. |
| 47 | `/api/v1/bets/exotics/fixed/quotes/:quoteId` | GET | `app-core/services/api/fixed-exotics-service.ts` | `GET /api/v1/bets/exotics/fixed/quotes/{quoteId}` | READY | Quote lookup is now available in Go for fixed exotics. |
| 48 | `/api/v1/bets/exotics/fixed/accept` | POST | `app-core/services/api/fixed-exotics-service.ts` | `POST /api/v1/bets/exotics/fixed/accept` | READY | Fixed-exotic acceptance now routes through the Go betting/wallet flow and returns the accepted quote plus placed bet. |
| 49 | (cashout) | POST | betslip components | `POST /api/v1/bets/{bet_id}/cashout` | READY | Go has cashout endpoint. Frontend needs bet_id in path. |
| 50 | (cashout offer) | GET | betslip components | `GET /api/v1/bets/{bet_id}/cashout-offer` | READY | Go has cashout offer check. |
| 51 | (parlays) | POST | betslip components | `POST /api/v1/parlays` | READY | Go has parlay endpoint. |

**Summary:** Core single-bet, parlay placement, cashout, batch precheck, batch bet-status polling, bet builder, and fixed exotics now work in Go. The main remaining sportsbook backend gaps are realtime/provider depth, not the advanced bet quote surface.

---

## 10. Free Bets & Odds Boosts

| # | Frontend Endpoint | Method | Frontend File | Go Equivalent | Status | Migration Note |
|---|---|---|---|---|---|---|
| 52 | `/api/v1/freebets?userId=X&status=Y` | GET | `app-core/services/api/freebets-service.ts` | `GET /api/v1/freebets?userId=X&status=Y` | READY | Implemented in `phoenix-retention`; query contract matches the frontend helper. |
| 53 | `/api/v1/freebets/:freebetId` | GET | `app-core/services/api/freebets-service.ts` | `GET /api/v1/freebets/{freebetId}` | READY | Implemented in `phoenix-retention`; response shape matches the current frontend contract. |
| 54 | `/api/v1/odds-boosts?userId=X&status=Y` | GET | `app-core/services/api/odds-boost-service.ts` | `GET /api/v1/odds-boosts?userId=X&status=Y` | READY | Implemented in `phoenix-retention`; list/filter contract is present. |
| 55 | `/api/v1/odds-boosts/:oddsBoostId` | GET | `app-core/services/api/odds-boost-service.ts` | `GET /api/v1/odds-boosts/{oddsBoostId}` | READY | Implemented in `phoenix-retention`. |
| 56 | `/api/v1/odds-boosts/:oddsBoostId/accept` | POST | `app-core/services/api/odds-boost-service.ts` | `POST /api/v1/odds-boosts/{oddsBoostId}/accept` | READY | Implemented in `phoenix-retention`; accepts `userId`, `requestId`, and optional `reason`. |

**Summary:** Free bets and odds boosts now exist in Go. Remaining work is frontend migration and seeded data, not backend parity.

---

## 11. Match Tracker & Stats

| # | Frontend Endpoint | Method | Frontend File | Go Equivalent | Status | Migration Note |
|---|---|---|---|---|---|---|
| 57 | `/api/v1/match-tracker/fixtures/:fixtureId` | GET | `app-core/services/api/match-tracker-service.ts` | `GET /api/v1/match-tracker/fixtures/{fixtureID}` | READY | Go now exposes the match-tracker fixture route directly. It returns persisted provider incidents when present and a fallback timeline derived from event/live-score state otherwise. |
| 58 | `/api/v1/stats/fixtures/:fixtureId` | GET | `app-core/services/api/stats-center-service.ts` | `GET /api/v1/stats/fixtures/{fixtureID}` | READY | Minimal stats-centre parity now exists in `phoenix-events`. It returns metadata-backed metrics plus live-score/result fallbacks; richer supplier stats remain future provider work. |

---

## 12. Prediction Markets

| # | Frontend Endpoint | Method | Frontend File | Go Equivalent | Status | Migration Note |
|---|---|---|---|---|---|---|
| 59 | `/api/prediction/overview` | GET | `app-core/components/pages/prediction/index.tsx` | `GET /api/v1/prediction/overview` | READY | `phoenix-prediction` now exposes the same path directly. Frontend migration is adapter/UI work, not a backend blocker. |
| 60 | `/api/prediction/markets` | GET | `app-core/components/pages/prediction/index.tsx` | `GET /api/v1/prediction/markets` | READY | Market discovery now exists in Go through `phoenix-prediction`. |
| 61 | `/api/prediction/markets/:marketId` | GET | `app-core/components/pages/prediction/index.tsx` | `GET /api/v1/prediction/markets/{marketID}` | READY | Market detail now exists in Go; frontend only needs route-param adaptation. |
| 62 | `/api/prediction/ticket/preview` | POST | `app-core/components/redesign/prediction-layout/trade-rail.tsx` | `POST /api/v1/prediction/ticket/preview` | READY | Ticket preview now exists in Go through `phoenix-prediction`. |
| 63 | `api/v1/prediction/orders` | GET | `app-core/components/pages/prediction/index.tsx` | `GET /api/v1/prediction/orders` | READY | Player prediction order history now exists in Go. |
| 64 | `api/v1/prediction/orders` | POST | `app-core/components/redesign/prediction-layout/trade-rail.tsx` | `POST /api/v1/prediction/orders` | READY | Player order placement now exists in Go and is wallet-integrated. |
| 65 | `api/v1/prediction/orders/:orderId/cancel` | POST | `app-core/components/pages/prediction/index.tsx` | `POST /api/v1/prediction/orders/{orderID}/cancel` | READY | Order cancellation now exists in Go; frontend only needs path-param adaptation. |

**Summary:** The backend prediction service now exists and covers overview, discovery, preview, orders, and cancel flows. The remaining work here is frontend migration and UX, not backend service delivery.

---

## 13. WebSocket / Realtime

| # | Frontend Endpoint | Method | Frontend File | Go Equivalent | Status | Migration Note |
|---|---|---|---|---|---|---|
| 66 | `wss://.../api/v1/ws/web-socket` | WS | `app-core/services/websocket/websocket-service.ts` | `GET /api/v1/ws/web-socket` on `phoenix-gateway` | PARTIAL | Go now exposes a gateway websocket compatibility stream for `market^...`, `fixture^...`, `bets`, and `wallets`, with auth-aware subscriptions for player channels. Remaining gap is provider-backed push depth and richer realtime event coverage, not the absence of the websocket contract. |

**Summary:** The sportsbook websocket contract now exists in Go and is sufficient for frontend migration. Remaining realtime work is provider push depth and richer event fidelity, not a missing endpoint.

---

## 14. GeoComply / Geolocation

| # | Frontend Endpoint | Method | Frontend File | Go Equivalent | Status | Migration Note |
|---|---|---|---|---|---|---|
| 67 | `geo-comply/license-key`, `geo-comply/geo-packet` | GET / POST | `app-core/services/geocomply/index.tsx`, `app-core/components/geocomply/index.tsx` | `GET /geo-comply/license-key`, `POST /geo-comply/geo-packet`, plus `/api/v1` aliases in `phoenix-compliance` | PARTIAL | Legacy GeoComply compatibility routes now exist in Go and the migrated frontend now calls them through the Go compliance client. `phoenix-betting-engine` supports configurable `X-Geolocation` enforcement on bet and parlay placement. Remaining gap is provider-backed license issuance depth, not missing frontend wiring. |

---

## 15. Content & Promotions

| # | Frontend Endpoint | Method | Frontend File | Go Equivalent | Status | Migration Note |
|---|---|---|---|---|---|---|
| 68 | (CMS pages — terms, help, about) | GET | Various page components | `GET /api/v1/pages`, `GET /api/v1/pages/{page_id}` | READY | Go CMS service has pages endpoint. |
| 69 | (promotions listing) | GET | Promotion components | `GET /api/v1/promotions` | READY | Go CMS has promotions. |
| 70 | (banners) | GET | Layout/home components | `GET /api/v1/banners` | READY | Go CMS has banners. |

**Summary:** CMS/promotions are available in Go. Frontend can adapt immediately.

---

## Migration Readiness Summary

### Can Start Immediately (frontend work only)

| Task | Dependencies Met? | Notes |
|---|---|---|
| **Build new typed Go API client layer** | Yes | New `services/go-api/` with domain-split clients |
| **Login adapter** (basic, no MFA) | Yes | Map `login` → `POST /auth/login`, handle response shape diff |
| **Token refresh adapter** | No longer required | Go now exposes `POST /token/refresh` directly. |
| **Profile read/update adapter** | Yes | Legacy-compatible `GET /profile/me` and `PUT /profile` now exist in Go |
| **Sports list adapter** | Yes | Map odds-feed sports → `GET /api/v1/sports` |
| **Events/fixtures list adapter** | Yes | Map odds-feed fixtures → `GET /api/v1/events` |
| **Markets adapter** | Yes | Direct: `GET /api/v1/markets?event_id=X` |
| **Place bet adapter** (single bet) | Yes | Map `punters/bets` → `POST /api/v1/bets` |
| **Parlay adapter** | Yes | Direct: `POST /api/v1/parlays` |
| **Open bets adapter** | Yes | Map `punters/bets` GET → `GET /api/v1/users/{user_id}/bets` |
| **Cashout adapter** | Yes | Direct: `POST /api/v1/bets/{bet_id}/cashout` |
| **CMS pages/promotions/banners** | Yes | Direct Go CMS endpoints |
| **Deposit adapter** (basic) | No longer required for primary path | Go now exposes `POST /payments/deposit` directly |
| **Withdrawal adapter** (basic) | No longer required for primary path | Go now exposes `POST /payments/cash-withdrawal` and `POST /payments/cheque-withdrawal` directly |
| **Self-exclusion adapter** | Yes | Keep the legacy route but translate old MFA/checkbox UI semantics into the Go payload where needed. |
| **Deposit/stake/session limits adapter** | Yes | Map `punters/*-limits` → `POST /api/v1/users/{user_id}/limits` |
| **Registration adapter** (basic) | Yes | Flatten multi-step → `POST /api/v1/users` |
| **Account activation adapter** | No longer required | Go now exposes `PUT /account/activate/{token}` directly. |
| **Terms view/accept adapter** | Yes | Direct Go `GET /terms` and `PUT /terms/accept` |
| **Session timer adapter** | Yes | Direct Go `GET /punters/current-session` |

### Blocked on Backend Parity Work

| Task | Blocked By | Backend Workstream |
|---|---|---|
| MFA login / login-with-verification | Implemented in Go (`/login-with-verification`, `/api/v1/auth/login-with-verification`) | Frontend adapter only |
| Phone verification (registration step 3) | Implemented via Go verification challenge aliases | Frontend adapter only |
| KBA / IdComply (registration) | Compatibility routes now exist in Go and now persist verification sessions; remaining gap is provider-backed verification depth | Frontend adoption + B3 follow-up |
| Password change/forgot/reset | Implemented via legacy-compatible password aliases in `phoenix-user` | Frontend adoption |
| Account deletion | Implemented via legacy-compatible `punters/delete` aliases in `phoenix-user` | Frontend adoption |
| MFA toggle | Implemented via legacy-compatible `profile/multi-factor-authentication` in `phoenix-user` | Frontend adoption |
| Deposit threshold responsibility check | Implemented via `PUT /responsibility-check/accept` in `phoenix-compliance` | Frontend adoption |
| Cool-off (temporary break) | Implemented via `POST /punters/cool-off` in `phoenix-compliance` | Frontend adoption |
| Cool-off history | Implemented via `GET /punters/cool-offs-history` and `/api/v1/users/{user_id}/cool-offs/history` | Frontend adoption |
| Limits history (historical view) | Implemented via `GET /punters/limits-history` and `/api/v1/users/{user_id}/limits/history` | Frontend adoption |
| Registration-closed check | Not used by the current rebuilt frontend registration flow | No action |
| Cheque/cash withdrawal types | Implemented via legacy cashier aliases in `phoenix-wallet` | Frontend adoption |
| Transaction detail lookup (single tx) | Implemented via `GET /payments/transactions/{transactionId}` in `phoenix-wallet` | Frontend adoption |
| Bet builder | Go quote/get/accept lifecycle in `phoenix-betting-engine` | Active migration |
| Fixed exotics | Go quote/get/accept lifecycle in `phoenix-betting-engine` | Active migration |
| Bet precheck | Implemented via `POST /api/v1/bets/precheck` in `phoenix-betting-engine` | Frontend adoption |
| Free bets | Implemented in `phoenix-retention` | Frontend adoption |
| Odds boosts | Implemented in `phoenix-retention` | Frontend adoption |
| Match tracker timeline | Implemented via `GET /api/v1/match-tracker/fixtures/{fixtureID}` in `phoenix-events` | Frontend adoption |
| Stats center | Implemented via `GET /api/v1/stats/fixtures/{fixtureID}` in `phoenix-events` | Frontend adoption |
| All prediction endpoints (7 total) | Backend now exists; frontend still needs endpoint/payload migration to `phoenix-prediction` | F6 |
| Sportsbook WebSocket (market/bet/wallet updates) | Implemented via `GET /api/v1/ws/web-socket` in `phoenix-gateway` | Frontend adoption + richer push depth later |
| GeoComply integration | Compatibility routes are implemented in `phoenix-compliance` and the migrated frontend now uses them. `phoenix-betting-engine` supports configurable `X-Geolocation` enforcement. Provider-backed geofence depth still missing. | Backend depth follow-up |

---

## Minimum Viable Frontend Migration Sequence

### Slice 1: Auth + Wallet (F3)
1. `POST /auth/login` (basic, no MFA)
2. `POST /auth/refresh`
3. `GET /profile/me` and `PUT /profile`
4. `POST /api/v1/users` (registration, flattened)
5. `GET /terms`, `PUT /terms/accept`, `GET /punters/current-session`
6. `POST /api/v1/wallets/{user_id}/deposits`
7. `POST /api/v1/wallets/{user_id}/withdrawals`
8. `GET /api/v1/wallets/{user_id}/transactions`

### Slice 2: Sportsbook Board (F4)
8. `GET /api/v1/sports`
9. `GET /api/v1/events`
10. `GET /api/v1/events/{event_id}`
11. `GET /api/v1/markets?event_id=X`
12. `GET /api/v1/markets/{market_id}`

### Slice 3: Place Bet + History (F4)
13. `POST /api/v1/bets`
14. `POST /api/v1/parlays`
15. `GET /api/v1/users/{user_id}/bets`
16. `POST /api/v1/bets/{bet_id}/cashout`
17. `GET /api/v1/bets/{bet_id}/cashout-offer`

### Slice 4: Content + Compliance Basics (F5)
18. `GET /api/v1/pages`
19. `GET /api/v1/promotions`
20. `GET /api/v1/banners`
21. `POST /api/v1/users/{user_id}/limits`
22. `POST /api/v1/users/{user_id}/self-exclude`

### Slice 5: Account Basics (F5)
23. `PUT /api/v1/users/{user_id}` (profile update)
24. `GET /api/v1/users/{user_id}/notification-preferences`
25. `PUT /api/v1/users/{user_id}/notification-preferences`

### Slice 6: Prediction (F6)
26-32. Migrate the existing prediction module to the delivered `phoenix-prediction` endpoints

### Slice 7: Realtime + Advanced (F7)
33. WebSocket migration
34. Match tracker / stats
35. GeoComply provider-depth follow-up
36. Sportsbook realtime/provider depth

---

## Key Frontend Files to Modify

| File | Role | Migration Impact |
|---|---|---|
| `packages/utils-core/src/services/api/api-service.ts` | Core API hook (`useApiHook`) | Replace with Go-native client layer. Auth header, refresh, error handling all change. |
| `packages/app-core/services/api/api-service.ts` | App-level `useApi` wrapper | Rewrite to point at Go gateway. |
| `packages/app-core/services/websocket/websocket-service.ts` | WebSocket manager | Replace with Go WS contract when available. |
| `packages/app-core/services/api/bet-builder-service.ts` | Bet builder service | Start now — Go `quote/get/accept` routes are ready. |
| `packages/app-core/services/api/fixed-exotics-service.ts` | Fixed exotics service | Start now — Go `quote/get/accept` routes are ready. |
| `packages/app-core/services/api/freebets-service.ts` | Free bets service | Ready for migration to Go routes. |
| `packages/app-core/services/api/odds-boost-service.ts` | Odds boosts service | Ready for migration to Go routes. |
| `packages/app-core/services/api/match-tracker-service.ts` | Match tracker service | Can migrate now — Go route exists. |
| `packages/app-core/services/api/stats-center-service.ts` | Stats center service | Can migrate now — Go route exists. |
| `packages/app-core/services/geocomply/index.tsx` | GeoComply SDK | Migrated to the Go compliance client; remaining work is provider-depth realism, not endpoint wiring. |
| `packages/app/pages/api/` | Next.js server-side proxy routes | Remove once frontend talks directly to Go gateway. |
| `packages/app-core/.env.production` | API base URL | Point to Go gateway `http://phoenix-gateway:8080`. |

---

## Response Shape Differences (Critical for Adapter Layer)

### Login Response
```
// Old Scala
{
  token: { token, refreshToken, expiresIn, refreshExpiresIn },
  hasToAcceptTerms, sessionId, lastSignIn,
  type: "VERIFICATION_REQUESTED" | undefined
}

// New Go
{
  access_token, refresh_token, expires_in, user_id, token_type
}
```

### Token Refresh Response
```
// Old Scala
{
  token: { token, refreshToken, expiresIn, refreshExpiresIn },
  hasToAcceptTerms
}

// New Go
{
  access_token, expires_in, token_type
}
```

### Error Response
```
// Old Scala
{
  errors: [{ errorCode: "string", details: "string" }]
}

// New Go
{
  error: { code, message, details: [{ field, reason }], request_id, timestamp }
}
```

### Pagination
```
// Old Scala (query param style)
?pagination.currentPage=1

// New Go
?page=1&limit=20
// Response includes: { data: [...], pagination: { page, limit, total, total_pages } }
```

---

## Recommended Next Slice

**Start with Slice 1 (Auth + Wallet) immediately.** This is the highest-leverage work because:

1. Every other feature depends on auth working
2. All Go endpoints for basic auth exist
3. Wallet deposit/withdrawal endpoints exist
4. The response shape differences are well-documented above
5. No backend work is needed for the basic flow
6. MFA can be feature-flagged off initially

The concrete first PR should:
1. Create `packages/app-core/services/go-api/` with typed domain clients
2. Build auth client (login, refresh, logout)
3. Build user client (profile read/update, registration)
4. Build wallet client (balance, deposit, withdraw, transactions)
5. Wire login component to new auth client
6. Feature-flag MFA flow as disabled until Go backend adds it

This unblocks Slice 2 (sportsbook board) immediately after.

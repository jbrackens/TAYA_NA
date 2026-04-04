# Frontend Feature Reconciliation Matrix

**Date:** 2026-03-15
**Branch:** `feature/go-backend-migration` (commit `0fc2ead`)
**Purpose:** Map every disabled/stubbed frontend feature against the CURRENT Go backend reality.

## Legend

- **RE-ENABLE NOW** — Go backend endpoint exists and is confirmed ready
- **STILL BLOCKED** — Go backend endpoint is missing or insufficient
- **INTENTIONALLY OFF** — Feature was correctly removed or is not needed

---

## 1. Terms & Compliance

| Feature | Frontend File | Previous Blocker | Go Endpoint Status | Action |
|---------|---------------|------------------|-------------------|--------|
| Terms acceptance modal | `app-core/components/auth/accept-terms/index.tsx` | B5 — no `GET /terms`, `PUT /terms/accept` | **READY** — `GET /terms`, `GET /terms/current`, `PUT /terms/accept` exist in `phoenix-config` + `phoenix-user` | **RE-ENABLE NOW** |
| Terms & conditions page | `app-core/components/pages/terms-and-conditions/index.tsx` | B5 — no CMS/terms endpoint | **READY** — `GET /terms` returns HTML content + version | **RE-ENABLE NOW** |
| Terms version in personal details | `app-core/components/profile/personal-details/index.tsx` | B5 — hardcoded `null` | **READY** — `GET /terms/current` returns version, login response includes `hasToAcceptTerms` | **RE-ENABLE NOW** |
| Deposit threshold / responsibility check | `app-core/components/auth/deposit-threshold-modal/index.tsx` | B5 — no `PUT /responsibility-check/accept` | **READY** — `PUT /responsibility-check/accept` exists in `phoenix-compliance` | **RE-ENABLE NOW** |

## 2. Responsible Gaming

| Feature | Frontend File | Previous Blocker | Go Endpoint Status | Action |
|---------|---------------|------------------|-------------------|--------|
| Deposit limits form | `app-core/components/profile/deposit/limit-form/index.tsx` | B5 — no limits endpoints | **READY** — `POST /punters/deposit-limits`, `POST /punters/stake-limits`, `POST /punters/session-limits` exist in `phoenix-compliance` | **RE-ENABLE NOW** |
| Deposit/stake/session limits orchestrator | `app-core/components/profile/deposit/index.tsx` | B5 — no RG endpoints | **READY** — All three limit types + cool-off + self-exclude endpoints exist | **RE-ENABLE NOW** |
| Self-exclusion | `app-core/components/profile/self-exclude/index.tsx` | B5 — no `POST /punters/self-exclude` | **READY** — `POST /punters/self-exclude` exists with `ONE_YEAR`/`FIVE_YEARS` duration mapping. MFA verification semantics are thinner in Go but the route exists. | **RE-ENABLE NOW** |
| RG history (limits + cool-offs) | `app-core/components/pages/rg-history/index.tsx` | B5 — no history endpoints | **READY** — `GET /punters/limits-history`, `GET /punters/cool-offs-history` exist in `phoenix-compliance` | **RE-ENABLE NOW** |
| Session timer | `app-core/components/auth/session-timer/index.tsx` | B5 — no `GET /punters/current-session` | **READY** — `GET /punters/current-session` exists in `phoenix-user` with `sessionStartTime`, `currentTime` | **RE-ENABLE NOW** |

## 3. MFA / Verification

| Feature | Frontend File | Previous Blocker | Go Endpoint Status | Action |
|---------|---------------|------------------|-------------------|--------|
| MFA toggle in account settings | `app-core/components/profile/security/mfa-toggle/index.tsx` | B3 — hardcoded `disabled={true}` | **READY** — `PUT /profile/multi-factor-authentication` + `GET /profile/me` with `twoFactorAuthEnabled` field exist in `phoenix-user` | **RE-ENABLE NOW** |
| MFA login modal | `app-core/components/auth/login/index.tsx` | B3 — MFA modal removed | **READY** — `POST /login-with-verification`, `POST /verification/request` exist in `phoenix-user` | **RE-ENABLE NOW** |
| Phone verification (registration step 3) | `app-core/components/auth/register/step3/index.tsx` | B3 — step skipped | **READY** — `POST /verification/request-by-phone`, `POST /verification/check` exist in `phoenix-user` | **RE-ENABLE NOW** |
| Email change MFA verification | `app-core/components/profile/personal-details/change-email/index.tsx` | B3 — MFA ceremony removed | **READY** — `PUT /profile/email` + verification endpoints exist. MFA ceremony is thinner in Go. | **RE-ENABLE NOW** (basic — MFA ceremony can be added later) |

## 4. KBA / IDPV

| Feature | Frontend File | Previous Blocker | Go Endpoint Status | Action |
|---------|---------------|------------------|-------------------|--------|
| KBA question flow | `app-core/components/auth/register/id-comply/index.tsx` | B5 — no `POST /registration/answer-kba-questions` | **PARTIAL** — Go persists KBA sessions but third-party provider scoring is not real. Route exists. | **RE-ENABLE NOW** (will work against Go route; provider depth is backend follow-up) |
| IDPV status polling modal | `app-core/components/id-comply-modal/index.tsx` | B5 — no `POST /registration/check-idpv-status` | **PARTIAL** — Go persists IDPV sessions + returns legacy-style status. Provider redirect is not fully real. | **RE-ENABLE NOW** (polling flow works; provider redirect is backend follow-up) |

## 5. Promotions / Rewards

| Feature | Frontend File | Previous Blocker | Go Endpoint Status | Action |
|---------|---------------|------------------|-------------------|--------|
| Promotions page | `app-core/components/pages/promotions/index.tsx` | B5 — no freebets/odds-boosts | **READY** — `GET /api/v1/freebets`, `GET /api/v1/odds-boosts` exist in `phoenix-retention` | **RE-ENABLE NOW** |
| Betslip freebets integration | `app-core/components/layout/betslip/index.tsx` | B5 — count hardcoded to 0 | **READY** — `GET /api/v1/freebets?userId=X&status=active` exists | **RE-ENABLE NOW** |
| Betslip odds boosts integration | `app-core/components/layout/betslip/index.tsx` | B5 — count hardcoded to 0 | **READY** — `GET /api/v1/odds-boosts?userId=X&status=available`, `POST /api/v1/odds-boosts/{id}/accept` exist | **RE-ENABLE NOW** |

## 6. Betslip Advanced Features

| Feature | Frontend File | Previous Blocker | Go Endpoint Status | Action |
|---------|---------------|------------------|-------------------|--------|
| Bet precheck | `app-core/components/layout/betslip/index.tsx` | B5 — bypassed (always returns `shouldBlockPlacement: false`) | **READY** — `POST /api/v1/bets/precheck` exists in `phoenix-betting-engine` | **RE-ENABLE NOW** |
| Bet builder (quote/accept) | `app-core/components/layout/betslip/index.tsx` | B5 — not implemented | **READY** — `POST /api/v1/bets/builder/quote`, `GET /api/v1/bets/builder/quotes/{id}`, `POST /api/v1/bets/builder/accept` exist | **RE-ENABLE NOW** |
| Fixed exotics (quote/accept) | `app-core/components/layout/betslip/index.tsx` | B5 — not implemented | **READY** — `POST /api/v1/bets/exotics/fixed/quote`, `GET /api/v1/bets/exotics/fixed/quotes/{id}`, `POST /api/v1/bets/exotics/fixed/accept` exist | **RE-ENABLE NOW** |
| Batch bet status polling | `app-core/components/layout/betslip/index.tsx` | Not explicitly disabled but using individual getBet polling | **READY** — `POST /api/v1/bets/status` and `POST /punters/bets/status` exist | **RE-ENABLE NOW** |

## 7. Sportsbook Enrichments

| Feature | Frontend File | Previous Blocker | Go Endpoint Status | Action |
|---------|---------------|------------------|-------------------|--------|
| Match tracker | `app-core/services/api/match-tracker-service.ts` | B5 | **READY** — `GET /api/v1/match-tracker/fixtures/{fixtureID}` exists in `phoenix-events` | **RE-ENABLE NOW** |
| Stats centre | `app-core/services/api/stats-center-service.ts` | B5 | **READY** — `GET /api/v1/stats/fixtures/{fixtureID}` exists in `phoenix-events` | **RE-ENABLE NOW** |
| WebSocket compatibility | `app-core/services/websocket/websocket-service.ts` | B5 | **READY** — `GET /api/v1/ws/web-socket` exists in `phoenix-gateway` with market/fixture/bets/wallets channels | **RE-ENABLE NOW** |

## 8. Prediction Markets

| Feature | Frontend File | Previous Blocker | Go Endpoint Status | Action |
|---------|---------------|------------------|-------------------|--------|
| Prediction overview | `app-core/components/pages/prediction/index.tsx` | F6 — no prediction service | **READY** — `GET /api/v1/prediction/overview` exists in `phoenix-prediction` | **RE-ENABLE NOW** |
| Prediction market listing | `app-core/components/pages/prediction/index.tsx` | F6 | **READY** — `GET /api/v1/prediction/markets` exists | **RE-ENABLE NOW** |
| Prediction market detail | `app-core/components/pages/prediction/index.tsx` | F6 | **READY** — `GET /api/v1/prediction/markets/{marketID}` exists | **RE-ENABLE NOW** |
| Prediction ticket preview | `app-core/components/redesign/prediction-layout/trade-rail.tsx` | F6 | **READY** — `POST /api/v1/prediction/ticket/preview` exists | **RE-ENABLE NOW** |
| Prediction order placement | `app-core/components/redesign/prediction-layout/trade-rail.tsx` | F6 | **READY** — `POST /api/v1/prediction/orders` exists (wallet-integrated) | **RE-ENABLE NOW** |
| Prediction order history | `app-core/components/pages/prediction/index.tsx` | F6 | **READY** — `GET /api/v1/prediction/orders` exists | **RE-ENABLE NOW** |
| Prediction order cancel | `app-core/components/pages/prediction/index.tsx` | F6 | **READY** — `POST /api/v1/prediction/orders/{orderID}/cancel` exists | **RE-ENABLE NOW** |

---

## Summary

| Category | Total Features | Re-enable Now | Still Blocked | Intentionally Off |
|----------|---------------|---------------|---------------|-------------------|
| Terms & Compliance | 4 | 4 | 0 | 0 |
| Responsible Gaming | 5 | 5 | 0 | 0 |
| MFA / Verification | 4 | 4 | 0 | 0 |
| KBA / IDPV | 2 | 2 | 0 | 0 |
| Promotions | 3 | 3 | 0 | 0 |
| Betslip Advanced | 4 | 4 | 0 | 0 |
| Sportsbook Enrichments | 3 | 3 | 0 | 0 |
| Prediction Markets | 7 | 7 | 0 | 0 |
| **TOTAL** | **32** | **32** | **0** | **0** |

**Every previously disabled feature now has a Go backend equivalent.** There are zero remaining backend blockers for the frontend migration.

### Remaining Backend Depth Gaps (not blockers — features work but provider depth is thinner)

1. **KBA/IDPV**: Go persists sessions but third-party provider scoring/redirect is not real
2. **GeoComply**: Frontend is now on the Go compatibility routes, but provider-backed license issuance is still not real
3. **Self-exclusion**: MFA verification semantics and NJ checkbox enforcement are thinner
4. **WebSocket**: Compatibility layer exists but provider-backed push depth is still thin
5. **Stats centre**: Returns metadata + live-score fallbacks; richer supplier stats are future work

These are all backend depth items, not missing route surface. The frontend can wire to all Go endpoints now.

---

## Legacy `useApi` Elimination Progress (Updated 2026-03-13 — CORRECTIVE PASS COMPLETE)

### Fully Migrated to Go API (no legacy `useApi` calls)
| Component | Legacy Endpoint | Go API Hook |
|-----------|----------------|-------------|
| `current-balance/index.tsx` | `punters/wallet/balance` | `useBalance()` |
| `account-status-bar/index.tsx` | `registration/start-idpv` | `useStartIdpv()` |
| `auth/mfa-modal/index.tsx` | `verification/request` | `useRequestVerification()` |
| `hooks/useLogout/index.tsx` | `logout` | `useLogout()` (Go auth) |
| `websocket/websocket-service.ts` | `triggerRefresh` (token refresh) | Go API interceptor auto-refresh |
| `layout/fixture-list/index.tsx` | `fixtures/sports` | `useEvents()` (done prior) |
| `pages/fixture/index.tsx` | `match-tracker`, `stats-centre` | `useMatchTracker()`, `useFixtureStats()` (done prior) |
| `pages/account/index.tsx` | `freebets`, `odds-boosts` | `useFreebets()`, `useOddsBoosts()` (done prior) |
| `auth/forgot-reset-password/modal/index.tsx` | `password/forgot` | `useForgotPassword()` |
| `auth/change-password/index.tsx` | `password/reset/${token}` | `useResetPasswordByToken(token)` |
| `profile/personal-details/deletion-modal/index.tsx` | `punters/delete` | `useDeleteAccount()` |
| `profile/communication/index.tsx` | `profile/preferences` (PUT) | `useUpdatePreferences()` |
| `profile/security/password-editor/index.tsx` | `password/change` | `useChangePassword()` |
| `pages/cashier-transaction/index.tsx` | `payments/transactions/:txId` | `usePaymentTransaction(txId)` |
| `pages/prediction/index.tsx` | `prediction/orders`, `prediction/orders/:id/cancel` | `usePredictionOrders()`, `useCancelPredictionOrder()` |
| `redesign/prediction-layout/trade-rail.tsx` | `prediction/orders` (POST + GET) | `usePlacePredictionOrder()`, `usePredictionOrders("open")` |
| `redesign/sportsbook-layout/index.tsx` | `profile/me` (GET), `sports` (GET) | `useProfile()`, `useSports()` + `transformGoSports` |
| `services/geocomply/index.tsx` | `geo-comply/license-key`, `geo-comply/geo-packet` | Go compliance client (`getGeoComplyLicense()`, `evaluateGeoComplyPacket()`) |
| `pages/win-loss-statistics/index.tsx` | `punters/win-loss-statistics` | `getUserBets()` with Go `status`, `start_date`, `end_date` filters |
| `pages/transaction-history/index.tsx` | `punters/wallet/transactions` | `useTransactions()` |

### Still on Legacy `useApi` — Remaining Items
No remaining items in this tracked production migration set.

**The tracked production `useApi` call sites in this matrix are now migrated.** Remaining frontend work is validation, stale test cleanup, and residual type-compatibility cleanup rather than missing Go API wiring.

### Type-Only Imports from Legacy `contracts.ts` (No API Calls)
These files import only type definitions and do not call `useApi`:
- `layout/index.tsx` — `AccountData` types
- `layout/betslip/index.tsx` — `PlaceBetResponseItem`
- `layout/betslip/multi-leg-placement.ts` — Bet types
- `layout/fixture-list/index.tsx` — `PaginatedResponse` (odds-feed mode only)
- `pages/fixture/index.tsx` — Fixture types
- `go-api/events/events-transforms.ts` — `PaginatedResponse`, `SportsResponse`, `SportSummary`
- `redesign/sportsbook-layout/index.tsx` — `SportsResponse` (type-only for odds-feed merge)

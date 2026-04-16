# Phoenix Player App — Gap Analysis v3 (Complete System Audit)

**Benchmark:** Stake.com, Betby, BC.Game, DraftKings, FanDuel, Bet365
**Date:** April 3, 2026
**Current state:** Phoenix localhost:3002 (Next.js 13.5 App Router + Go backend)

---

## Executive Summary

The original Phoenix frontend (`phoenix-frontend-brand-viegg`) was a production-grade sportsbook with 24 major systems: Redux state management, WebSocket real-time data, full betslip with parlays and cashout, GeoComply geolocation, multi-step registration, cashier/payments, i18n (EN/DE), odds format conversion, responsible gaming tools, session management, and more.

During the App Router rewrite, **all 24 systems were abandoned**. The new frontend is a CSS shell with one working page, no state management, no API client layer, no real-time data, and no betting functionality. The Go backend and all original components still exist in the repo — they just aren't connected.

---

## Scoring Summary

| Category | Phoenix Now | Original Phoenix | Industry Standard | Gap vs Industry |
|----------|-----------|-----------------|-------------------|----------------|
| Left Sidebar — Sport Navigation | 1/10 | 7/10 | 9/10 | **-8** |
| Header / Top Bar | 3/10 | 7/10 | 9/10 | **-6** |
| Fixture Cards & Odds Display | 3/10 | 7/10 | 9/10 | **-6** |
| Betslip (Functional) | 0/10 | 8/10 | 9/10 | **-9** |
| Live Betting | 1/10 | 6/10 | 9/10 | **-8** |
| Search & Discovery | 0/10 | 2/10 | 8/10 | **-8** |
| Promotions & Hero Content | 2/10 | 5/10 | 9/10 | **-7** |
| Real-time Data (WebSocket) | 0/10 | 7/10 | 9/10 | **-9** |
| Mobile Responsiveness | 2/10 | 6/10 | 9/10 | **-7** |
| Auth & Session Management | 0/10 | 8/10 | 9/10 | **-9** |
| Wallet, Cashier & Payments | 0/10 | 7/10 | 9/10 | **-9** |
| Responsible Gaming & Compliance | 0/10 | 7/10 | 9/10 | **-9** |
| Team Logos & Visual Assets | 0/10 | 4/10 | 9/10 | **-9** |
| i18n & Localization | 0/10 | 7/10 | 8/10 | **-8** |
| Odds Format System | 0/10 | 7/10 | 9/10 | **-9** |
| **Overall** | **0.8/10** | **6.3/10** | **8.9/10** | **-8.1** |

---

## PART 1: UX/UI GAPS (vs Industry Standard)

### 1. LEFT SIDEBAR — SPORT NAVIGATION (Structural Flaw)

**Phoenix now:** 72px icon-only sidebar with 6 generic items (Home, Sports, Live, Bets, Cashier, Profile) using emoji. No actual sports listed. Bets/Cashier/Profile incorrectly placed here.

**Industry standard (Stake.com):** Left sidebar dedicated to sports: "Live Events (108)", "Starting Soon", "My Bets" at top, then individual sports (Soccer, Tennis, Cricket, Basketball, Baseball, Ice Hockey, MMA, CS2, Dota 2) each with custom SVG icon, name, chevron expanding to show leagues/tournaments.

**Betby variant:** Shows popular leagues with event counts: Premier League (21), NBA (11), LaLiga (21), NCAA (3), World Cup (25). League crests as icons. Sports/Esports toggle.

**Original Phoenix had:** Sports fetched from Redux (`sportSlice.ts`), each with icon, name, favorite star, expandable tournaments with fixture counts. Context-aware nav switching between sports and account views.

**The rule:** The left sidebar IS the sport browser. Cashier, Profile, My Bets belong in the header.

### 2. HEADER / TOP BAR

**Phoenix now:** Brand "Phoenix." left, Login/Sign Up right. Nothing else.

**Industry standard:** Brand + Casino/Sports toggle (left), search bar or icon (center/right), wallet balance + avatar + notification bell (right when logged in), Login/Register (right when logged out). Tab bar below: Sports Home | Live Betting | My Bets | Starting Soon.

**Gaps:** No wallet display, no search, no tab bar, no notification bell, no account avatar dropdown. My Bets/Cashier/Profile wrongly in sidebar.

### 3. FIXTURE CARDS & ODDS DISPLAY

**Phoenix now:** Cards with league label, date, "Team A vs Team B" centered. No visible odds on most cards. No team logos.

**Industry standard:** Every card shows clickable 1X2/Moneyline odds buttons inline. Team logos/crests flanking team names. Total market count. Live stream/stats icons. Social proof. Horizontal scrolling for top matches. Live cards show actual scores + game clock.

**Gaps:** No inline clickable odds (the #1 user action). No team logos. No live scores. No horizontal scroll. No market count badges.

### 4. BETSLIP — THE CRITICAL REGRESSION

**Phoenix now:** Static decorative panel. Zero interactivity.

**Phoenix originally had:** Full Redux betslip (`betSlice.ts`) with add/remove selections, stake inputs, single/parlay tabs, summary with Place Bet button, Open Bets tab, WebSocket bet lifecycle, odds change confirmation, cashout. API client for `/api/v1/bets`, `/api/v1/parlays`, `/api/v1/bets/{id}/cashout`. Go backend handlers still work.

**Industry standard (BC.Game/Betby):** Sticky bottom-right betslip button with Quick Bet toggle. Expands to full panel. Single/parlay/system bet types. Live payout calculation. Odds change alerts.

**Why it broke:** App Router rewrite imported zero betslip infrastructure. No Redux Provider, no BetslipProvider, no bet-button, no API client. All components still exist in repo.

### 5. LIVE BETTING

**Phoenix now:** `isLive` flag shows green dot. "Live" sidebar link dead.

**Industry standard:** Dedicated live section. Live scores on cards with game clock ("82' 2nd half"). Rapidly updating odds via WebSocket. Market suspension handling. Live event counts in sidebar.

### 6. SEARCH & DISCOVERY

**Phoenix now:** Nothing.

**Industry standard:** Prominent search bar (Stake: content area; BC.Game: header icon; Betby: sidebar icon bar). Typeahead with teams, events, leagues.

### 7. PROMOTIONS & HERO CONTENT

**Phoenix now:** Static "Welcome to Phoenix" hero text.

**Industry standard:** 3-card promotional carousel (Stake: "Stake Shield", "MLB Refund", "NBA Half Time Payout"). Content tabs (BC.Game: HIGHLIGHTS | EVENT BUILDER | BETS FEED). Top Matches horizontal scroll.

### 8. MOBILE RESPONSIVENESS

**Phoenix now:** Sidebar hidden <768px with NO replacement. Betslip hidden <1200px with NO access.

**Industry standard:** Bottom tab navigation on mobile. Hamburger drawer for sport nav. Sticky betslip button (bottom-right) expanding to bottom sheet. All tap targets ≥44px.

### 9. TEAM LOGOS & VISUAL ASSETS

**Phoenix now:** Emoji throughout. Broken emoji in betslip empty state.

**Industry standard:** Custom SVG sport icons. Team crests on every match card (Stake). League logos in sidebar (Betby). Illustrated jerseys/mascots (BC.Game live cards).

---

## PART 2: ABANDONED SYSTEMS INVENTORY (24 Systems)

Everything below exists in the original codebase but is NOT wired into the App Router.

### System 1: Redux State Management
**Location:** `phoenix-frontend-brand-viegg/packages/app-core/lib/slices/`
**12 slices:** authSlice, betSlice, cashierSlice, settingsSlice, profileSlice, sportSlice, marketSlice, navigationSlice, fixtureSlice, predictionSlice, siteSettingsSlice, channelSubscriptionSlice
**Status:** Copied to talon-backoffice but no Redux Provider wraps the App Router. None active.

### System 2: Go API Client Layer
**Location:** `phoenix-frontend-brand-viegg/packages/app-core/services/go-api/`
**11 service modules:** auth, user, betting, wallet, markets, events, predictions, compliance, verification, retention, terms, sportsbook
**Each has:** client.ts (REST calls), hooks.ts (React Query), transforms.ts (data mapping), types.ts
**Status:** Not imported. New pages use raw `fetch()`.

### System 3: WebSocket Real-Time Service
**Location:** `phoenix-frontend-brand-viegg/packages/app-core/services/websocket/`
**Files:** websocket-service.ts, response-data-manager.ts, channels-map.ts
**Channel handlers:** bets, wallets, markets, fixtures
**Features:** Subscribe/unsubscribe, auto-reconnect, error recovery, Redux dispatch
**Status:** Completely abandoned. No WebSocket connection exists.

### System 4: Betslip System
**Location:** Multiple — betSlice.ts, BetslipProvider.tsx, Betslip.tsx, bet-button/, betslip/list/, betslip/main-tabs/, betslip/summary/
**Features:** Add/remove selections, single/parlay, stake input, payout calc, Place Bet, Open Bets tab, odds change handling, WebSocket bet lifecycle
**API:** POST /api/v1/bets, POST /api/v1/parlays, cashout, precheck
**Status:** Not connected. Bet-button has `addToBetSlip()` disabled ("vie.gg shut down").

### System 5: Authentication System
**Location:** `app-core/components/auth/`
**Components:** LoginComponent, RegisterComponent (multi-step wizard), EmailConfirmationComponent, AcceptTermsComponent, ForgotPasswordComponent, ResetPasswordComponent, ChangePasswordComponent
**Services:** Token store, session timer, idle detection, MFA hooks
**Status:** New app has basic login form calling `/api/auth/login`. No registration, no session management, no idle detection, no MFA.

### System 6: GeoComply Geolocation/Compliance
**Location:** `app-core/services/geocomply/`, components/geocomply/
**Features:** License fetching, packet encryption/evaluation, desktop + mobile support, location expiry tracking, context provider
**API:** compliance-client.ts with hooks
**Status:** Completely abandoned. Required for regulated US sports betting.

### System 7: Cashier/Payment System
**Location:** `app-core/components/cashier/`, pages/cashier/
**Components:** CashierDrawerComponent, deposit flow, withdrawal flow, payment method selection, transaction history, cheque management
**API:** wallet-client.ts (deposit, withdrawal, balance)
**Status:** Not connected. "Cashier" link goes nowhere.

### System 8: i18n/Translations
**Location:** `app-core/translations/en/`, `app-core/translations/de/`
**Scale:** 40+ translation files covering: account, betslip, cashier, common, deposit-limits, fixture, geo-comply, header, login, mfa, notifications, responsible-gaming, settings, sidebar, transactions, etc.
**Languages:** English, German
**Setup:** i18next + next-i18next
**Status:** Completely abandoned. App is hardcoded English.

### System 9: Odds Format System
**Location:** `utils-core/src/types/common/odd.ts`, settingsSlice
**Formats:** American (-110, +250), Decimal (1.91, 2.50), Fractional (1/1, 5/2)
**Features:** DisplayOddsEnum, user preference toggle stored in Redux
**Status:** Not connected. Raw decimal numbers displayed with no conversion.

### System 10: User Preferences & Settings
**Location:** settingsSlice.ts, user-preferences-service.ts
**Preferences:** Odds format, language, timezone, communication (email/SMS/push), betting limits (daily/weekly/monthly), default payment method, favorite sports/leagues/teams
**Storage:** Redux + localStorage + server-side API
**Status:** None implemented.

### System 11: Responsible Gaming
**Location:** Components + retention-client.ts + translations/responsible-gaming.js
**Features:** Self-exclusion, deposit limits (daily/weekly/monthly), session limits, loss limits, session timer component, idle activity detection
**Status:** Completely missing. This is a regulatory requirement in licensed jurisdictions.

### System 12: Session Management
**Location:** token-store-service.ts, SessionTimerComponent, IdleActivityComponent
**Features:** JWT token persistence, token refresh, session timeout warnings, idle detection with auto-logout, browser fingerprinting (useFingerprint)
**Status:** Login sets a cookie but no session tracking, no token refresh, no idle detection.

### System 13: Layout System
**Location:** `app-core/components/layout/`
**Components:** Full AppLayout wrapper, Header (with balance + account dropdown), Sidebar (sport list + favorites), Betslip panel, Footer (upper/main/mobile), Live chat widget, modal systems
**Features:** Responsive breakpoints, mobile sidebar drawer, context-aware nav switching
**Status:** Replaced with basic CSS-only layout. No component-driven layout.

### System 14: Error Handling
**Location:** `app-core/components/errors/`, api errors.ts
**Features:** ErrorComponent (translated error codes), WebSocket error modal, form validation, bet placement errors, API error mapping
**Translation:** Full error code → user message mapping in api-errors.js
**Status:** No error handling beyond basic try/catch.

### System 15: Notification System
**Location:** Various — uses Ant Design Alert/message
**Features:** Error messages, success toasts, WebSocket error modal, session timeout warnings, idle warnings
**Status:** None implemented.

### System 16: Sport Navigation State
**Location:** sportSlice.ts, navigationSlice.ts
**Features:** Dynamic sport list from API, favorite sports (star system), tournament drill-down with fixture counts, context-aware nav (STANDARD vs ACCOUNT), selected sport/league tracking
**Status:** Not connected. Sidebar is hardcoded.

### System 17: Currency Service
**Location:** `app-core/services/currency/`, useCurrency hook
**Features:** Currency formatting, multi-currency support, conversion
**Status:** Not connected.

### System 18: Data Transformers
**Location:** `go-api/*/transforms.ts`, `utils-core/converters/`
**Features:** Complex event/fixture transforms, timestamp converters, enum converters, betting data normalization
**Status:** Not used. Raw API data rendered directly.

### System 19: Utility Hooks
**Location:** `utils-core/src/hooks/`
**Hooks:** useResize, useCurrency, useTimezone, useFingerprint, useToken, useScrollDirection, useNavigation, useSpy, useLocalStorageVariables
**Status:** None imported.

### System 20: Multi-Leg Betting Logic
**Location:** betslip/multi-leg-placement.ts, betslip/same-game-combo.ts
**Features:** Parlay calculation, same-game combo validation, multi-leg placement flow
**Status:** Not connected.

### System 21: KYC/Identity Verification
**Location:** auth components, verification-client.ts
**Features:** ID document upload, email verification flow, identity verification UI
**Status:** Not implemented. Required for regulated markets.

### System 22: Integration Mode System
**Location:** `app-core/lib/integration-mode.ts`
**Features:** Detect embed/integration mode, conditional layout rendering, partner white-labeling
**Status:** Not used.

### System 23: Prediction Markets
**Location:** predictionSlice.ts, prediction-client.ts, pages/prediction/
**Features:** Prediction market browsing, prediction placement
**Status:** Not implemented.

### System 24: Static/Legal Pages
**Location:** `pages/about`, `pages/contact-us`, `pages/privacy-policy`, `pages/terms-and-conditions`, `pages/betting-rules`, `pages/bonus-rules`, `pages/responsible-gaming`
**Features:** Legal compliance pages, betting rules, T&C
**Status:** None built. Required for any licensed operation.

---

## PART 3: IMPLEMENTATION PLAN

### Architecture Decision: Port, Don't Rebuild

The original components contain battle-tested business logic — odds calculations, bet validation, WebSocket reconnection, cashout flow, parlay math. Rebuilding from scratch would introduce bugs in financial-critical code. The plan is to **port existing modules** into the App Router using `'use client'` wrappers where needed.

**Key porting pattern:**
```
Original (Pages Router + Redux)     →  New (App Router + Context/Redux hybrid)
───────────────────────────────────────────────────────────────────────────────
getServerSideProps                   →  Server Components + fetch
Redux Provider in _app.tsx           →  Redux/Context Provider in layout.tsx
Class components                     →  'use client' function components
styled-components (needs SSR setup)  →  Inline styles or CSS modules
next-i18next                         →  i18next with client-side init
```

---

### Phase 1: Foundation (Week 1-2) — "Make It Work"

**Goal:** Restore core infrastructure so the app can function as a sportsbook.

#### 1.1 State Management Setup
- [ ] Set up Redux store with Provider in root `layout.tsx` (or migrate to Zustand for simpler App Router compat)
- [ ] Port all 12 slices, prioritizing: betSlice, sportSlice, settingsSlice, authSlice
- [ ] Wrap Provider as `'use client'` component

#### 1.2 API Client Layer
- [ ] Port `go-api/client.ts` (base HTTP client with auth headers)
- [ ] Port auth-client.ts + auth-hooks.ts
- [ ] Port events-client.ts + events-hooks.ts
- [ ] Port markets-client.ts + markets-hooks.ts
- [ ] Port betting-client.ts + betting-hooks.ts
- [ ] Port wallet-client.ts + wallet-hooks.ts
- [ ] Configure React Query provider

#### 1.3 Auth Flow
- [ ] Port LoginComponent (adapt from styled-components to inline styles)
- [ ] Port RegisterComponent (multi-step wizard)
- [ ] Wire token-store-service.ts for JWT management
- [ ] Add token refresh logic
- [ ] Connect to Go auth service (:18081)
- [ ] Add SessionTimerComponent + IdleActivityComponent

#### 1.4 Sidebar Restructure
- [ ] Replace icon sidebar with sport navigation sidebar (~220px)
- [ ] Fetch sports from `/api/v1/sports` via sportSlice
- [ ] Render each sport with SVG icon + name + expandable leagues
- [ ] Port favorite star system from original SidebarMenu
- [ ] Add "Live Events (N)" + "Starting Soon" at top
- [ ] Add fixture count badges per league/tournament

#### 1.5 Header Restructure
- [ ] Move My Bets, Cashier/Wallet, Profile to header
- [ ] Add tab bar: Sports Home | Live | My Bets | Starting Soon
- [ ] Add wallet balance display (when logged in)
- [ ] Add avatar icon with account dropdown
- [ ] Add search icon/bar
- [ ] Add notification bell placeholder

---

### Phase 2: Core Betting (Week 3-4) — "Make It Bet"

**Goal:** Restore the revenue-generating betting flow end to end.

#### 2.1 Betslip Restoration
- [ ] Port BetslipProvider.tsx into App Router layout
- [ ] Port Betslip.tsx main component
- [ ] Port betslip/list/ (selection list with stake inputs)
- [ ] Port betslip/main-tabs/ (Single / Multi toggle)
- [ ] Port betslip/summary/ (totals + Place Bet button)
- [ ] Port bet-button/ component — re-enable `addToBetSlip()`
- [ ] Wire to Go API: POST /api/v1/bets (single), POST /api/v1/parlays (multi)
- [ ] Add bet confirmation flow
- [ ] Add quick-stake buttons ($5, $10, $25, $50, $100)

#### 2.2 Fixture Cards with Odds
- [ ] Redesign fixture cards with inline 1X2 odds grid
- [ ] Each odds button uses bet-button component → adds to betslip on click
- [ ] Visual selection state (highlighted when in betslip)
- [ ] Show market count badge per fixture
- [ ] Add "+N more markets" expansion

#### 2.3 WebSocket Connection
- [ ] Port websocket-service.ts
- [ ] Port response-data-manager.ts + channels-map.ts
- [ ] Port channel handlers: markets, fixtures, bets, wallets
- [ ] Connect to Go backend WebSocket endpoint
- [ ] Wire market updates → Redux → UI re-render
- [ ] Add odds movement indicators (green/red flash)
- [ ] Add market suspension handling (grey out + disable)
- [ ] Implement polling fallback

#### 2.4 Odds Format System
- [ ] Port DisplayOddsEnum (American/Decimal/Fractional)
- [ ] Add odds format toggle in settings
- [ ] Wire odds display throughout all components
- [ ] Store preference in settingsSlice

---

### Phase 3: Full UX (Week 5-6) — "Make It Complete"

**Goal:** Build out all pages and secondary features.

#### 3.1 Pages
- [ ] `/live` — dedicated live betting page with in-play events + live scores
- [ ] `/sports/[sportId]` — sport-specific event listing with league groupings
- [ ] `/sports/[sportId]/[leagueId]` — league-specific events
- [ ] `/fixture/[fixtureId]` — full fixture detail with all markets
- [ ] `/bets` — bet history (pending, settled, cashed out)
- [ ] `/cashier` — deposit/withdrawal UI
- [ ] `/account` — profile settings, preferences, security
- [ ] `/account/limits` — responsible gaming deposit/loss/session limits
- [ ] `/about`, `/terms`, `/privacy`, `/betting-rules`, `/responsible-gaming` — legal pages

#### 3.2 Cashier/Wallet
- [ ] Port CashierDrawerComponent
- [ ] Port deposit flow (payment method selection, amount, confirmation)
- [ ] Port withdrawal flow
- [ ] Port transaction history page
- [ ] Wire to wallet-client.ts
- [ ] Display balance in header

#### 3.3 Open Bets + Cashout
- [ ] Port Open Bets tab in betslip
- [ ] Port bet history page with filtering
- [ ] Wire cashout: GET /api/v1/bets/{id}/cashout-offer → display value
- [ ] Wire cashout: POST /api/v1/bets/{id}/cashout → execute
- [ ] Add WebSocket bet status updates (opened/cancelled/settled/failed)

#### 3.4 i18n
- [ ] Set up i18next with client-side initialization (App Router compatible)
- [ ] Port all 40+ translation files (EN + DE)
- [ ] Add language selector in header/settings
- [ ] Wire translations throughout all components

#### 3.5 Error Handling
- [ ] Port ErrorComponent with translated error codes
- [ ] Add global error boundary
- [ ] Add API error interceptor in HTTP client
- [ ] Add toast/notification system for success/error feedback

---

### Phase 4: Polish & Compliance (Week 7-8) — "Make It Ship"

**Goal:** Visual polish, mobile, compliance, and competitive features.

#### 4.1 Mobile Responsiveness
- [ ] Add bottom tab navigation (<768px): Home, Live, My Bets, Account
- [ ] Add hamburger drawer for sport navigation on mobile
- [ ] Convert betslip to bottom sheet (sticky button → expand)
- [ ] Ensure all tap targets ≥44px
- [ ] Test on iOS Safari + Chrome Android viewports

#### 4.2 Visual Assets
- [ ] Create/integrate SVG sport icon set (replace all emoji)
- [ ] Integrate team logo API or build asset pipeline
- [ ] Add league crests in sidebar
- [ ] Fix broken emoji rendering throughout

#### 4.3 Promotions & Discovery
- [ ] Build promotional carousel (hero area)
- [ ] Add "Top Matches" horizontal scroll section
- [ ] Add search with typeahead (teams, events, leagues)
- [ ] Add content tabs: Highlights | Featured | Starting Soon

#### 4.4 Responsible Gaming & Compliance
- [ ] Port deposit limits UI (daily/weekly/monthly)
- [ ] Port session timer + session limits
- [ ] Port self-exclusion flow
- [ ] Build responsible gaming information page
- [ ] Wire to retention-client.ts API

#### 4.5 GeoComply (if targeting regulated US markets)
- [ ] Port GeoComply integration (geocomply-context.tsx)
- [ ] Wire license fetching + packet evaluation
- [ ] Add geolocation checks before bet placement
- [ ] Port GeoComply error component

#### 4.6 KYC/Verification
- [ ] Port email verification flow
- [ ] Port identity verification UI (document upload)
- [ ] Wire to verification-client.ts

---

### Phase 5: Differentiation (Week 9+) — "Make It Win"

#### 5.1 Advanced Betting
- [ ] Port same-game combo logic (same-game-combo.ts)
- [ ] Build Same-Game Parlay builder UI
- [ ] Port multi-leg placement logic
- [ ] Add Quick Bet mode (one-click with preset stake)

#### 5.2 Live Experience
- [ ] Add match tracker/visualization (pitch map, shot map)
- [ ] Add live streaming integration (if available)
- [ ] Add micro-betting / flash bets for live events

#### 5.3 Personalization
- [ ] Port user preference persistence
- [ ] Add personalized bet recommendations
- [ ] Add "Because you bet on X" featured section
- [ ] Cross-device betslip sync

#### 5.4 Prediction Markets
- [ ] Port prediction-client.ts
- [ ] Build prediction market pages
- [ ] Wire to predictionSlice

---

## File Mapping: What to Port from Where

| Original Location | Port To | Priority |
|---|---|---|
| `brand-viegg/app-core/lib/slices/*.ts` | `app/lib/store/` | P0 |
| `brand-viegg/app-core/services/go-api/*` | `app/lib/api/` | P0 |
| `brand-viegg/app-core/services/websocket/*` | `app/lib/websocket/` | P1 |
| `brand-viegg/app-core/components/layout/*` | `app/components/layout/` | P0 |
| `brand-viegg/app-core/components/auth/*` | `app/(auth)/` | P0 |
| `talon-backoffice/app/components/Betslip*` | `app/components/betslip/` | P0 |
| `talon-backoffice/app/components/bet-button/*` | `app/components/bet-button/` | P0 |
| `brand-viegg/app-core/components/cashier/*` | `app/(dashboard)/cashier/` | P2 |
| `brand-viegg/app-core/services/geocomply/*` | `app/lib/geocomply/` | P3 |
| `brand-viegg/app-core/translations/*` | `app/lib/i18n/` | P2 |
| `brand-viegg/utils-core/src/hooks/*` | `app/hooks/` | P1 |
| `brand-viegg/utils-core/src/types/*` | `app/lib/types/` | P0 |
| `brand-viegg/utils-core/src/services/*` | `app/lib/services/` | P1 |
| `brand-viegg/utils-core/src/converters/*` | `app/lib/utils/` | P1 |

---

## Effort Estimate

| Phase | Duration | Team Size | Key Deliverables |
|-------|----------|-----------|-----------------|
| Phase 1: Foundation | 2 weeks | 2 devs | Redux, API clients, auth, sidebar, header |
| Phase 2: Core Betting | 2 weeks | 2 devs | Betslip, odds buttons, WebSocket, odds format |
| Phase 3: Full UX | 2 weeks | 2-3 devs | All pages, cashier, bet history, cashout, i18n |
| Phase 4: Polish & Compliance | 2 weeks | 2-3 devs | Mobile, assets, promos, responsible gaming, KYC |
| Phase 5: Differentiation | Ongoing | 1-2 devs | SGP, live experience, personalization |
| **Total to MVP (Phase 1-3)** | **6 weeks** | **2 devs** | **Functional sportsbook** |
| **Total to Production (Phase 1-4)** | **8 weeks** | **2-3 devs** | **Shippable product** |

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|-----------|
| styled-components SSR incompatible with App Router | High | Port to inline styles or CSS modules (already started) |
| Original betSlice coupled to vie.gg-specific APIs | Medium | Verify all API calls map to Go backend endpoints |
| GeoComply SDK version may be outdated | Medium | Check SDK compatibility before integrating |
| Next.js 13.5 App Router + Redux hydration issues | High | Consider Zustand as lighter alternative |
| i18n `next-i18next` doesn't work with App Router | High | Use `i18next` directly with client-side init |
| WebSocket endpoint may need CORS config | Low | Already handled by Next.js proxy rewrites |
| Missing Go backend endpoints for some features | Medium | Audit all API calls against actual Go handlers |

---

## Key Architectural Insight

**Port, don't rebuild.** The original codebase contains ~50,000 lines of battle-tested frontend code with financial-critical logic (odds calculations, parlay math, cashout valuations, bet validation). The Go backend is 90% ready — betting, auth, wallet, markets, sports, fixtures endpoints all work. The WebSocket infrastructure exists on both sides.

The fastest and safest path is porting existing modules into the App Router shell, adapting styled-components to inline styles, and wrapping everything in `'use client'` where needed. The business logic doesn't change — only the rendering layer.

---

## PART 4: BACKOFFICE AUDIT (Same Regression Found)

The same refactor that gutted the player app also hit the Talon Backoffice (admin panel). The original Pages Router backoffice had a complete admin toolkit — 12 business logic containers, 9 Redux slices, 24+ pages for trading, risk management, user administration, and compliance. The App Router rewrite dropped most of it.

### Backoffice Health Check Results (Current State)

| Metric | Value |
|--------|-------|
| **Passed** | 17 / 55 |
| **Failed** | 38 / 55 |
| **Warnings** | 2 |

### Missing Backoffice Systems (38 failures)

**Risk Management Pages (5 missing):**
Fixed exotics management, market categories CRUD, prediction markets operations, provider operations (cashier review, verification), risk summary dashboard + export

**User Management Sub-Features (4 missing):**
User betting history, user session history, user limits + cool-off management, modify punter modal (suspend/block user)

**Account & Settings (4 missing):**
Account settings page, account security page (password/2FA), terms & conditions management, not-authorized (RBAC denied) page

**State Management (7 missing):**
No store provider in layout, auth slice, users slice, markets slice, fixtures slice, audit logs slice, market categories slice — all 9 original Redux slices removed, only basic hooks remain

**Business Logic Containers (6 missing):**
Audit logs container (filter/paginate/export), markets container (suspend/toggle/update), fixtures container (settle/result/update), users container (search/filter/paginate), risk summary container, provider ops container

**Auth & Security (2 missing):**
Role-based access control (RBAC), secured page wrapper (per-route permission checks)

**Infrastructure (3 missing):**
Menu/navigation provider, risk calculators, global error boundary + 404 page

### Original Backoffice Source Map

| System | Original Location | Status |
|--------|-------------------|--------|
| Fixed Exotics | `pages/risk-management/fixed-exotics/` | MISSING |
| Market Categories | `pages/risk-management/market-categories/` | MISSING |
| Prediction Markets | `pages/risk-management/prediction/` | MISSING |
| Provider Operations | `pages/risk-management/provider-ops/` | MISSING |
| Risk Summary | `pages/risk-management/summary/` | MISSING |
| Account Settings | `pages/account/settings/` | MISSING |
| Account Security | `pages/account/security/` | MISSING |
| Terms & Conditions | `pages/terms-and-conditions/` | MISSING |
| Redux Store | `store.ts` + `store.config.ts` (9 slices) | MISSING |
| All 12 Containers | `containers/audit-logs/`, `containers/markets/`, etc. | MISSING |
| RBAC Guards | `utils/auth.ts` — `securedPage()` | MISSING |
| Menu Provider | `providers/menu/` | MISSING |
| Risk Calculators | `lib/utils/calculators.ts` | MISSING |
| Trading WebSocket | `hooks/useTradingWebSocket.ts` | EXISTS (not wired) |
| Telemetry | `lib/telemetry/scoped-copy-events.ts` | MISSING |

---

## PART 5: GATES & CONTROLS — NO MORE SHORTCUTS

This section exists because a refactor silently dropped 24 systems from the player app and 38 systems from the backoffice. These enforcement mechanisms make it structurally impossible for that to happen again.

### Control 1: Automated Health Check Scripts

Two scripts run automated verification of all core systems:

**Player App:** `scripts/system-health-check.sh`
- 11 gates checking 37 systems across state management, API clients, betslip, WebSocket, auth, navigation, odds format, core pages, compliance, i18n, and error handling
- Exit code 1 = deployment blocked
- `--fix` mode shows exact remediation steps for each failure
- `--verbose` mode shows all pass/fail details

**Backoffice:** `scripts/backoffice-health-check.sh`
- 11 gates checking 55 systems across admin pages, risk management, user management, account settings, state management, API clients, business logic containers, auth/RBAC, layout, utilities, and error handling
- Same blocking behavior and fix hints

### Control 2: When Health Checks MUST Run

| Trigger | Required | Blocks On Failure |
|---------|----------|-------------------|
| Before every commit | YES | Commit rejected |
| Before every PR | YES | PR cannot be created |
| Before every deploy | YES | Deploy blocked |
| On dev server startup | YES (warning) | Warning banner, not blocking |
| In CI/CD pipeline | YES | Pipeline fails |

### Control 3: Pre-Commit Hook

File: `.husky/pre-commit` (or `.git/hooks/pre-commit`)

```bash
#!/usr/bin/env bash
echo "Running system health checks..."
./scripts/system-health-check.sh || {
  echo "❌ PLAYER APP health check failed. Fix before committing."
  exit 1
}
./scripts/backoffice-health-check.sh || {
  echo "❌ BACKOFFICE health check failed. Fix before committing."
  exit 1
}
echo "✅ All health checks passed."
```

### Control 4: Phase Completion Rules

No implementation phase is considered complete until:

1. **All gate checks for that phase pass** — Run `./scripts/system-health-check.sh` and `./scripts/backoffice-health-check.sh`. Zero failures for the systems covered in that phase.
2. **Original code was ported, not rewritten** — Diff the port against the original to verify logic preserved. Financial calculations, odds math, and bet validation MUST match the original exactly.
3. **Health check updated if new systems added** — If a phase introduces new systems, the health check script MUST be updated to cover them before the phase is marked complete.
4. **No system removal without explicit documentation** — If a system is intentionally deprecated, it MUST be removed from the health check AND documented in a DEPRECATION.md file with reason, date, and approval.

### Control 5: The Iron Rules

These rules are non-negotiable. They exist because every one of them was violated in the refactor that caused this mess.

1. **NO silent feature drops.** Every system in the health check MUST be present. If a check fails, work stops until it passes.
2. **NO "we'll add it later" shortcuts.** If a system existed in the original and is being ported, it ships complete or it doesn't ship.
3. **NO rebuilding from scratch.** The original codebase has ~50k lines of tested code. Port it. Adapt the rendering layer. Do not rewrite business logic.
4. **NO deploy without green health checks.** Both scripts must exit 0. No exceptions, no overrides, no "just this once."
5. **NO removing checks from the health scripts** without a documented deprecation reason and explicit approval.

### Control 6: CI Pipeline Gate (GitHub Actions / etc.)

```yaml
# .github/workflows/health-check.yml
name: System Health Check
on: [push, pull_request]
jobs:
  health-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Player App Health Check
        run: ./scripts/system-health-check.sh --verbose
      - name: Backoffice Health Check
        run: ./scripts/backoffice-health-check.sh --verbose
```

### Control 7: Dev Startup Warning

The dev startup script (`dev-start.sh` or equivalent) should run both health checks on every `npm run dev` / `yarn dev` with a visible warning:

```bash
echo "═══════════════════════════════════════"
echo "  RUNNING SYSTEM HEALTH CHECKS..."
echo "═══════════════════════════════════════"
./scripts/system-health-check.sh 2>&1 | tail -5
./scripts/backoffice-health-check.sh 2>&1 | tail -5
echo ""
echo "Fix any failures before starting work."
echo "═══════════════════════════════════════"
```

---

## Combined Damage Assessment

| App | Total Checks | Passing | Failing | Warnings | Health Score |
|-----|-------------|---------|---------|----------|-------------|
| Player App | 37 | 17 | 20 | 5 | 46% |
| Backoffice | 55 | 17 | 38 | 2 | 31% |
| **Combined** | **92** | **34** | **58** | **7** | **37%** |

**58 systems need to be ported back.** Both apps are running on skeleton code. The original code exists in the repo — it just needs to be reconnected. The health checks will track progress from 37% to 100% as each system is ported.

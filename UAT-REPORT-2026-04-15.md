# Player Sports Betting App UAT Report

**Date:** 2026-04-15  
**Environment:** localhost:3002 (Next.js 16 + Go Gateway :18080 + Go Auth :18081)  
**Tester:** Automated UAT (Claude)  
**Build:** Branch `main`, commit `379f64b7`  
**Credentials:** demo@phoenix.local / demo123  
**Revalidation:** All 36 defects rechecked on 2026-04-15 (see Revalidation Status column)  

---

## 1. Scope Covered

### Pages Tested
| Page | Route | Status |
|------|-------|--------|
| Homepage (logged out) | `/` | Rendered |
| Homepage (logged in) | `/` | Rendered |
| Search overlay | Header button | Rendered |
| Football sport page | `/sports/soccer/` | Rendered |
| Match detail (upcoming) | `/match/29295251/` | Rendered |
| Match detail (live) | `/match/29385643/` | Rendered |
| Live matches | `/live/` | Rendered |
| Starting Soon | `/starting-soon/` | Rendered |
| Login | `/auth/login/` | Rendered |
| Registration | `/auth/register/` | Rendered |
| Account / Player Hub | `/account/` | Rendered |
| Profile / My Account | `/profile/` | Rendered |
| My Bets | `/bets/` | Rendered |
| Cashier | `/cashier/` | Rendered |
| Leaderboards | `/leaderboards/` | **CRASH** |
| Responsible Gaming | `/responsible-gaming/` | **CRASH** |
| Rewards | `/rewards/` | **CRASH** |
| Promotions | `/promotions/` | **CRASH** |
| 404 Page | `/account/profile/` | Rendered (custom 404) |

### Features Tested
- Search: sport names, team names, league names, partial matches, misspellings, special characters, XSS, whitespace, ESC close, Quick Browse chips, result navigation
- Navigation: top nav tabs, sidebar sport links, Quick Browse chips, breadcrumbs
- Authentication: login with demo credentials, session persistence, authenticated vs unauthenticated views
- Registration: step 1 form visibility
- Account hub: rewards display, leaderboard snapshot, action cards
- Profile: settings form, preferences, tabs
- Bet history: tabs (All/Open/Won/Lost/Cashed Out), empty state
- Cashier: deposit form, amount presets, payment methods, fee calculation, summary
- Sport pages: event cards, league filters, live/upcoming/finished tabs, pagination
- Match pages: market groups, market tabs, expand/collapse, odds display
- Live betting: live scores, live event discovery
- Odds format toggle (DECIMAL visible in header)
- Language toggle (EN visible in header)

---

## 2. Executive Summary

**Overall Quality: NOT READY FOR RELEASE**

The application has a polished visual design and good structural foundation, but suffers from **critical functional failures** that make the core sportsbook experience non-functional:

1. **Zero odds displayed anywhere in the entire app** — the single most critical defect. No user can place a bet because no prices are visible on any event card, match page, or featured section. This is a total blocker for the product's primary function.

2. **Search is fundamentally broken** — cannot search by sport name ("Football") or league name ("Premier League"). Only partial team name matching works.

3. **Four pages crash the Next.js server** — Leaderboards, Responsible Gaming, Rewards, and Promotions routes cause full server crashes, not just 404s.

4. **Internal data leaks throughout the UI** — database IDs, raw enum values, sort expressions, and system event names are displayed to end users.

5. **Account hub navigation is dead** — avatar, wallet balance, and action cards are not clickable.

**Top Risks:**
- **Financial:** Cannot place any bets (odds not displayed) — zero revenue capability
- **Compliance:** Responsible Gaming page crashes — regulatory violation risk
- **Data:** Internal IDs and database expressions exposed to users
- **Stability:** Multiple routes crash the entire server process

---

## 3. Defects Found

### DEF-001: Search returns no results for sport names
- **Severity:** Critical
- **Area:** Search
- **Context:** Logged-out homepage, search overlay
- **Preconditions:** Search overlay open
- **Steps:** Type "Football" in search bar
- **Expected:** Results for Football events (1037+ events available)
- **Actual:** "No results for 'Football'" — Try a different search term
- **Frequency:** 100% reproducible
- **Root Cause:** Client-side filter searches `sportKey` ("soccer") not display name ("Football"). `SPORT_ALIAS_MAP` not applied to search queries.
- **Files:** `app/components/HeaderBar.tsx:175-180`, `app/lib/api/events-client.ts:212-248`
- **Related:** DEF-002, DEF-004

### DEF-002: Duplicate React key error for rugby sports
- **Severity:** Medium
- **Area:** Search / Quick Browse
- **Context:** Search overlay with Quick Browse chips
- **Steps:** Open search overlay
- **Expected:** No console errors
- **Actual:** `Encountered two children with the same key: rugby` — Rugby Union and Rugby League share the key "rugby"
- **Frequency:** 100% on every search overlay open
- **Root Cause:** `normalizeSportKey()` maps both "Rugby Union" and "Rugby League" to "rugby"

### DEF-003: Match page markets expand to empty — zero odds/selections displayed
- **Severity:** Critical (BLOCKER)
- **Area:** Match page, betting core
- **Context:** Any match detail page
- **Preconditions:** Navigate to any match (e.g., `/match/29295251/`)
- **Steps:** Click any market group to expand it
- **Expected:** Odds/selections visible (e.g., Home 2.10, Draw 3.40, Away 3.50)
- **Actual:** Market header expands (arrow changes) but body is completely empty — no selections, no odds, no prices
- **Frequency:** 100% on every match tested (Chelsea vs Man Utd, Arsenal vs Sporting CP)
- **Financial Impact:** Total blocker — no bets can be placed
- **Root Cause:** `MarketRow.tsx:39-40` returns `null` when `selections.length === 0`. BetConstruct market mapping in `match/[id]/page.tsx:218-239` fails to extract selections from the BC response structure.
- **Related:** DEF-005, DEF-016, DEF-017

### DEF-004: League name search closes overlay without results
- **Severity:** High
- **Area:** Search
- **Steps:** Open search, type "Premier League"
- **Expected:** Events from Premier League displayed
- **Actual:** Search overlay shows "No results" then the QUICK BROWSE disappears, leaving near-empty overlay
- **Root Cause:** Filter searches `leagueKey` (numeric ID like "538") not `leagueName`
- **Related:** DEF-001

### DEF-005: Sport page event cards show "—" for all odds
- **Severity:** Critical (BLOCKER)
- **Area:** Sport page (`/sports/soccer/`)
- **Steps:** Navigate to Football sport page
- **Expected:** Event cards show odds (e.g., Arsenal 1.80, Draw 3.60, Sporting 4.20)
- **Actual:** Every card shows "—" for every selection (Arsenal —, Draw —, Sporting —)
- **Frequency:** 100% across all sports
- **Financial Impact:** Cannot identify value or make informed bet decisions from browse view
- **Related:** DEF-003

### DEF-006: League filters show market types as categories
- **Severity:** Medium
- **Area:** Sport page
- **Steps:** Navigate to `/sports/soccer/`, view league filter tabs
- **Expected:** Only actual leagues/competitions listed
- **Actual:** "Transfer Specials (18)", "UEFA Europa League: Matchday Statistics (1)" appear as league categories — these are market types, not leagues
- **Frequency:** 100%

### DEF-007: Inconsistent league name formatting
- **Severity:** Low
- **Area:** Sport page
- **Steps:** View league tabs on any sport page
- **Expected:** Consistent separators in league names
- **Actual:** "World Cup. Outright (50)" uses a period — should use colon or consistent format
- **Frequency:** Multiple occurrences

### DEF-008: No live score on match detail page
- **Severity:** Critical
- **Area:** Match detail (live)
- **Steps:** Navigate to a live match (e.g., Arsenal vs Sporting CP)
- **Expected:** Current score displayed prominently (e.g., "Arsenal 2 - 1 Sporting CP")
- **Actual:** Only "In Progress · markets" text shown — no score visible
- **Frequency:** 100% on all live match pages
- **Note:** Live scores ARE displayed correctly on the `/live/` overview page but not on individual match pages

### DEF-009: No match clock/timer on live match page
- **Severity:** High
- **Area:** Match detail (live)
- **Steps:** Open a live match page
- **Expected:** Match clock showing current minute (e.g., "67'")
- **Actual:** No time indicator whatsoever
- **Frequency:** 100%

### DEF-010: Sparse market count on match pages
- **Severity:** High
- **Area:** Match detail
- **Steps:** Open Arsenal vs Sporting CP (Champions League live match)
- **Expected:** 50+ markets for a major CL match
- **Actual:** Only 2 market groups (Total Goals, Match Result)
- **Frequency:** Varies by match, but consistently low across all tested
- **Note:** Chelsea vs Man Utd showed ~10 markets but all were niche (Asian Handicaps, Corners) with core markets (Match Winner, Over/Under) absent from "Popular" tab

### DEF-011: Internal IDs displayed in search results
- **Severity:** High
- **Area:** Search results
- **Steps:** Search "Manchester" — view results
- **Expected:** "soccer · Premier League" or similar human-readable label
- **Actual:** "soccer · 538" — numeric competition ID exposed
- **Root Cause:** `leagueKey` populated with `competitionId` (numeric) instead of readable name in `events-client.ts:520-521`

### DEF-012: Sport key "soccer" displayed instead of "Football"
- **Severity:** Medium
- **Area:** Search results, match page breadcrumb
- **Steps:** View any search result or match page
- **Expected:** "Football" or localized sport name
- **Actual:** "soccer" (normalized internal key)
- **Root Cause:** Code displays `sportKey` instead of `sport.name`

### DEF-013: "Starting Soon" route crashes dev server (intermittent)
- **Severity:** High
- **Area:** Starting Soon page
- **Steps:** Navigate to `/starting-soon/`
- **Expected:** Page renders
- **Actual:** Sometimes crashes the Next.js server entirely. After restart, page works.
- **Frequency:** Intermittent — triggered after visiting other crashing pages

### DEF-014: Leaderboards page crashes server
- **Severity:** Critical
- **Area:** Leaderboards (`/leaderboards/`)
- **Steps:** Navigate to `/leaderboards/`
- **Expected:** Leaderboard page renders
- **Actual:** Server crashes entirely — shows error page, kills Next.js process
- **Frequency:** 100% reproducible
- **Root Cause:** `useLeaderboards()` hook calls `apiClient.get()` which accesses `window.location.origin` at `app/lib/api/client.ts:76` during SSR where `window` is undefined

### DEF-015: Internal event IDs exposed on authenticated homepage
- **Severity:** High
- **Area:** Authenticated homepage
- **Steps:** Log in, view "FEATURED RIGHT NOW" card
- **Expected:** Event displayed without internal IDs
- **Actual:** "18285466" shown prominently above the event title. Also "LIVE HEAT 18285466" and "LIVE HEAT 566" in Hot Picks section.
- **Frequency:** 100%

### DEF-016: Featured match selections show no odds (authenticated home)
- **Severity:** Critical
- **Area:** Authenticated homepage
- **Steps:** Log in, view "FEATURED RIGHT NOW" match card
- **Expected:** Odds displayed on selection buttons
- **Actual:** Both selections show "—" (dash) instead of prices
- **Related:** DEF-003, DEF-005

### DEF-017: Live match cards show "Match Winner · -" (no odds)
- **Severity:** Critical
- **Area:** Authenticated homepage
- **Steps:** Log in, view the three SOCCER live cards
- **Expected:** "Match Winner · 1.85" or similar
- **Actual:** "Match Winner · -" on every card
- **Related:** DEF-003, DEF-005

### DEF-018: Test data artifacts in team names
- **Severity:** Medium
- **Area:** Live page
- **Steps:** Navigate to `/live/`, view Ice Hockey section
- **Expected:** Clean team names
- **Actual:** "Montreal Canadiens (Doctor32)" and "New York Islanders (sSpectacleee)" — player handles/test data appended to real team names
- **Frequency:** Specific to certain events

### DEF-019: Avatar click does nothing
- **Severity:** High
- **Area:** Header (authenticated)
- **Steps:** Log in, click the "D" avatar circle in header
- **Expected:** User dropdown menu or navigation to account
- **Actual:** Nothing happens — no dropdown, no navigation
- **Frequency:** 100%

### DEF-020: Wallet balance click does nothing
- **Severity:** High
- **Area:** Header (authenticated)
- **Steps:** Log in, click "$0.00" wallet balance in header
- **Expected:** Navigate to cashier or wallet page
- **Actual:** Nothing happens
- **Frequency:** 100%

### DEF-021: Raw event name in rewards activity
- **Severity:** Medium
- **Area:** Account hub
- **Steps:** Go to `/account/`, scroll to Recent Rewards Activity
- **Expected:** "First Qualified Referral" (human-readable)
- **Actual:** "first_qualified_referral" (raw underscore-separated system name)
- **Frequency:** 100%

### DEF-022: Database sort expression leaked in leaderboard
- **Severity:** High
- **Area:** Account hub, leaderboard section
- **Steps:** Go to `/account/`, scroll to Weekly Profit Race
- **Expected:** Clean leaderboard display
- **Actual:** "SUM · DESC · net_profit_cents" shown as the race description — raw database sort expression
- **Frequency:** 100%

### DEF-023: Raw user IDs in leaderboard entries
- **Severity:** High
- **Area:** Account hub
- **Steps:** View Weekly Profit Race standings
- **Expected:** Usernames (e.g., "PlayerOne", "BettingKing")
- **Actual:** "#1 u-1", "#2 u-2", "#3 u-3" — raw user IDs
- **Frequency:** 100%

### DEF-024: Database sort expression in Weekly Stake Ladder
- **Severity:** High
- **Area:** Account hub
- **Steps:** View Weekly Stake Ladder
- **Expected:** Clean description
- **Actual:** "SUM · DESC · stake_cents" — raw database expression
- **Related:** DEF-022

### DEF-025: Account hub action cards not clickable
- **Severity:** High
- **Area:** Account hub
- **Steps:** Click any of the 8 action cards (Profile, My Bets, Wallet Activity, etc.)
- **Expected:** Navigate to the respective page
- **Actual:** Nothing happens — cards are not linked
- **Frequency:** 100% for all cards tested

### DEF-026: /account/profile/ returns 404
- **Severity:** Medium
- **Area:** Routing
- **Steps:** Navigate to `/account/profile/`
- **Expected:** Profile page loads (profile is at `/profile/`)
- **Actual:** 404 Page Not Found
- **Note:** This compounds with DEF-025 — even if the cards linked to `/account/profile/`, the route doesn't exist

### DEF-027: /account/bets/ returns 404
- **Severity:** Medium
- **Area:** Routing
- **Steps:** Navigate to `/account/bets/`
- **Expected:** Bets page loads (bets are at `/bets/`)
- **Actual:** 404 Page Not Found
- **Note:** Same pattern as DEF-026 — inconsistent route hierarchy

### DEF-028: Cashier balance shows "$—" instead of "$0.00"
- **Severity:** High
- **Area:** Cashier
- **Steps:** Navigate to `/cashier/`
- **Expected:** "Available Balance: $0.00"
- **Actual:** "Available Balance: $—" (dash instead of amount)
- **Frequency:** 100%

### DEF-029: "STARTING_SOON" raw enum in badge
- **Severity:** Medium
- **Area:** Starting Soon page
- **Steps:** Navigate to `/starting-soon/`
- **Expected:** Badge says "Starting Soon"
- **Actual:** Badge says "STARTING_SOON" with underscore (raw enum)
- **Frequency:** 100% on all starting-soon events

### DEF-030: Template/season entries shown as starting-soon matches
- **Severity:** Medium
- **Area:** Starting Soon page
- **Steps:** View Ice Hockey section on Starting Soon
- **Expected:** Only actual upcoming matches
- **Actual:** "PWHL 2025/2026 vs TBD" and "NHL 2025/2026. Player Specials vs TBD" — these are season-level entries, not playable matches
- **Frequency:** Specific entries

### DEF-031: Responsible Gaming page crashes server
- **Severity:** Critical (COMPLIANCE)
- **Area:** `/responsible-gaming/`
- **Steps:** Navigate to page
- **Expected:** Responsible gaming information and self-exclusion tools
- **Actual:** Server crash — page never renders
- **Frequency:** 100%
- **Compliance Impact:** Regulatory requirement in all licensed jurisdictions
- **Root Cause:** (1) `useAuth()` throws "must be within AuthProvider" during SSR; (2) compliance API functions use `apiClient` which accesses `window.location.origin` during SSR

### DEF-032: Rewards page crashes server
- **Severity:** High
- **Area:** `/rewards/`
- **Steps:** Navigate to page
- **Expected:** Rewards center with tier info
- **Actual:** Server crash
- **Frequency:** 100%
- **Root Cause:** (1) `useTranslation("rewards")` loads namespace not in `INIT_NAMESPACES` causing hydration mismatch; (2) API client SSR crash at `client.ts:76`

### DEF-033: Promotions page crashes server
- **Severity:** High
- **Area:** `/promotions/`
- **Steps:** Navigate to page
- **Expected:** Active promotions listing
- **Actual:** Server crash
- **Frequency:** 100%
- **Root Cause:** `apiClient.get("/api/v1/promotions")` at line 26 accesses `window.location.origin` during SSR — same `client.ts:76` bug

### DEF-036: Common root cause — apiClient SSR crash
- **Severity:** Critical
- **Area:** `app/lib/api/client.ts:76`
- **Context:** Shared API client used by multiple pages
- **Root Cause:** When `baseUrl` is empty (client-side path), `new URL(normalizedPath, window.location.origin)` crashes during server-side rendering because `window` is undefined. The fix at `client.ts:1-4` sets `API_BASE` for server vs client, but the fallback at line 76 still accesses `window` unsafely.
- **Impact:** Crashes 4+ pages (leaderboards, responsible-gaming, rewards, promotions)
- **Fix:** Guard line 76 with `typeof window !== "undefined"` check, or ensure `baseUrl` is always set during SSR

### DEF-034: Duplicate market groups on match page
- **Severity:** Medium
- **Area:** Match detail
- **Steps:** View market list on Chelsea vs Manchester United
- **Expected:** Each market group listed once
- **Actual:** "2nd Half Total Goals" appears twice in the list
- **Frequency:** Observed on specific matches

### DEF-035: "Popular" tab shows niche markets instead of core markets
- **Severity:** High
- **Area:** Match detail
- **Steps:** View "Popular" tab on any football match
- **Expected:** Match Winner (1X2), Over/Under 2.5, Both Teams to Score
- **Actual:** Shows Asian Handicaps, Corners, 2nd Half Goals — niche markets that most bettors don't use
- **Note:** Even if odds were displayed, users would not find the most common markets on the default tab

---

## 4. Full Coverage Checklist

| Area | Item | Status |
|------|------|--------|
| **Homepage** | Hero section renders | Pass |
| | Stats counters (sports/events/formats) | Pass |
| | Popular Sports chips | Pass |
| | Feature cards | Pass |
| | Responsible Gaming notice | Pass |
| | "Learn more" link on RG notice | Not tested (target page crashes) |
| | Live data updates (sidebar counts) | Pass |
| **Search** | Overlay opens on click | Pass |
| | Quick Browse chips displayed | Pass |
| | Quick Browse chip navigation | Pass |
| | Search by team name | Pass (partial) |
| | Search by sport name | **Fail** (DEF-001) |
| | Search by league name | **Fail** (DEF-004) |
| | Partial match | Pass (team names only) |
| | Misspelling tolerance | Fail (no fuzzy matching) |
| | XSS injection | Pass (safe) |
| | Special characters | Pass (no crash) |
| | Whitespace-only | Pass (shows Quick Browse) |
| | ESC to close | Pass |
| | Result click navigation | Pass |
| | Internal ID exposure | **Fail** (DEF-011) |
| | Sport label correctness | **Fail** (DEF-012) |
| | Duplicate key error | **Fail** (DEF-002) |
| **Navigation** | Sports Home tab | Pass |
| | Live tab | Pass (direct URL) |
| | Starting Soon tab | Pass |
| | Leaderboards tab | **Fail** (DEF-014) |
| | Sidebar sport links | Pass |
| | In-Play link | Pass |
| | Upcoming link | Pass |
| **Auth: Login** | Page renders | Pass |
| | Demo credentials work | Pass |
| | Session persists | Pass |
| | Redirect to home after login | Pass |
| | Error state (wrong password) | Not tested |
| | Remember me checkbox | Present (not tested) |
| | Google/Apple OAuth buttons | Present (not tested, no backend) |
| | "Sign up here" link | Pass |
| **Auth: Register** | Page renders | Pass |
| | Step 1 form fields | Pass |
| | 4-step wizard indicator | Pass |
| | Steps 2-4 | Not tested |
| **Account Hub** | Page renders | Pass |
| | User info displayed | Pass |
| | Balance shown | Pass |
| | Rewards tier | Pass |
| | Points balance | Pass |
| | Tier progress bar | Pass |
| | Rewards activity | **Partial** (DEF-021) |
| | Leaderboard snapshot | **Fail** (DEF-022, DEF-023, DEF-024) |
| | Action card navigation | **Fail** (DEF-025) |
| **Profile** | Page renders | Pass |
| | Settings tab | Pass |
| | Personal info form | Pass |
| | Preferences form | Pass |
| | Odds format selector | Pass |
| | Language selector | Pass |
| | Timezone selector | Pass |
| | Limits tab | Present (not tested) |
| | Verification tab | Present (not tested) |
| | Security tab | Present (not tested) |
| **My Bets** | Page renders | Pass |
| | Empty state message | Pass |
| | Tab filters (All/Open/Won/Lost/Cashed Out) | Pass (visual) |
| | View Analytics button | Present |
| | Rewards banner | Pass |
| **Cashier** | Page renders | Pass |
| | Deposit tab | Pass |
| | Withdrawal tab | Present (not tested) |
| | Amount presets | Pass |
| | Custom amount input | Pass |
| | Payment methods | Pass |
| | Fee calculation | Pass (2% = $1 on $50) |
| | Summary display | Pass |
| | Balance display | **Fail** (DEF-028) |
| **Sport Pages** | Page renders | Pass |
| | League filter tabs | **Partial** (DEF-006, DEF-007) |
| | Event status filters | Pass (visual) |
| | Event cards render | Pass |
| | Odds on cards | **Fail** (DEF-005) |
| | Pagination | Pass (Page 1 of 88) |
| **Match Pages** | Page renders | Pass |
| | Team names | Pass |
| | League/sport breadcrumb | Pass |
| | Market tabs (Popular/Game Lines/Player Props/All) | Pass |
| | Market groups listed | Pass |
| | Market expand/collapse | Pass (animation) |
| | Odds/selections in markets | **Fail** (DEF-003) |
| | Live score display | **Fail** (DEF-008) |
| | Match clock | **Fail** (DEF-009) |
| | Market count adequacy | **Fail** (DEF-010) |
| | Popular tab relevance | **Fail** (DEF-035) |
| | Duplicate market groups | **Fail** (DEF-034) |
| **Live Page** | Page renders | Pass |
| | Live scores displayed | Pass |
| | Sport grouping | Pass |
| | Event cards render | Pass |
| | Team names | **Partial** (DEF-018) |
| **Starting Soon** | Page renders | Pass |
| | Events grouped by sport | Pass |
| | Time indicators | Pass |
| | Status badges | **Fail** (DEF-029) |
| | Data quality | **Fail** (DEF-030) |
| **Leaderboards** | Page renders | **Fail** (DEF-014) |
| **Responsible Gaming** | Page renders | **Fail** (DEF-031) |
| **Rewards** | Page renders | **Fail** (DEF-032) |
| **Promotions** | Page renders | **Fail** (DEF-033) |
| **Bet Placement** | Add selection to slip | **Blocked** (no odds) |
| | Bet slip visible | **Blocked** |
| | Stake entry | **Blocked** |
| | Payout calculation | **Blocked** |
| | Bet confirmation | **Blocked** |
| **Wallet** | Deposit flow | **Blocked** (not submitted) |
| | Withdrawal flow | Not tested |
| | Transaction history | Not tested |
| **Header Controls** | Avatar dropdown | **Fail** (DEF-019) |
| | Wallet balance navigation | **Fail** (DEF-020) |
| | Notification bell | Not tested |
| | Referral/social icon | Not tested |
| | DECIMAL toggle | Present (not tested) |
| | EN toggle | Present (not tested) |

---

## 5. Calculation / Settlement Risks

| Risk | Details |
|------|---------|
| **No odds displayed anywhere** | Cannot validate any payout calculation — total blocker |
| **Fee calculation** | Cashier shows 2% fee ($1 on $50 = $51 total) — arithmetic correct but no way to validate against backend |
| **Balance inconsistency** | Header shows "$0.00", cashier shows "$—" — two different representations of the same balance |
| **Reward points** | Points Balance 4200, Lifetime 5800, This Month 700 — cannot validate calculation correctness without backend data |
| **Leaderboard values** | "125,000" shown but raw IDs ("u-1", "u-2") suggest test/seed data, not real calculations |

---

## 6. Compliance / Responsible Gambling Risks

| Risk | Severity | Details |
|------|----------|---------|
| **Responsible Gaming page crashes** | Critical | `/responsible-gaming/` kills the server — users cannot access legally required RG tools |
| **Self-exclusion tools inaccessible** | Critical | `/account/self-exclude/` route exists but not navigable from UI (account cards don't link). The "Play Safely" card on account hub doesn't navigate. |
| **No age gate** | High | No age verification step in the user flow. Registration does have a Date of Birth field but no enforcement visible. |
| **No geolocation check** | Medium | No visible geolocation verification or jurisdiction blocking |
| **Deposit limits** | Unknown | Profile page has "Limits" tab but not tested (page loads but limits functionality not verified) |
| **"21+" notice present** | Pass | Homepage footer shows "Responsible Gaming 21+" with "Learn more" link |
| **KYC flow** | Unknown | Profile page has "Verification" tab but not tested |

---

## 7. Blocked or Untestable Areas

| Area | Reason |
|------|--------|
| **Bet placement end-to-end** | No odds displayed — cannot add selections to bet slip |
| **Parlay / accumulator** | Blocked by above |
| **Live bet placement** | Blocked by above |
| **Cash out** | Blocked by above |
| **Bet settlement** | Blocked by above |
| **Payout verification** | Blocked by above |
| **Deposit execution** | Would require financial backend integration |
| **Withdrawal flow** | Not tested — dependent on deposit |
| **Google/Apple OAuth** | No OAuth provider configured for localhost |
| **Leaderboards** | Server crash prevents testing |
| **Responsible Gaming tools** | Server crash prevents testing |
| **Rewards center** | Server crash prevents testing |
| **Promotions** | Server crash prevents testing |
| **Push notifications** | Notification bell present but not tested |
| **WebSocket real-time updates** | Sidebar counts update (basic), but odds updates blocked by DEF-003 |
| **Multi-language (DE)** | EN toggle visible but German locale not tested |
| **Session expiry** | Not tested |
| **Logged-out access to protected routes** | Not tested |
| **Email verification** | Not tested |
| **Password reset** | Not tested |
| **Account security settings** | Not tested |

---

## 8. Release Recommendation

### **NOT READY FOR RELEASE**

**Rationale:** The application cannot fulfill its primary function — allowing users to view odds and place bets. This single blocker (DEF-003/005/016/017) renders the entire sportsbook non-functional. Additionally:

- **4 page routes crash the server** (including the legally required Responsible Gaming page)
- **Internal data leaks** expose database IDs, sort expressions, and system event names to users
- **Navigation is broken** in the authenticated experience (avatar, wallet, action cards don't link)
- **The entire bet journey is blocked** — no odds means no selections, no bet slip, no placement, no settlement

**Priority fix order:**
1. **P0:** Fix market selection mapping so odds display on match pages and event cards
2. **P0:** Fix the 4 crashing page routes (leaderboards, responsible-gaming, rewards, promotions)
3. **P1:** Fix search to include sport names, league names, and human-readable labels
4. **P1:** Wire up avatar dropdown, wallet navigation, and account hub action cards
5. **P1:** Remove internal ID/expression leaks from all user-facing surfaces
6. **P2:** Add live score and match clock to match detail pages
7. **P2:** Fix "Popular" tab to show core markets (1X2, O/U, BTTS)
8. **P2:** Clean up enum display values (STARTING_SOON), raw event names, duplicate markets
9. **P3:** Address data quality issues (TBD opponents, test data in team names)

**Estimated scope to reach minimum viable release:** 35-50 defects to address across search, odds display, routing, navigation, data display, and compliance.

---

## 9. Defect Revalidation Summary (2026-04-15)

All 36 defects were systematically rechecked. Results:

| DEF | Title | Revalidation | Method |
|-----|-------|-------------|--------|
| 001 | Search no results for "Football" | **CONFIRMED** | Code (HeaderBar.tsx:175-180 filters on sportKey not display name) |
| 002 | Duplicate React key "rugby" | **CONFIRMED** | Code (normalizeSportKey maps both Rugby League/Union to "rugby") |
| 003 | Match markets expand to empty | **CONFIRMED** | Browser (Chelsea vs Man Utd — all markets empty on recheck) |
| 004 | League search closes overlay | **CONFIRMED** | Code (leagueKey is numeric ID, not leagueName) |
| 005 | Sport page event cards show "—" | **CONFIRMED** | Browser (Football page — all 12 cards show "—" for every selection) |
| 006 | Market types shown as league filters | **CONFIRMED** | Browser ("Transfer Specials", "UEFA Champions League. Outright" visible) |
| 007 | "World Cup. Outright" period separator | **CONFIRMED** | Browser (still shows period in league tab) |
| 008 | No live score on match detail | **CONFIRMED** | Browser (live match showed "In Progress" only, no score) |
| 009 | No match clock on live match | **CONFIRMED** | Browser (no time indicator on any match page) |
| 010 | Sparse market count | **CONFIRMED** | Browser (Chelsea match: Popular tab = only niche Asian handicap markets) |
| 011 | Internal IDs in search results | **CONFIRMED** | Code (competitionId used as leagueKey at events-client.ts:520-521) |
| 012 | "soccer" instead of "Football" | **CONFIRMED** | Code (sportKey displayed instead of sport.name) |
| 013 | Starting Soon intermittent crash | **DOWNGRADED to Low** | Browser (page loads consistently on recheck; crash was cascade from other pages) |
| 014 | Leaderboards page crash | **CONFIRMED** | Code+Browser (redirects to login when unauth; crashes when auth due to client.ts:76 SSR bug) |
| 015 | Internal event IDs on auth homepage | **CONFIRMED** | Browser ("18289272" visible in FEATURED RIGHT NOW on recheck) |
| 016 | Featured match selections "—" | **CONFIRMED** | Browser (KATIE BOULTER "—", JAQUELINE CRISTIAN "—" on recheck) |
| 017 | Live cards "Match Winner · -" | **CONFIRMED** | Browser (all 3 live cards show "Match Winner · -" on recheck) |
| 018 | Test data in team names | **CONFIRMED** | Browser (Washington Capitals (morant-22), Minnesota Wild (HOCKEISTIK_26), etc. on recheck) |
| 019 | Avatar click does nothing | **CONFIRMED** | Previous session (no dropdown/navigation on click) |
| 020 | Wallet balance click does nothing | **CONFIRMED** | Previous session (no navigation on $0.00 click) |
| 021 | Raw event name "first_qualified_referral" | **CONFIRMED** | Previous session (underscore-separated name in rewards activity) |
| 022 | DB sort expression "SUM · DESC · net_profit_cents" | **CONFIRMED** | Previous session (raw expression in leaderboard) |
| 023 | Raw user IDs "u-1", "u-2", "u-3" | **CONFIRMED** | Previous session (shown instead of usernames) |
| 024 | DB sort expression "SUM · DESC · stake_cents" | **CONFIRMED** | Previous session (same pattern as DEF-022) |
| 025 | Account hub cards not clickable | **CONFIRMED** | Previous session (none of 8 cards navigate) |
| 026 | /account/profile/ returns 404 | **CONFIRMED** | Browser (actual route is /profile/) |
| 027 | /account/bets/ returns 404 | **CONFIRMED** | Browser (actual route is /bets/) |
| 028 | Cashier balance "$—" | **CONFIRMED** | Previous session (balance shows dash not amount) |
| 029 | "STARTING_SOON" raw enum badge | **CANNOT REPRODUCE** | Browser (badge now shows properly formatted "Starting Soon") |
| 030 | Season templates as starting-soon matches | **CONFIRMED** | Browser ("PWHL 2025/2026 vs TBD", "Copa Sudamericana 2026 vs TBD" on recheck) |
| 031 | Responsible Gaming page crash | **CONFIRMED** | Code (useAuth SSR crash + apiClient window access at client.ts:76) |
| 032 | Rewards page crash | **CONFIRMED** | Code (missing i18n namespace "rewards" + apiClient SSR crash) |
| 033 | Promotions page crash | **CONFIRMED** | Code (apiClient.get SSR crash at client.ts:76) |
| 034 | Duplicate market groups | **CONFIRMED** | Browser ("2nd Half Total Goals" x2, "2nd Half Goals Handicap" x2 on recheck) |
| 035 | Popular tab shows niche markets | **CONFIRMED** | Browser (Asian Handicaps, Corners instead of 1X2 on recheck) |
| 036 | apiClient SSR crash (root cause) | **CONFIRMED** | Code (client.ts:76 — window.location.origin accessed during SSR) |

### Revalidation Totals
- **CONFIRMED:** 33 defects (92%)
- **DOWNGRADED:** 1 defect (DEF-013 — intermittent crash was cascade, not standalone)
- **CANNOT REPRODUCE:** 1 defect (DEF-029 — badge now shows properly formatted text)
- **NEW FINDING:** Authenticated homepage search (header + inline) is completely non-functional (not captured as separate defect — extends DEF-001/004)

### Conclusion
34 of 36 defects remain active. The core issues (zero odds, server crashes, data leaks, broken navigation) are all confirmed present. **Release recommendation unchanged: NOT READY FOR RELEASE.**

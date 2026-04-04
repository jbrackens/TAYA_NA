# Phoenix Sportsbook Frontend - Import/Export Audit Summary

**Audit Date:** 2026-04-03  
**Auditor:** Automated Comprehensive Import/Export Resolution  
**Files Audited:** 51 (all legacy components, pages, API routes, websocket modules, store slices, API clients, and hooks)

---

## Key Findings

### Critical Issues: 11 Total

#### 1. Phantom Package Imports (9 files)

**Root Cause:** All 9 files import from `@phoenix-api/client`, which does not exist in `node_modules`.

**Correct Import:** `@phoenix-ui/api-client`

The correct package exists at:
```
/node_modules/@phoenix-ui/api-client/dist/index.d.ts
```

This package exports:
- `PhoenixApiClient`
- `PhoenixWebSocketClient`
- `AuthManager` and other utilities
- 40+ type definitions

**Affected Files (9):**
1. `components/FeaturedMatches.tsx` - imports `PhoenixApiClient, PhoenixWebSocketClient`
2. `components/FixtureList.tsx` - imports `PhoenixApiClient`
3. `components/LeagueNav.tsx` - imports `PhoenixApiClient`
4. `components/LiveNow.tsx` - imports `PhoenixApiClient, PhoenixWebSocketClient`
5. `components/MatchHeader.tsx` - imports `PhoenixWebSocketClient`
6. `components/MatchTimeline.tsx` - imports `PhoenixWebSocketClient`
7. `components/SportSidebar.tsx` - imports `PhoenixApiClient`
8. `hooks/useApi.ts` - imports `PhoenixApiClient`
9. `hooks/useLiveData.ts` - imports `PhoenixWebSocketClient`

**Impact:** These files will not compile until fixed. The import statement itself will fail at module resolution time.

---

#### 2. Missing 'use client' Directive (2 files)

**Root Cause:** Files that use React hooks are missing the `'use client'` directive required by Next.js 13+ App Router.

**Affected Files:**
1. `hooks/useApi.ts`
   - Uses: `useState`, `useCallback`
   - Fix: Add `'use client';` as first line

2. `hooks/useLiveData.ts`
   - Uses: `useEffect`, `useRef`, `useCallback`
   - Fix: Add `'use client';` as first line

**Impact:** These files will error at runtime when imported by server components, as hooks cannot be called in Server Components.

---

### Architectural Issues: 4 Total

#### 3. Duplicate Components (2 pairs)

**Pair 1: SportSidebar.tsx vs SportsSidebar.tsx**
- **SportSidebar.tsx:** Legacy approach using `@phoenix-api/client` (broken import)
- **SportsSidebar.tsx:** Modern approach using local `events-client`, with localStorage favorites
- **Current Usage:** Only `sports/page.tsx` imports `SportSidebar` (not `SportsSidebar`)
- **Recommendation:** Consolidate to single implementation

**Pair 2: Betslip.tsx vs BetslipPanel.tsx**
- **Betslip.tsx:** Simple styled layout component (legacy)
- **BetslipPanel.tsx:** Full betting logic with Redux integration (modern)
- **Current Usage:** `layout.tsx` imports `BetslipPanel`, making it the primary component
- **Recommendation:** Determine if `Betslip.tsx` is still needed

---

#### 4. Orphaned Components (2 files)

These components exist but are not imported by any page or other component:

1. **FeaturedMatches.tsx**
   - Import issues: Yes (phantom package)
   - Status: Dead code or work-in-progress
   - Action: Integrate or remove

2. **SessionTimer.tsx**
   - Import issues: No
   - Status: Dead code or work-in-progress
   - Action: Integrate or remove

---

## What Passed (42/51 files)

### All Store Slices Properly Wired ✓
All 12 Redux slices are correctly registered in `store.ts`:
- authSlice, betSlice, sportSlice, marketSlice, fixtureSlice
- settingsSlice, navigationSlice, cashierSlice, siteSettingsSlice
- channelSubscriptionSlice, profileSlice, predictionSlice

### All Relative Imports Valid ✓
- No broken relative imports (./components, ../lib, ../hooks)
- All cross-file references resolve correctly

### WebSocket Modules Intact ✓
- channels-map.ts, handlers (bets/wallets), index.ts
- response-data-manager.ts, useWebSocket.ts, websocket-service.ts
- All internal references valid

### API Client Hub Complete ✓
- Central index.ts exports all specialized clients:
  - auth-client, betting-client, compliance-client
  - events-client, markets-client, user-client, wallet-client
- All exports match actual client files

---

## Remediation Priority

### Priority 1: Fix Phantom Imports (CRITICAL)
Must change 9 import statements:
```typescript
// OLD (broken)
import { ... } from '@phoenix-api/client';

// NEW (correct)
import { ... } from '@phoenix-ui/api-client';
```

### Priority 2: Add 'use client' Directives (HIGH)
Add to top of 2 hook files:
```typescript
'use client';
```

### Priority 3: Architectural Cleanup (MEDIUM)
- Choose which sidebar to keep (SportSidebar vs SportsSidebar)
- Choose which betslip to keep (Betslip vs BetslipPanel)
- Remove orphaned components or integrate them

---

## Statistics

| Category | Count |
|----------|-------|
| Total Files | 51 |
| Files OK | 42 (82.4%) |
| Files with Issues | 9 (17.6%) |
| Critical Issues | 9 (phantom packages) |
| High Severity | 2 (missing use client) |
| Medium Severity | 2 (duplicate components) |
| Low Severity | 2 (orphaned files) |

---

## File Manifest

### Legacy Components (19)
BetCard, BetHistoryList, BetLeg, Betslip, FeaturedMatches, FixtureList, IdleActivityMonitor, LeagueNav, LiveNow, LoginForm, MarketGroup, MarketRow, MatchHeader, MatchTimeline, OddsMovement, ProtectedRoute, QuickStake, SessionTimer, SportSidebar

### Pages (10)
auth/login, bets, live, match/[id], profile, responsible-gaming, sports, sports/[sport], sports/[sport]/[league], error

### API Routes (2)
api/auth/login, api/fixtures

### WebSocket (6)
channels-map, handlers/bets-handler, handlers/wallets-handler, index, response-data-manager, useWebSocket

### Store (7 slices)
auth, bet, channelSubscription, fixture, navigation, siteSettings, sport

### API Clients (5)
compliance, events, index, markets, user

### Hooks (2)
useApi, useLiveData

---

## Next Steps

1. **Immediate:** Fix all 9 phantom package imports
2. **Follow-up:** Add 'use client' directives to 2 hook files
3. **Testing:** Verify all imports compile and resolve correctly
4. **Cleanup:** Remove or consolidate duplicate components
5. **Review:** Determine fate of orphaned components


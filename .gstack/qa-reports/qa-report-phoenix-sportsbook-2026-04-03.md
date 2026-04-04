# Phoenix Sportsbook — Phase 3 QA Report

**Date:** 2026-04-03
**Scope:** Full source-code audit, 88 files, all phases (1–3)
**Mode:** Source-code static analysis (no browser — no dev server running)

---

## Health Score: 62/100

| Category       | Weight | Score | Notes                                     |
|----------------|--------|-------|-------------------------------------------|
| Console/Build  | 15%    | 40    | 25 files with phantom styled-components   |
| Imports        | 20%    | 35    | 22 files import non-existent @phoenix-api  |
| Functional     | 20%    | 85    | Core pages (home, cashier, legal) are solid|
| UX Wiring      | 15%    | 75    | Toast system created but unused; i18n partial |
| Architecture   | 10%    | 70    | 4 orphaned files, 2 duplicate component pairs |
| Content/i18n   | 10%    | 70    | 12 DE translation files missing           |
| Code Quality   | 10%    | 90    | Clean hook usage, proper SSR guards        |

---

## CRITICAL Issues (Will Crash Pages)

### ISSUE-001: 25 files import `styled-components` (not installed)
**Severity:** CRITICAL
**Impact:** Every page/component using styled-components will fail at import time. This affects 6 pages and 19 components.

**Affected pages (will crash on navigation):**
- `/bets` — bets/page.tsx
- `/auth/login` — auth/login/page.tsx
- `/match/[id]` — match/[id]/page.tsx
- `/sports` — sports/page.tsx
- `/sports/[sport]` — sports/[sport]/page.tsx
- `/sports/[sport]/[league]` — sports/[sport]/[league]/page.tsx
- `/live` — live/page.tsx
- `/profile` — profile/page.tsx

**Affected components (crash any page that imports them):**
LoginForm, LiveNow, LeagueNav, MatchTimeline, OddsMovement, SportSidebar, FeaturedMatches, UpcomingMatches, MarketRow, FixtureList, MarketGroup, BetCard, QuickStake, Betslip, MatchHeader, BetLeg, BetHistoryList

**Fix:** Each file needs a full rewrite replacing styled-components with inline styles (same pattern used for home page, cashier, legal pages).

### ISSUE-002: 22 files import `@phoenix-api/client` (wrong package name)
**Severity:** CRITICAL
**Impact:** Same files as above plus hooks/useApi.ts and hooks/useLiveData.ts. The correct package is `@phoenix-ui/api-client`.

**Fix:** Replace `@phoenix-api/client` with `@phoenix-ui/api-client` in all 22 files. Also verify the type imports (SportEventItem, MatchTrackerIncident, etc.) exist in @phoenix-ui/api-client.

### ISSUE-003: 3 files import `@phoenix-ui/design-system` (not available in App Router)
**Severity:** CRITICAL
**Impact:** auth/login/page.tsx, sports/[sport]/[league]/page.tsx, profile/page.tsx crash.

**Fix:** Replace design system components (Card, Badge, Button, Input, Tabs) with inline-styled equivalents.

---

## MEDIUM Issues

### ISSUE-004: Toast system created but never used
**Severity:** MEDIUM
**Impact:** ToastProvider is wired into layout.tsx, but `useToast()` is not imported by any component. The betslip, cashier, and auth flows all have success/error states that should use toasts instead of inline messages.

**Fix:** Import and use `useToast()` in BetslipPanel.tsx (bet placement success/error), cashier/page.tsx (deposit/withdrawal result), and AuthProvider.tsx (login/logout feedback).

### ISSUE-005: 12 German translation files missing
**Severity:** MEDIUM
**Impact:** When users switch to DE, these namespaces will silently fall back to EN keys (not translated text):
- cashier, responsible-gaming, self-exclude, session-timer, fixture
- api-errors, error-component, page-about, page-terms, page-privacy-policy, page-betting-rules

**Fix:** Create the 12 missing DE JSON files with German translations.

### ISSUE-006: 27 extra translation namespaces on disk but not in config
**Severity:** MEDIUM
**Impact:** Translation files like accept-terms, change-password, mfa, verify-email exist on disk but aren't listed in the NAMESPACES array in config.ts. They won't be preloaded.

**Fix:** Add all 27 namespaces to the NAMESPACES array in lib/i18n/config.ts, or they'll only load on-demand (which is actually fine with the fetch backend — this is a LOW priority).

### ISSUE-007: 2 missing `'use client'` directives
**Severity:** MEDIUM
**Impact:** hooks/useApi.ts and hooks/useLiveData.ts use React hooks without the App Router client directive. Will fail if imported by a server component.

**Fix:** Add `'use client';` as line 1 of both files.

---

## LOW Issues

### ISSUE-008: Duplicate component pairs
**Severity:** LOW
- `SportSidebar.tsx` (legacy, styled-components) vs `SportsSidebar.tsx` (modern, inline styles) — layout.tsx uses SportsSidebar, but sports/page.tsx still imports SportSidebar
- `Betslip.tsx` (legacy, styled-components) vs `BetslipPanel.tsx` (modern, inline styles) — layout.tsx uses BetslipPanel

**Fix:** Remove or mark legacy duplicates as deprecated. Update sports/page.tsx to use SportsSidebar.

### ISSUE-009: 4 orphaned files (not imported anywhere)
**Severity:** LOW
- components/FeaturedMatches.tsx
- components/OddsMovement.tsx
- components/SessionTimer.tsx
- components/UpcomingMatches.tsx

Plus 2 orphaned hooks: hooks/useApi.ts, hooks/useLiveData.ts

**Fix:** Either integrate into pages or remove.

### ISSUE-010: i18n localStorage access at module scope
**Severity:** LOW
**Impact:** In config.ts line 53, `localStorage.getItem('phoenix_language')` runs at module load. The `typeof window !== 'undefined'` guard is present, but this pattern can cause hydration mismatches in Next.js.

**Fix:** Move language detection into the I18nProvider effect or accept the minor hydration risk (current guard is sufficient for most cases).

---

## Verified Clean (No Issues)

These subsystems passed all checks:

- **Provider chain** (layout.tsx): StoreProvider → QueryProvider → I18nProvider → AuthProvider → ToastProvider → BetslipProvider — properly balanced
- **Redux store**: All 12 slices wired (auth, bets, sports, markets, fixtures, settings, navigation, cashier, siteSettings, channelSubscriptions, profile, prediction)
- **API clients**: All 9 client modules (client, auth, betting, compliance, events, markets, user, wallet, index) clean
- **WebSocket**: All 7 modules (service, channels-map, 4 handlers, useWebSocket) clean
- **Active pages** (home, cashier, about, terms, privacy, betting-rules): All transpile cleanly, no phantom imports
- **Odds utility**: formatOdds, decimalToAmerican, decimalToFractional all properly exported
- **React Query**: Provider + hooks properly wired
- **EN translations**: All 32 namespace files present

---

## Summary

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 3     | Unfixed — legacy pages need full rewrites |
| MEDIUM   | 4     | Unfixed — toast/i18n gaps |
| LOW      | 3     | Unfixed — cleanup tasks |

**Bottom line:** The core app (home page, cashier, legal pages, betslip, header, sidebar) is solid. All Phase 1–3 work is correctly wired. The remaining issues are **all in legacy pages** that weren't part of any phase — they're original codebase files that still use styled-components and the wrong package names. These pages (/live, /match, /sports, /bets, /profile, /auth/login) will crash if navigated to.

**Recommendation:** Phase 4 should prioritize rewriting the 8 legacy pages to eliminate styled-components and fix phantom imports, starting with the most-linked pages: /auth/login, /bets, /live, /profile.

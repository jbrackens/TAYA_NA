# MS-005 Frontend Sports Route Composition Progress

Date: 2026-03-06  
Scope: Phase 9 multi-sport expansion item 5 (native sportsbook route migration to `/sports/[sportKey]/[leagueKey]/match/[eventKey]` without regressing existing esports UX).

## Delivered

1. Added shared sports routing helpers in sportsbook app-core:
   - route-mode detection (`isSportsRoutePath`)
   - alias/query resolution (`resolveSportRouteKey`, `resolveLeagueRouteKey`, `resolveEventRouteKey`)
   - path builders for sport, league, and match routes.
2. Replaced `/sports/*` redirect stubs with native page wrappers that render existing sportsbook surfaces directly:
   - sport index
   - league index
   - match detail
   - match market detail.
3. Updated esports list page composition to accept both legacy and native route query shapes:
   - resolves `sportKey`/`leagueKey` from native route params.
   - keeps legacy query compatibility (`gameFilter`, `competitionId`).
4. Updated fixture detail composition to consume native route params:
   - resolves event identity from `eventKey` fallback.
   - uses resolved keys for fetch/websocket/canonical URL behavior.
5. Updated fixture list navigation to generate native `/sports/.../match/...` links when route mode is native while preserving legacy links elsewhere.
6. Updated sidebar menu sport/league links and route awareness for native `/sports` routing.
7. Updated primary sportsbook entrypoints to default to `/sports/esports`:
   - menu defaults, home, landing header CTA, auth redirects, profile self-exclude return path.
8. Cleared remaining compile blocker by wiring `gameFilter` as a compatibility fallback in fixture list sport resolution.

## Files Changed

1. `phoenix-frontend-brand-viegg/packages/app-core/lib/sports-routing.ts`
2. `phoenix-frontend-brand-viegg/packages/app-core/lib/__tests__/sports-routing.test.ts`
3. `phoenix-frontend-brand-viegg/packages/app/pages/sports/[sportKey]/index.tsx`
4. `phoenix-frontend-brand-viegg/packages/app/pages/sports/[sportKey]/[leagueKey]/index.tsx`
5. `phoenix-frontend-brand-viegg/packages/app/pages/sports/[sportKey]/[leagueKey]/match/[eventKey].tsx`
6. `phoenix-frontend-brand-viegg/packages/app/pages/sports/[sportKey]/[leagueKey]/match/[eventKey]/markets/[marketKey].tsx`
7. `phoenix-frontend-brand-viegg/packages/app-core/components/pages/esports-bets/index.tsx`
8. `phoenix-frontend-brand-viegg/packages/app-core/components/pages/fixture/index.tsx`
9. `phoenix-frontend-brand-viegg/packages/app-core/components/layout/fixture-list/index.tsx`
10. `phoenix-frontend-brand-viegg/packages/app-core/components/layout/sidebar/SidebarMenu/index.tsx`
11. `phoenix-frontend-brand-viegg/packages/app-core/providers/menu/defaults.ts`
12. `phoenix-frontend-brand-viegg/packages/app-core/components/pages/home/index.tsx`
13. `phoenix-frontend-brand-viegg/packages/app-core/components/pages/landing-page/index.tsx`
14. `phoenix-frontend-brand-viegg/packages/app-core/components/landing-page-components/LandingHeader/index.tsx`
15. `phoenix-frontend-brand-viegg/packages/app-core/components/auth/auth-wrapper/index.tsx`
16. `phoenix-frontend-brand-viegg/packages/app-core/components/auth/change-password/index.tsx`
17. `phoenix-frontend-brand-viegg/packages/app-core/components/auth/forgot-reset-password/modal/index.tsx`
18. `phoenix-frontend-brand-viegg/packages/app-core/components/profile/self-exclude/index.tsx`

## Validation

1. Sports routing helper tests:

```bash
source ~/.nvm/nvm.sh && nvm use 20
cd phoenix-frontend-brand-viegg/packages/app-core
npx jest lib/__tests__/sports-routing.test.ts --runInBand
```

Result: pass (1 suite, 4 tests).

2. Sportsbook app TypeScript compile sanity:

```bash
source ~/.nvm/nvm.sh && nvm use 20
cd phoenix-frontend-brand-viegg/packages/app
npx tsc --noEmit --pretty false
```

Result: pass.

## Notes

1. This slice migrates route composition and navigation behavior only; it does not yet switch sportsbook data retrieval over to the new canonical gateway `/api/v1/sports/*` endpoints.
2. Next multi-sport frontend slice should focus on native sport/league catalog rendering and MLB pilot UX enablement using canonical sport APIs.

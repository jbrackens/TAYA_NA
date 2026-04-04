# SB-008/SB-306 Esports Module Composition Progress

Date: 2026-03-04  
Backlog reference: immediate queue item 28 in `revival/42_BACKLOG_EXECUTION_PHASES.md`

## Delivered

1. Extended mode/widget preset system from landing to sportsbook route composition:
   - introduced dedicated esports-home module registry and parser
   - mode defaults now map to sportsbook home module visibility.
2. Added brand-configurable module override contract for `/esports-bets`:
   - `SPORTSBOOK_ESPORTS_HOME_MODULES` runtime override string
   - validates and deduplicates module IDs.
3. Wired `/esports-bets` page composition to resolved module config:
   - toggles promo carousel visibility
   - toggles tabs/results-tab visibility
   - toggles fixtures section visibility
   - toggles odds-format select visibility.
4. Added regression tests for esports module defaults + override behavior.
5. Added operator-facing preset/config guide with concrete examples and valid module IDs.

## Key Files

1. Esports module registry + tests:
   - `phoenix-frontend-brand-viegg/packages/app-core/components/pages/esports-bets/module-registry.ts`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/pages/esports-bets/__tests__/module-registry.test.ts`
2. Sportsbook route wiring:
   - `phoenix-frontend-brand-viegg/packages/app-core/components/pages/esports-bets/index.tsx`
3. Runtime config exposure:
   - `phoenix-frontend-brand-viegg/packages/app-core/next.config.js`
   - `phoenix-frontend-brand-viegg/packages/app/next.config.js`
4. Operator docs:
   - `revival/94_SB008_SB306_OPERATOR_PRESET_GUIDE.md`

## Validation

1. `cd phoenix-frontend-brand-viegg && yarn workspace @phoenix-ui/app test --runTestsByPath lib/__tests__/integration-mode.test.ts components/pages/landing-page/__tests__/widget-registry.test.ts components/pages/esports-bets/__tests__/module-registry.test.ts services/api/__tests__/freebets-service.test.ts services/api/__tests__/odds-boost-service.test.ts services/api/__tests__/response-shapes.test.ts --passWithNoTests`
   - pass

## Remaining

1. Module-composition presets are now landing + esports-home scoped; other sportsbook surfaces still use static composition.
2. Continue with queue item 29:
   - expand the same pattern to promotions/account/fixture overlays and consolidate parser/preset docs.

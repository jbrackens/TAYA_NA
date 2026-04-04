# SB-008/SB-306 Integration Mode + Widget Foundation Progress

Date: 2026-03-04  
Backlog reference: immediate queue item 27 in `revival/42_BACKLOG_EXECUTION_PHASES.md`

## Delivered

1. Added runtime integration-mode foundation:
   - canonical frontend integration mode enum (`full`, `module`, `odds_feed`)
   - parser with safe default fallback behavior
   - explicit landing-experience gate helper by mode.
2. Added landing-page widget registry foundation:
   - widget IDs and reusable section definitions
   - mode-specific default widget presets
   - optional runtime override list parser (`SPORTSBOOK_LANDING_WIDGETS`) with validation + dedupe
   - final ordered widget resolver.
3. Wired home route behavior to integration mode:
   - landing experience is now mode-aware (`full` only)
   - `module` and `odds_feed` modes bypass landing and redirect to sportsbook route.
4. Wired landing page composition to widget registry:
   - removed hard-coded section array from page component
   - sections are resolved from mode preset + optional runtime override.
5. Exposed new runtime config keys in Next config:
   - `SPORTSBOOK_INTEGRATION_MODE`
   - `SPORTSBOOK_LANDING_WIDGETS`
6. Added tests for mode parsing and widget resolution behavior.

## Key Files

1. Integration mode helper:
   - `phoenix-frontend-brand-viegg/packages/app-core/lib/integration-mode.ts`
   - `phoenix-frontend-brand-viegg/packages/app-core/lib/__tests__/integration-mode.test.ts`
2. Landing widget registry:
   - `phoenix-frontend-brand-viegg/packages/app-core/components/pages/landing-page/widget-registry.ts`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/pages/landing-page/__tests__/widget-registry.test.ts`
3. Mode-aware page wiring:
   - `phoenix-frontend-brand-viegg/packages/app-core/components/pages/home/index.tsx`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/pages/landing-page/index.tsx`
4. Runtime config exposure:
   - `phoenix-frontend-brand-viegg/packages/app-core/next.config.js`
   - `phoenix-frontend-brand-viegg/packages/app/next.config.js`

## Validation

1. `cd phoenix-frontend-brand-viegg && yarn workspace @phoenix-ui/app test --runTestsByPath lib/__tests__/integration-mode.test.ts components/pages/landing-page/__tests__/widget-registry.test.ts services/api/__tests__/freebets-service.test.ts services/api/__tests__/odds-boost-service.test.ts services/api/__tests__/response-shapes.test.ts --passWithNoTests`
   - pass

## Remaining

1. Current widgetized mode support is landing-page scoped:
   - sportsbook in-product pages (e.g., esports-bets surface composition) still use static layout flow.
2. Continue with queue item 28:
   - extend mode/widget presets to sportsbook route-level module composition and add operator-facing preset documentation.

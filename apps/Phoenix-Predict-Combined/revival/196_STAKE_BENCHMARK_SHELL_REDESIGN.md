# Stake Benchmark Shell Redesign

Date: 2026-03-06

## Objective

Reorient the sportsbook frontend shell around Stake sportsbook UX conventions instead of continuing incremental cosmetic tweaks on the legacy VIE layout.

Benchmark principles used in this pass:

1. Compact header, dense sportsbook-first navigation, and less marketing chrome.
2. Flat, darker panels with tighter spacing and clearer odds hierarchy.
3. Sidebar, market list, and betslip treated as a single sportsbook workspace.

## Delivered

1. Tightened the desktop shell geometry:
   - sidebar widened slightly to read as a sportsbook navigation rail
   - global content top offset reduced to a denser fixed-header layout
   - heavy shell gradients removed in favor of flatter dark surfaces.
2. Refactored the desktop header toward sportsbook navigation:
   - reduced header height
   - compacted login/balance/user controls
   - added a sportsbook quick-nav strip for `Sportsbook`, `Live`, `Promotions`, and `My Bets`.
3. Reworked the left navigation to feel closer to Stake:
   - flatter brand treatment
   - tighter search control
   - denser list rows
   - reduced decorative panel styling and oversized rounding.
4. Reworked the central sportsbook canvas:
   - page title/filter bar flattened into a lighter-weight sportsbook header row
   - fixture container converted from oversized card treatment to a cleaner sportsbook board.
5. Reworked fixture rows around sportsbook conversion surfaces:
   - competition headers now render with original-case text and sportsbook-style density
   - row hover/state styling flattened
   - odds area spacing tightened
   - markets count pill simplified.
6. Reworked the betslip shell:
   - flattened tab strip and panel treatment
   - reduced card rounding
   - aligned the betslip closer to a checkout/workspace feel.
7. Fixed event-row regressions introduced during redesign:
   - tournament title no longer uppercases in DOM
   - live-score rendering now supports both canonical `IN_PLAY` and legacy `LIVE` fixture status values.
8. Added a second structural pass after live screenshot review:
   - removed sportsbook-route header chrome that was diluting the Stake-style benchmark
   - hid sportsbook-route responsible gaming and prediction toggle elements from the main header
   - removed the single-tab bar that was rendering as a meaningless `Bets` strip
   - reduced sidebar width and branding weight
   - removed the visible sidebar search control
   - tightened row, odds-button, and competition-header density.

## Key Files

1. Shell layout:
   - `phoenix-frontend-brand-viegg/packages/app-core/components/layout/index.tsx`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/layout/index.styled.ts`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/layout/sidebar/index.tsx`
2. Header:
   - `phoenix-frontend-brand-viegg/packages/app-core/components/layout/header/index.tsx`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/layout/header/index.styles.ts`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/layout/header/buttons/index.styles.ts`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/layout/header/mode-toggle/ModeToggle.tsx`
3. Sidebar:
   - `phoenix-frontend-brand-viegg/packages/app-core/components/layout/sidebar/SidebarMenu/index.tsx`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/layout/sidebar/SidebarMenu/index.styled.ts`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/layout/sidebar/SidebarMenu/CustomMenuItem/index.tsx`
4. Sportsbook page shell:
   - `phoenix-frontend-brand-viegg/packages/app-core/components/pages/esports-bets/index.styled.ts`
5. Fixture list:
   - `phoenix-frontend-brand-viegg/packages/app-core/components/layout/fixture-list/index.tsx`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/layout/fixture-list/index.styled.ts`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/bet-button/index.styled.ts`
6. Betslip:
   - `phoenix-frontend-brand-viegg/packages/app-core/components/layout/betslip/index.styled.ts`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/layout/betslip/tabs/index.styled.ts`

## Validation

1. Targeted component tests:
   - `cd phoenix-frontend-brand-viegg/packages/app-core && yarn test --runTestsByPath components/bet-button/__tests__/bet-button.test.tsx components/layout/fixture-list/__tests__/fixture-list.test.tsx --coverage=false`
   - result: pass
2. Runtime route compilation:
   - `curl -L -I http://127.0.0.1:3002/sports/esports`
   - `curl -L -I http://127.0.0.1:3002/esports-bets`
   - result: both routes returned `200 OK` after redirect, confirming the touched sportsbook shell compiled in the running Next app.
3. Live visual regression check:
   - captured desktop screenshots of `http://127.0.0.1:3002/sports/esports/` before and after the second structural pass
   - used the running app render to correct layout density and remove non-sportsbook chrome.

## Remaining

1. This pass corrects shell direction, density, and hierarchy; it is not yet a full pixel-parity clone of Stake.
2. The next worthwhile UI pass is detail-level polish:
   - secondary market disclosure
   - richer sport/league quick switching
   - tighter mobile sportsbook navigation and drawer behavior
   - visual cleanup of account-era legacy components that still leak into sportsbook routes.

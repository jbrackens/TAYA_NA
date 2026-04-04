# Frontend Redesign Foundation

Date: 2026-03-06

## Scope

Phase 1 and Phase 2 work for the sportsbook redesign benchmarked against Stake sportsbook UX principles.

Phase 1 established the token system and shell foundation in isolation.
Phase 2 switched the live sportsbook routes onto the new shell and replaced the most visible legacy sportsbook surfaces in the center column and right rail while preserving existing backend, auth, betslip, and websocket flows.

## Delivered

1. Added a dedicated redesign token file:
   - `phoenix-frontend-brand-viegg/packages/app-core/styles/tokens.css`
2. Wired the token file into the global theme import chain:
   - `phoenix-frontend-brand-viegg/packages/app-core/pxp-theme/theme.css`
3. Built a new sportsbook-specific app shell foundation with responsive three-column behavior:
   - desktop: left rail / center content / sticky right rail
   - tablet: left rail / center content + bottom action bar
   - mobile: single column + floating action bar + bottom navigation
4. Built a static shell preview with placeholder content in each column to validate structure before replacing live sportsbook modules.
5. Added a safe preview route so the new shell can be reviewed without disrupting live sportsbook route behavior:
   - `http://localhost:3002/custom/`
6. Added a sportsbook-specific route layout that reuses the existing runtime overlays and account flows while replacing the legacy global sportsbook shell:
   - `phoenix-frontend-brand-viegg/packages/app-core/components/redesign/sportsbook-layout/index.tsx`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/redesign/sportsbook-layout/top-bar.tsx`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/redesign/sportsbook-layout/left-nav.tsx`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/redesign/sportsbook-layout/index.styled.ts`
7. Wired sportsbook routes to opt into the redesign shell through `pageProps.layoutVariant` instead of the legacy `Layout` wrapper:
   - `phoenix-frontend-brand-viegg/packages/app-core/components/app/index.tsx`
   - `phoenix-frontend-brand-viegg/packages/app/pages/sports/[sportKey]/index.tsx`
   - `phoenix-frontend-brand-viegg/packages/app/pages/sports/[sportKey]/[leagueKey]/index.tsx`
   - `phoenix-frontend-brand-viegg/packages/app/pages/sports/[sportKey]/[leagueKey]/match/[eventKey].tsx`
   - `phoenix-frontend-brand-viegg/packages/app/pages/sports/[sportKey]/[leagueKey]/match/[eventKey]/markets/[marketKey].tsx`
8. Rebuilt the sportsbook content engine for the main sportsbook board:
   - new summary/hero surface for the sport page
   - filter pills and board toggles
   - rebuilt event rows with denser sportsbook hierarchy
   - redesigned odds buttons with token-based live flash states
9. Tightened the visible betslip primitives so the right rail no longer reads as a legacy admin panel:
   - tab strip refresh
   - panel surface alignment with the new shell
   - empty state cleanup
10. Reworked active betslip interaction surfaces:
   - selection cards now render with dedicated headers, odds pills, fixture metadata, and token-based status/error treatment
   - single-bet stake entry now includes quick chips and clearer potential-return presentation
   - multi-bet stake entry now uses the same stake-control model
   - summary footer was regrouped into totals, promo state, odds-acceptance, and action sections

## Key Files

1. Tokens:
   - `phoenix-frontend-brand-viegg/packages/app-core/styles/tokens.css`
   - `phoenix-frontend-brand-viegg/packages/app-core/pxp-theme/theme.css`
2. New shell:
   - `phoenix-frontend-brand-viegg/packages/app-core/components/redesign/app-shell/index.tsx`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/redesign/app-shell/index.styled.ts`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/redesign/app-shell/preview.tsx`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/redesign/sportsbook-layout/index.tsx`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/redesign/sportsbook-layout/top-bar.tsx`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/redesign/sportsbook-layout/left-nav.tsx`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/redesign/sportsbook-layout/index.styled.ts`
3. Export wiring:
   - `phoenix-frontend-brand-viegg/packages/app-core/components/index.ts`
4. Preview route:
   - `phoenix-frontend-brand-viegg/packages/app/pages/custom/index.tsx`
5. Live sportsbook route wiring:
   - `phoenix-frontend-brand-viegg/packages/app-core/components/app/index.tsx`
   - `phoenix-frontend-brand-viegg/packages/app/pages/sports/[sportKey]/index.tsx`
   - `phoenix-frontend-brand-viegg/packages/app/pages/sports/[sportKey]/[leagueKey]/index.tsx`
   - `phoenix-frontend-brand-viegg/packages/app/pages/sports/[sportKey]/[leagueKey]/match/[eventKey].tsx`
   - `phoenix-frontend-brand-viegg/packages/app/pages/sports/[sportKey]/[leagueKey]/match/[eventKey]/markets/[marketKey].tsx`
6. Rebuilt sportsbook content surfaces:
   - `phoenix-frontend-brand-viegg/packages/app-core/components/pages/esports-bets/index.tsx`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/pages/esports-bets/index.styled.ts`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/layout/fixture-list/index.tsx`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/layout/fixture-list/index.styled.ts`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/bet-button/index.tsx`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/bet-button/index.styled.ts`
7. Reworked visible betslip primitives:
   - `phoenix-frontend-brand-viegg/packages/app-core/components/layout/betslip/index.styled.ts`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/layout/betslip/list/index.tsx`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/layout/betslip/list/list-element/index.tsx`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/layout/betslip/list/list-element/index.styled.ts`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/layout/betslip/list/list-wrapper/index.tsx`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/layout/betslip/summary/index.tsx`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/layout/betslip/tabs/index.tsx`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/layout/betslip/tabs/index.styled.ts`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/linkWrapper/index.styled.ts`

## Validation

1. Route compilation:
   - `curl -L -I http://127.0.0.1:3002/custom`
   - result: `200 OK`
2. Desktop shell screenshot validated at `1280x720`
3. Tablet shell screenshot validated at `1024x768`
4. Mobile shell screenshot validated at `390x844`
5. Live sportsbook route compilation:
   - `curl -L -I http://127.0.0.1:3002/sports/esports/`
   - result: `200 OK`
6. Targeted sportsbook component validation:
   - `cd phoenix-frontend-brand-viegg/packages/app-core && yarn test --runTestsByPath components/bet-button/__tests__/bet-button.test.tsx components/layout/fixture-list/__tests__/fixture-list.test.tsx --coverage=false`
   - result: pass
7. Live sportsbook screenshot validation after waiting for the first tournament row:
   - `npx playwright screenshot --device='Desktop Chrome' --wait-for-selector='[role="tournamentName"]' --timeout=30000 http://127.0.0.1:3002/sports/esports/ /tmp/phoenix-sportsbook-redesign-route-v5.png`
   - result: redesign shell, rebuilt center board, and updated right rail rendered successfully
8. Post-action-panel route validation:
   - `curl -L -I http://127.0.0.1:3002/sports/esports/`
   - result: `200 OK`
9. Targeted regression validation after action-panel refactor:
   - `cd phoenix-frontend-brand-viegg/packages/app-core && yarn test --runTestsByPath components/bet-button/__tests__/bet-button.test.tsx components/layout/fixture-list/__tests__/fixture-list.test.tsx --coverage=false`
   - result: pass

## Remaining Conflicts

1. Legacy global layout coupling
   - Resolved for sportsbook routes only.
   - Non-sportsbook routes still use the legacy global layout and theme assumptions.

2. Theme-object vs token-system split
   - The repo still relies heavily on a large theme object in `packages/app/pages/_app.js` plus styled-components theme usage.
   - The redesign foundation now uses CSS tokens directly.
   - Current approach: sportsbook redesign components use tokens first and only bridge into the legacy theme where unavoidable.
   - Remaining work: continue migrating touched sportsbook components off theme-object color dependencies, especially betslip form controls and switches.

3. Ant Design global overrides
   - `components/app/index.styled.ts` applies broad global Ant Design overrides.
   - These are likely to leak legacy spacing and visual behavior into new sportsbook components.
   - Current approach: new sportsbook shells avoid raw Antd where practical, but some legacy forms, inputs, and list primitives remain.

4. No Storybook / isolated component workbench
   - The repo does not have Storybook or an equivalent preview system installed.
   - Resolution: continue using preview routes temporarily, or add Storybook in a dedicated tooling task before Phase 3.

5. Legacy route/component naming
   - Core sportsbook pages still route through `ESportsBets` naming and legacy page modules.
   - Current approach: the sportsbook route is now rendered inside the redesign shell, but content modules still carry legacy naming.

## Recommended Next Step

Phase 3 should continue on the active sportsbook route in this order:
1. Match detail route redesign inside the new sportsbook shell
2. Market-detail route redesign inside the new sportsbook shell
3. Sport and league quick-switch treatment in the top of the center column
4. Mobile sportsbook route behavior:
   - bottom nav refinement
   - floating action bar
   - betslip drawer behavior
5. Remove or replace remaining Antd-era layout assumptions inside sportsbook-only components

## Match Detail Redesign Update

Date: 2026-03-06

### Delivered

11. Rebuilt the live match-detail route inside the sportsbook redesign shell instead of the legacy Ant Design card stack.
12. Replaced the old fixture banner with a sportsbook detail hero:
   - back-to-board action
   - tournament label
   - primary matchup title
   - scheduled/live status pill
   - total market count
   - compact scoreboard and kickoff cards
13. Replaced legacy tab panes with token-based market view pills for `All`, `Match`, and per-map groupings.
14. Rebuilt the fixture market renderer into sportsbook section cards and market-entry cards while preserving existing `BetButtonComponent` betslip wiring.
15. Restyled match-tracker and stats-centre overlays into sportsbook panels instead of generic Ant cards.
16. Replaced the route spinner-first loading state with skeleton surfaces that preserve layout while fixture data loads.

### Key Files

8. Match-detail route redesign:
   - `phoenix-frontend-brand-viegg/packages/app-core/components/pages/fixture/index.tsx`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/pages/fixture/index.styled.ts`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/fixture/index.tsx`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/fixture/index.styled.ts`

### Validation

10. Match-detail route compilation:
   - `curl -L -I http://127.0.0.1:3002/sports/esports/all/match/68263784/`
   - result: `200 OK`
11. Live fixture detail route compilation with current-feed markets:
   - `curl -L -I http://127.0.0.1:3002/sports/esports/all/match/69610250/`
   - result: `200 OK`
12. Match-detail screenshot validation against a live fixture with markets:
   - `npx playwright screenshot --device='Desktop Chrome' --wait-for-timeout=3500 http://127.0.0.1:3002/sports/esports/all/match/69610250/ /tmp/phoenix-fixture-route-redesign-live.png`
   - result: redesigned hero, market tabs, and market surface rendered successfully
13. Targeted regression validation after match-detail refactor:
   - `cd phoenix-frontend-brand-viegg/packages/app-core && yarn test --runTestsByPath components/bet-button/__tests__/bet-button.test.tsx components/layout/fixture-list/__tests__/fixture-list.test.tsx --coverage=false`
   - result: pass

### Updated Next Step

Phase 3 should continue from the redesigned sport board and match-detail routes in this order:
1. Market-detail route redesign inside the new sportsbook shell
2. Mobile sportsbook route behavior:
   - bottom nav refinement
   - floating action bar
   - betslip drawer behavior
3. Sport and league quick-switch treatment in the top of the center column
4. Replace remaining sportsbook-only legacy Ant surfaces that still sit behind account and auxiliary routes

## Mobile Shell And Quick-Switch Update

Date: 2026-03-07

### Delivered

17. Replaced sportsbook-route reliance on the legacy mobile footer with shell-native responsive navigation.
18. Added sportsbook mobile bottom navigation for core destinations:
   - Home
   - Live
   - Promotions
   - Betslip
   - Account
19. Added sportsbook mobile action bar wiring for the betslip so tablet/mobile users have a direct path into the drawer from the new shell.
20. Refactored the fullscreen mobile betslip wrapper to support controlled open/close state from the sportsbook shell instead of only using its internal floating trigger.
21. Added sport and league quick-switch rails to the center column so users can move between sportsbook verticals and league scopes without relying only on the left rail.
22. Fixed shell breakpoint behavior so mobile top-bar rendering no longer stacks desktop sections incorrectly.

### Key Files

9. Mobile shell and quick-switch pass:
   - `phoenix-frontend-brand-viegg/packages/app-core/components/redesign/app-shell/index.styled.ts`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/redesign/sportsbook-layout/index.tsx`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/redesign/sportsbook-layout/index.styled.ts`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/redesign/sportsbook-layout/mobile-chrome.tsx`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/layout/sidebar/full-screen-wrapper/index.tsx`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/pages/esports-bets/index.tsx`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/pages/esports-bets/index.styled.ts`

### Validation

14. Main sportsbook route compilation after shell-mobile refactor:
   - `curl -L -I http://127.0.0.1:3002/sports/esports/`
   - result: `200 OK`
15. Match-detail route compilation after shell-mobile refactor:
   - `curl -L -I http://127.0.0.1:3002/sports/esports/all/match/69610250/`
   - result: `200 OK`
16. Targeted regression validation after mobile-shell changes:
   - `cd phoenix-frontend-brand-viegg/packages/app-core && yarn test --runTestsByPath components/bet-button/__tests__/bet-button.test.tsx components/layout/fixture-list/__tests__/fixture-list.test.tsx --coverage=false`
   - result: pass
17. Mobile sportsbook screenshot validation:
   - `npx playwright screenshot --viewport-size=390,844 --wait-for-timeout=3500 http://127.0.0.1:3002/sports/esports/ /tmp/phoenix-sportsbook-mobile-redesign.png`
   - result: mobile top bar, bottom navigation, and center-column quick-switch rails rendered successfully

### Updated Next Step

Phase 3 should continue in this order:
1. Replace remaining sportsbook-only legacy Ant surfaces inside account-adjacent sportsbook flows and auxiliary overlays
2. Tighten visual density and spacing on the mobile center column so the page reads closer to a production sportsbook board at 390px width
3. Add stronger sportsbook-first surfacing for featured leagues, live rails, and promos in the redesigned center column

## Sportsbook Home Routing Update

Date: 2026-03-07

### Delivered

23. Split sportsbook home from the esports vertical so `Home` and `Sports` no longer route into `/sports/esports`.
24. Added a true sportsbook overview entry route at `/sports/home` and updated sportsbook entry links and redirects to target it.
25. Updated the odds-feed fixtures API so `home`, `in-play`, and `upcoming` can aggregate enabled sports instead of falling back to esports only.
26. Changed the aggregate home-board merge strategy to interleave sport buckets so the first page surfaces multiple sports instead of a purely chronological esports-heavy list.

### Key Files

10. Sportsbook home routing and aggregate feed:
   - `phoenix-frontend-brand-viegg/packages/app/pages/sports/index.tsx`
   - `phoenix-frontend-brand-viegg/packages/app/pages/api/odds-feed/fixtures/index.ts`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/layout/fixture-list/index.tsx`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/redesign/sportsbook-layout/top-bar.tsx`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/redesign/sportsbook-layout/left-nav.tsx`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/redesign/sportsbook-layout/mobile-chrome.tsx`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/layout/header/index.tsx`
   - `phoenix-frontend-brand-viegg/packages/app-core/components/pages/home/index.tsx`

### Validation

18. Sportsbook overview route compilation:
   - `curl -L -I http://127.0.0.1:3002/sports/home/`
   - result: `200 OK`
19. Aggregate home feed validation:
   - `http://127.0.0.1:3002/api/odds-feed/fixtures/?gameFilter=home`
   - result: mixed sports returned (`esports`, `mlb`, `nba`, `nfl`, `ufc`, `ncaa_baseball`)
20. Desktop sportsbook-home screenshot validation:
   - `npx playwright screenshot --device='Desktop Chrome' --wait-for-timeout=3500 http://127.0.0.1:3002/sports/home/ /tmp/phoenix-sportsbook-home-overview.png`
   - result: home board renders as sportsbook overview instead of defaulting to esports
21. Targeted regression validation after route/feed updates:
   - `cd phoenix-frontend-brand-viegg/packages/app-core && yarn test --runTestsByPath components/bet-button/__tests__/bet-button.test.tsx components/layout/fixture-list/__tests__/fixture-list.test.tsx --coverage=false`
   - result: pass

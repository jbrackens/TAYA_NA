# VIE Sportsbook Frontend Redesign (Current Pass)

## Scope
- Frontend-only visual and UX refactor of sportsbook shell surfaces.
- No backend/API/routing/auth/data model changes introduced.

## Stack Reality
- Repository uses Next.js 11 + styled-components + Ant Design.
- Requested Tailwind/shadcn/Vite spec was mapped to this stack via:
  - CSS variable tokens in `pxp-theme/theme.css`
  - Styled-component overrides in sportsbook layout components
  - Motion animations using `framer-motion`

## Implemented in this pass
1. Global token layer and typography
- Added VIE sportsbook token set, body defaults, scrollbar, and focus-visible style.
- Added DM Sans import and global font application.

2. Sidebar redesign
- Icon-forward navigation rows with active cyan border state.
- Search toggle/input added to sidebar top.
- Hover/favorite affordance updated (gold favorite star).
- Replaced sidebar loading spinner with shimmer skeleton rows.

3. Competition and fixture list surfaces
- Sticky competition header with monochrome icon + "More" affordance.
- Match row spacing, typography, and odds area restyled to navy/cyan system.
- Fixture loading spinner replaced with motion skeleton rows.

4. Odds buttons
- Re-enabled click wiring to add/remove selections in betslip.
- Added selected/hover/suspended visual states.
- Added compact odds label/value typography and selection pulse animation.
- Suspended values now render as `—` (no raw feed artifacts).

5. Betslip redesign
- Tabs and list cards updated to elevated surface styling.
- Empty betslip state now uses icon + actionable guidance copy.
- Potential return styling shifted to gold.
- Place Bet CTA constrained to green-only confirm action style.
- Added card entry motion animation.
- Infinite-loading spinner replaced with skeleton placeholder.

6. Header and mobile
- Header restyled to fintech-style surface with updated balance/deposit affordance.
- Responsible gaming moved to left-side desktop utility area.
- Mobile bottom navigation redesigned for sportsbook routes.
- Mobile betslip reworked into trigger + slide-up drawer interaction.

## Validation
- `yarn next build` completed successfully after strict TS fixes.
- Remaining build output includes existing non-blocking webpack warnings from pre-existing translation bundle behavior.

## Remaining polish candidates
- Route-aware Today/Tomorrow filters currently visual-only.
- Additional pass to remove legacy theme-object color debt outside sportsbook shell.
- Motion polish/spacing audit for tablet breakpoints and account sub-pages.

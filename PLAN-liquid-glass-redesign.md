# Plan — Liquid Glass redesign of the Predict player app

**Scope:** Convert the Predict player app at `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/` from the current dark-broadcast (phoenix lime) aesthetic to Liquid Glass (mint emerald) per the updated `DESIGN.md` (2026-04-24 revision). Backoffice stays on the sportsbook system and is explicitly out of scope.

**Source artifacts:**
- Design spec: [`DESIGN.md`](./DESIGN.md) — revised 2026-04-24.
- Desktop mockup: `~/.gstack/projects/jbrackens-TAYA_NA/designs/liquid-glass-desktop-mint-20260424-200756/market-detail-mockup.html`.
- Mobile mockup: `~/.gstack/projects/jbrackens-TAYA_NA/designs/liquid-glass-20260424-195105/trade-ticket-mockup.html`.
- Palette reference: Thndr casino theme (https://www.thndr.io/games → Casino tab).
- Prior design ref: skeuomorphism mockup at `~/.gstack/projects/jbrackens-TAYA_NA/designs/skeuomorphism-20260424-193928/trade-ticket-mockup.html` (rejected direction, kept for contrast).

**Status:** APPROVED in principle by the product owner. Ready to execute.

---

## Phases

Each phase is one PR. Each is independently mergeable and revertable. Estimated CC times are best-case (single engineer, no surprises, no review cycles).

### Phase 0 — DESIGN.md update (DONE)

**Status:** DONE as of this commit.

DESIGN.md revised to describe the new Liquid Glass system + Thndr mint palette + cool backdrop + spring physics + accessibility + performance budget. Decisions Log updated with the 2026-04-24 pivot entries (keeping the prior decisions in context, not erasing them).

No code changes in this phase. Everything downstream reads from `DESIGN.md`.

**Deliverable:** `DESIGN.md` revised.
**Effort:** ~45 min CC (already spent).
**Risk:** None — doc only.

---

### Phase 1 — Token + material layer

**Goal:** Update `app/globals.css` with the new color tokens, glass utility classes, new radii scale. Ship the foundation without touching components. After this phase, existing pages still render and function, but with mint in place of phoenix lime wherever `var(--accent)` is referenced.

**Files touched:**
- `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/globals.css`
- `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/layout.tsx` (add `prefers-reduced-transparency` + `prefers-reduced-motion` inline, if not already present).

**Concrete changes to `globals.css`:**

1. **Replace the surface palette** (`--s0..--s3`) with the backdrop tokens (`--bg-deep`, `--bg-navy`, `--bg-teal`, `--bg-mint`, `--bg-azure`). Keep the old names as deprecation aliases pointing at the new values for one phase, so nothing instantly breaks:
   ```css
   --s0: var(--bg-deep);   /* deprecated — use --bg-deep */
   --s1: var(--bg-teal);   /* deprecated */
   /* etc. */
   ```
2. **Replace the accent tokens** (`--accent`, `--accent-hi`, `--accent-soft`, `--accent-glow`) with the mint palette (see DESIGN.md §3). Add `--accent-lo`, `--accent-deep`, `--accent-gradient` which are new.
3. **Add the glass token set**: `--glass-thick`, `--glass-regular`, `--glass-thin`, `--glass-inset`, `--rim-top`, `--rim-bottom`, `--rim-side`, `--chroma-1`, `--chroma-2`.
4. **Replace the semantic palette**:
   - `--yes` goes from green `#34d399` → blue `#7fc8ff`. Add `--yes-hi`, `--yes-lo`, `--yes-glow`.
   - `--no` goes from red `#f87171` → peach `#ff9b6b`. Add `--no-hi`, `--no-lo`, `--no-glow`.
   - Delete `--gain` (merged into `--accent`).
   - Delete `--whale`, `--whale-soft` (whale palette retired).
   - `--live` changes from `#ef4444` → `#ff6b6b` (slightly softer, distinguishable from peach `--no`).
5. **Update the radii scale** from 6/12/20 → 10/16/22/28 + `--r-pill: 999px`.
6. **Add the `.glass` utility class + tier variants** (`.glass-thick`, `.glass-med`, `.glass-thin`) per DESIGN.md §4 recipe. Include the `::before` specular sheen.
7. **Add `.glass-inset`** for recessed inputs.
8. **Add the `@media (prefers-reduced-transparency: reduce)` block** that falls back glass to solid fills.
9. **Add the `@media (prefers-reduced-motion: reduce)` block** disabling CTA shimmer, slider shimmer, LIVE-pulse, spring overshoot.
10. **Preserve** the tier colors (`--tier-1..--tier-5`) — loyalty was shipped against those, don't break it.
11. **Preserve** existing sportsbook `ps-*` / `discovery-*` / `sport-pill` classes in the file (still used by the legacy pages router, per DESIGN.md note).

**Deprecation hit list (for Phase 4 cleanup):**

After Phase 4 lands, the following are unused and can be deleted:

- `--s0..--s3` deprecation aliases (added in Phase 1, removed in Phase 4).
- `--gain`, `--whale`, `--whale-soft` — retired.
- Any component still referencing `var(--gain)` gets migrated to `var(--accent)` at its Phase 4 conversion.

**Verification:**

- `npm run type-check` clean.
- Visit `/predict`, `/market/[any]`, `/portfolio` — pages still render, but primary CTA buttons, active-state tints, LIVE dots, TierPill glow, RankChip accent colors all read as mint instead of lime. Ugly but functional. Nothing in the UI is broken.
- Legacy pages-router pages (sportsbook `pages/`) unaffected — they use `ps-*` classes which weren't touched.

**Effort:** ~2 hrs CC.
**Risk:** Low. Additive + token swap. No component logic changes.

---

### Phase 2 — Always-on backdrop layer

**Goal:** Wire in the cool-palette scene that glass will refract against. Visible change: the entire app background changes from flat dark-charcoal to the cool-teal/navy scene with faint SVG chart lines + grid overlay. Nothing else changes yet.

**Files touched:**
- New: `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/components/BackdropScene.tsx`
- `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/layout.tsx` — mount `<BackdropScene />` as the first child of `<body>`.
- `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/globals.css` — add `body::before` radial-gradient stack (Layer 1 of §5).

**Shape of `BackdropScene.tsx`:**

```tsx
'use client';

// BackdropScene renders the always-on refractive scene behind all glass.
// Three layers per DESIGN.md §5:
//   1. body::before — radial gradient stack (lives in globals.css, not this file)
//   2. This component — faint SVG wavy lines hinting at market data
//   3. This component — subtle grid overlay at ~7% opacity
export function BackdropScene() {
  return (
    <div className="backdrop-scene" aria-hidden="true">
      <svg className="backdrop-chart" viewBox="0 0 1440 900" preserveAspectRatio="none">
        {/* 3 faint wavy paths: YES-blue, NO-peach, accent-mint */}
      </svg>
      <div className="backdrop-grid" />
    </div>
  );
}
```

Position: `position: fixed`, `inset: 0`, `z-index: -2` for the scene, `-1` for the grid. `pointer-events: none`. All three layers stationary (no parallax, no animation).

**Acceptance:**

- Open any page. The backdrop is the cool-palette scene, not flat dark charcoal.
- Scroll the page. The backdrop does NOT scroll. (Glass panels scroll past a stationary scene.)
- Devtools Network panel shows no new HTTP requests (the SVG is inline; the gradient is CSS).
- Lighthouse accessibility score unchanged (`aria-hidden="true"` + `pointer-events: none`).
- `prefers-reduced-transparency` replaces the scene with `--bg-deep` solid fill.

**Effort:** ~1 hr CC.
**Risk:** Low. Background-layer only, no interactive surface touched.

**Screenshot checkpoint:** before/after of `/predict` landing. The change is visible but non-functional.

---

### Phase 3 — Pilot: market detail page

**Goal:** Fully convert `/market/[ticker]` to Liquid Glass per DESIGN.md §4 (Material System) + §8 (Components). This is the most complex page in the app — if the glass system works here, it works everywhere. Phase 4 uses Phase 3 as a pattern template.

**Files touched:**
- `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/market/[ticker]/page.tsx`
- `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/components/prediction/TradeTicket.tsx` — redesigned.
- `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/components/prediction/MarketCard.tsx` — redesigned (used for related-markets sidebar on detail page).
- New: `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/components/prediction/MarketHead.tsx` — the question + meta pills + countdown strip.
- New: `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/components/prediction/MarketChart.tsx` — SVG line chart with glow + current-price marker.
- New: `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/components/prediction/OrderBook.tsx` — solid-fill table inside glass card with depth-bar `::after` gradients.
- New: `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/components/prediction/RecentTrades.tsx` — tape of side-badged rows.
- New: `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/components/BrandMark.tsx` — 28px gradient-filled brand square.
- `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/components/prediction/PredictHeader.tsx` → renamed to `TopBar.tsx`. Becomes `.glass.glass-med` with `BrandMark` + nav links + search + balance + avatar. The sticky 110px header with category strip collapses to a 64px glass strip; the category strip moves INTO `/predict` page body (as a horizontal `.glass.glass-thin` chip strip under the page title).
- Delete: `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/components/prediction/WhaleTicker.tsx` (retired per DESIGN.md §8).
- Delete: `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/components/prediction/WhaleActivityCard.tsx`.
- Delete: `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/components/prediction/TopMoversCard.tsx`.
- Delete: `apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app/components/prediction/FeaturedHero.tsx`.

**Layout mapping (desktop):**

```
TopBar (64px sticky, .glass.glass-med)
└── BrandMark + nav + search + balance pill + avatar

MarketHead (22-26px padding, .glass default)
└── LIVE pill + category pill + volume pill + traders pill + closes-in countdown
└── Market question (28px bold)
└── Resolution blurb (14px, --t-2)

2-col grid (minmax(0,1fr) 360px, gap 24px):

  LEFT column:
    MarketChart (.glass default, 320px SVG inside)
    ├── Price display (48px mono, YES color) + delta pill
    ├── Time switcher (1H 6H 1D 1W ALL, recessed pill segmented control)
    ├── SVG chart with glow on line + current price marker
    └── Stats row (implied prob, 24h range, 24h volume, open interest)

    2-col data row (gap 24px):
      OrderBook (.glass default) — solid inner fill table, depth bars
      RecentTrades (.glass default) — solid inner fill tape

  RIGHT rail (sticky top: 88px):
    TradeTicket (.glass default)
    ├── Title + mode switcher (Market / Limit)
    ├── YES/NO side selector (glass buttons with liquid-tint on select)
    ├── Amount block (.glass-inset display + chips + slider)
    ├── Summary rows (avg fill, slippage, shares, payout)
    └── Review CTA (mint→teal gradient, shimmer animation)

Bottom strip (2-col grid same as above):
  LEFT: Market details + resolution rules
  RIGHT: Related markets (list of glass rows)
```

**Layout mapping (mobile, <1100px):**

Same content, single-column stack. TradeTicket loses sticky, becomes the last section. Time switcher still fits inline. OrderBook + RecentTrades stack 1-col.

**Interactive spec:**

- YES/NO selector uses the liquid-fill tint on select (radial-gradient `::after` pseudo-element per DESIGN.md §4).
- Amount chips are glass pills. `MAX` chip styles identical to the dollar chips (not a special state).
- Amount slider has a glass knob on a recessed track. Shimmer animation on fill.
- Review CTA uses the 2-stop mint→teal gradient + shimmer + spring press.

**Data wiring (unchanged — design-only change):**

All API calls, data fetching, WebSocket subscriptions, price updates, settlement hooks stay on the existing wiring. The only changes are CSS + component structure. Don't touch `app/lib/api/` or `app/lib/websocket/predict-ws.ts`.

**Acceptance:**

- Navigate to `/market/btc-100k-apr26` (or any seeded market). Page matches the mockup at `~/.gstack/projects/jbrackens-TAYA_NA/designs/liquid-glass-desktop-mint-20260424-200756/market-detail-mockup.html` 1:1 except with real data.
- TradeTicket still places orders via the existing `PredictionApiClient.placeOrder` flow. WebSocket price updates still tick in.
- Resize to 375px (iPhone SE). Layout collapses to 1-column. Trade ticket becomes the last section. All tap targets ≥36px.
- Keyboard-navigate the page. Every interactive element has a `:focus-visible` mint ring.
- `prefers-reduced-transparency` turns all glass into solid `--bg-teal` cards. Still readable, loses refraction. No content broken.
- `prefers-reduced-motion` disables CTA shimmer, slider shimmer, LIVE pulse, spring overshoot. Replaces with instant transitions.
- Lighthouse perf on desktop Chrome ≥90. Mobile Lighthouse ≥80 (glass is expensive — 80 is acceptable on the pilot; Phase 5 tightens).

**Effort:** ~3 hrs CC.
**Risk:** Medium. Biggest visual change in the entire plan. Also the page where subtle spacing/typography mistakes most hurt (trading UI). Worth QA pass before rolling out to Phase 4.

**Screenshot checkpoint:** before/after at 1440px and 375px. Archive both in `~/.gstack/projects/jbrackens-TAYA_NA/designs/rollout/phase-3/`.

---

### Phase 4 — Roll out to remaining pages

**Goal:** Convert the remaining pages using Phase 3 as the template. Can be done in any order or in parallel (1 page = 1 PR).

**Pages, in suggested priority order:**

1. **`/predict` — discovery landing.** `MarketCard` refreshed per DESIGN.md §8, arranged in `repeat(auto-fill, minmax(300px, 1fr))` grid. Category pills strip as horizontal `.glass.glass-thin` row above the grid. Hero slot for a featured market (bigger card, not a different component). Remove FeaturedHero component usage.
2. **`/portfolio` — positions + summary strip.** Reuse `SummaryStrip` layout from the existing page but wrap stat cards in `.glass`. `RankChip` becomes a glass pill with the mint gradient on the medal icon. `HistoryTable` uses solid-fill rows inside a glass card. Handle the case where `TierPill` sits next to the summary — TierPill stays in its preserved tier colors.
3. **`/rewards` — loyalty ledger + tier ladder.** Tier ladder rendered as 6 glass cards (Hidden + 5 visible tiers). Each card has the corresponding `--tier-*` color as a border accent. Ledger table is solid-fill inside a glass card. Drop the "event type concatenated with reason" bug (already fixed in C.2).
4. **`/leaderboards` — sidebar + detail.** Sidebar becomes a vertical strip of glass tabs, with the Category Champions tab being the one with the `<select>` dropdown inside. On mobile, sidebar collapses to horizontal scroll (already fixed in C.3 — preserve the 280px category-tab width). Detail panel is a glass card with the ranked table as a solid-fill inner.
5. **`/category/[slug]` — filtered market grid.** Same pattern as `/predict`, scoped to one category.
6. **`/account` — settings + privacy toggle.** Glass cards for each settings section. Privacy toggle (the `display_anonymous` switch from the loyalty cycle) becomes a glass toggle.
7. **`/auth/login` — login form.** Centered `.glass.glass-thick` card on the full-bleed backdrop. BrandMark at the top. Email + password inputs use `.glass-inset`. Login CTA uses the mint→teal gradient.
8. **`/auth/register`, `/reset-password`, `/responsible-gaming`, `/about`, `/contact-us`, `/privacy-policy`, `/terms`** — content pages. Simpler — glass card wrapping prose content.

**Pages explicitly out of scope (stay sportsbook-styled):**

- `/cashier` — legacy cashier flow, wallet team owns it.
- `/profile` — legacy profile editor, to be replaced by `/account`.
- `/not-found`, `/error` — React error/404 surfaces. Minimal glass pass in a future sweep.

**Acceptance (per-page):**

- Page renders the new design; no regressions in functional behavior.
- Mobile layout verified at 375px.
- Keyboard nav works end-to-end.
- `prefers-reduced-transparency` + `prefers-reduced-motion` media queries both function.
- No TypeScript errors, no new console warnings.

**Effort:** ~4 hrs CC total (varies per page — landing + portfolio are 45-60 min each, smaller content pages are 10-15 min each).

**Risk:** Medium per page, low in aggregate. Each page is independently revertable. Issues caught on one page can be fixed before the next.

**Cleanup after Phase 4:**

- Delete the `--s0..--s3` deprecation aliases in `globals.css`.
- Remove the retired components: `WhaleTicker`, `WhaleActivityCard`, `TopMoversCard`, `FeaturedHero`. Grep confirms no remaining imports.
- Remove the old `--gain`, `--whale`, `--whale-soft` tokens.
- Remove `public/logo-tn.svg` if no Phase 4 page still references it. Replaced by `BrandMark` component.

---

### Phase 5 — Accessibility + performance audit

**Goal:** Production-harden the redesign. Catch the subtle perf and a11y issues before real user traffic.

**Tasks:**

1. **Chrome DevTools Performance pass:**
   - Open `/market/[ticker]` in Chrome. Throttle network to "Fast 3G", CPU to "4× slowdown" (mid-range Android simulation).
   - Record a 5-second page scroll.
   - Assert: no single frame >50ms (violates 60fps). Long-tasks <5% of recorded time.
   - Identify the worst glass-stacking culprits. Likely candidates: TopBar (sticky glass layered on top of scrolling glass cards) and any page with >8 glass surfaces in the viewport.
   - Fix each culprit. Options: drop blur radius (30px → 18px), simplify backdrop (remove saturate), or switch to solid fill for that specific surface.

2. **Lighthouse audit** on `/predict`, `/market/[ticker]`, `/portfolio`:
   - Accessibility score ≥95.
   - Best Practices ≥90.
   - SEO ≥90 (doesn't really matter for an auth-gated app but low-hanging fruit).
   - Perf: desktop ≥90, mobile ≥80.

3. **`prefers-reduced-transparency` manual QA:**
   - Enable the OS-level preference (macOS: System Settings → Accessibility → Display → Reduce transparency).
   - Reload the app. Verify every page has solid `--bg-teal` card fills, no `backdrop-filter`, no chromatic fringe, no specular sheen.
   - Content still legible, no broken layouts, no black-on-black text surprises.

4. **`prefers-reduced-motion` manual QA:**
   - Enable OS-level preference.
   - Reload. Verify CTA shimmer, slider shimmer, LIVE pulse, spring overshoot are all disabled.
   - Transitions become instant, not missing. Users with vestibular disorders should still feel button presses register.

5. **WCAG AA contrast audit:**
   - Use axe DevTools extension on all Phase 4 pages.
   - Zero critical or serious issues.
   - Specifically verify text on translucent surfaces — the backdrop has lobes of different brightness, so the worst case is `--t-2` body text over the `--bg-navy` lobe (top-left quadrant of viewport).

6. **Firefox fallback check:**
   - Firefox ≥103 supports `backdrop-filter`. Verify in current Firefox (v130+).
   - Firefox < v103: glass degrades to solid `--glass-regular` over the solid `--bg-teal` backdrop. Still readable. Accept.

7. **Safari sanity check:**
   - Verify `-webkit-backdrop-filter` is rendering (belt-and-suspenders with `backdrop-filter`).
   - Glass looks identical to Chrome on an M-series Mac.

8. **Device matrix (smoke test only, not exhaustive):**
   - iPhone 13 Safari — effortless.
   - Pixel 6a Chrome — accept occasional frame drop on scroll.
   - 3-year-old Windows laptop (Intel i5, integrated GPU) — should be acceptable on desktop viewport.

**Deliverables:**

- `docs/liquid-glass-perf-audit-2026-XX-XX.md` with measurements, flame-graph screenshots, and a log of perf fixes applied.
- Any specific glass surface that gets downgraded (blur reduced, saturate removed, or forced solid) is documented in DESIGN.md §10.

**Effort:** ~1.5 hrs CC.
**Risk:** Medium. Catching perf issues late is painful. If Phase 3 pilot was done carefully the audit finds 2-3 minor fixes, not a rewrite.

---

## Cross-phase concerns

### Testing

- **TypeScript:** `npm run type-check` clean after every phase.
- **Type manifest:** update `FEATURE_MANIFEST.json` when components are deleted.
- **Go tests:** unaffected. Backend doesn't know about frontend design.
- **Frontend Jest:** the app currently has `--passWithNoTests` — no frontend tests exist. Adding them is out of scope of this plan (separate testing plan).
- **Manual QA:** each phase has a browser-based acceptance checklist above.

### Feature manifest

Each deleted component needs a status flip in `FEATURE_MANIFEST.json`:

- `WhaleTicker.tsx` → `status: REMOVED`, reason: "Pariflow-era component, retired in Liquid Glass redesign 2026-04-XX."
- `WhaleActivityCard.tsx`, `TopMoversCard.tsx`, `FeaturedHero.tsx` → same pattern.

Each new component gets added to the manifest with `status: REAL` at its creation phase.

### Git strategy

- Each phase is one PR.
- Phase branches named: `redesign/phase-1-tokens`, `redesign/phase-2-backdrop`, `redesign/phase-3-market-detail`, `redesign/phase-4a-discovery`, `redesign/phase-4b-portfolio`, etc.
- Squash-merge into `main`.
- Tag `liquid-glass-v1` after Phase 5 lands.

### Rollback

Each phase is designed to be independently revertable:

- Phase 1 revert: `git revert` the globals.css changes. Components still reference `--accent`, so you're back to (whatever-the-previous-value-was). Actually Phase 1 is the one revert that's safe because everything reads from tokens.
- Phase 2 revert: remove `<BackdropScene />` mount + body::before. Pages go back to the default dark backdrop. Ugly but functional.
- Phase 3 revert: revert the commit. Market detail page goes back to prior version.
- Phase 4 reverts are per-page. Each page's PR is standalone.
- Phase 5 has nothing to revert — it's audit + small fixes. Any specific fix PR can be reverted independently.

If a mid-phase rollback is needed, the feature-flag option (considered and rejected in the shape-approval step) can still be bolted on: wrap each new component with a `process.env.NEXT_PUBLIC_LIQUID_GLASS` check. Not doing this by default because the alternative to mint is the current phoenix-lime app, which is still shippable.

### Dependencies

No new npm dependencies. Liquid Glass is CSS-only. Backdrop scene SVG is inline. Everything ships in the existing bundle.

### Bundle size impact

- `globals.css` adds ~4KB gzipped (glass recipe + media queries + new tokens).
- `BackdropScene.tsx` adds ~2KB gzipped (one React component + inline SVG).
- Deleted components (Whale*, FeaturedHero, TopMoversCard) remove ~8KB gzipped collectively.
- Net: -2KB gzipped after Phase 4 cleanup. Win.

### Performance budget tracking

The DESIGN.md §10 budget is the authoritative rulebook. Phase 5 audit measures against it. If Phase 5 finds we're over budget, the fix is either (a) specific glass surfaces get downgraded (recorded in DESIGN.md), or (b) the budget is revised to match what's shipping (also recorded).

---

## Open questions

These are flagged to revisit, not blockers for starting Phase 1.

- **TierPill color treatment.** TierPill renders with `--tier-*` colors (slate/gold/platinum/violet). These colors don't sit in the mint/teal/blue family. Decision: preserve as-is — tier colors are deliberately outside the brand palette to feel like earned status. But the glass treatment on TierPill needs design thought: does the tier color become the glass fill color, or stay as a border accent on a neutral glass pill? Phase 4a should resolve this.
- **Chart color when YES is blue.** The current chart renders the YES line in blue (`--yes`). Does a "downward YES movement" still read as blue, or does it flip to peach (the NO semantic)? Convention says the line stays blue (YES is the subject); the movement direction is indicated by the delta pill color. Document in DESIGN.md once decided.
- **Mobile TopBar.** Desktop TopBar has 5 nav links + search + balance + avatar. At 375px, search is hidden (icon-only), nav collapses to a hamburger? Or horizontal scroll? Mobile mockup didn't explicitly show this. Phase 3 decides; Phase 4a might refine.
- **Login/auth pages on the backdrop.** The backdrop scene is global — even auth pages sit in front of it. Is that the right move, or should auth pages use a solid color to feel "different" from the authenticated app? Current plan: keep the backdrop. Revisit at Phase 4g if it feels off.

## Assignment (for the first-phase engineer)

Before writing any code for Phase 1, open both mockups in browser tabs and sit with them for 10 minutes:

- Desktop: `~/.gstack/projects/jbrackens-TAYA_NA/designs/liquid-glass-desktop-mint-20260424-200756/market-detail-mockup.html`
- Mobile: `~/.gstack/projects/jbrackens-TAYA_NA/designs/liquid-glass-20260424-195105/trade-ticket-mockup.html`

Inspect the CSS in DevTools. Identify the `.glass`, `.glass-med`, `.glass-thin` usage in the mockup and map it to what becomes `globals.css` utility classes. The mockup's class names aren't identical to the final class names — the mockup was a sketch, this plan is the contract.

Then start Phase 1 token layer. That's it.
